import React, { useCallback, useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { IonButton, IonContent, IonIcon, IonPage, IonSpinner } from '@ionic/react';
import { arrowDownOutline, arrowUpOutline, refreshOutline } from 'ionicons/icons';
import { Helmet } from 'react-helmet';
import CommonHeader from '../common/CommonHeader';
import AdminSidebar from '../common/AdminSidebar';
import { isAdminLoggedIn } from '../common/adminApi';
import {
  WelfareCategory,
  createWelfareCategory,
  errorMessage,
  fetchAllWelfareCategories,
  reorderWelfareCategories,
  splitKeywords,
  updateWelfareCategory,
} from '../common/companyFeatureApi';

/** 행마다 편집 중인 값. 저장 전까지 서버 값과 따로 들고 있는다. */
interface Draft {
  name: string;
  keywords: string;
}

const toDraft = (c: WelfareCategory): Draft => ({ name: c.name, keywords: c.keywords.join(', ') });

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '6px 8px',
  border: '1px solid #d0d5dd',
  borderRadius: 6,
  fontSize: 14,
  boxSizing: 'border-box',
};

const cell: React.CSSProperties = { padding: '10px 8px', borderBottom: '1px solid #f0f0f0', verticalAlign: 'top' };

const AdminWelfareCategories: React.FC = () => {
  const history = useHistory();
  const [categories, setCategories] = useState<WelfareCategory[]>([]);
  const [drafts, setDrafts] = useState<Record<number, Draft>>({});
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [newCategory, setNewCategory] = useState({ code: '', name: '', keywords: '' });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!isAdminLoggedIn()) {
      history.replace('/admin');
    }
  }, [history]);

  const apply = (list: WelfareCategory[]) => {
    setCategories(list);
    setDrafts(Object.fromEntries(list.map((c) => [c.id, toDraft(c)])));
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      apply(await fetchAllWelfareCategories());
    } catch (e) {
      console.error('복지 카테고리 조회 실패:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const replaceOne = (updated: WelfareCategory) => {
    setCategories((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    setDrafts((prev) => ({ ...prev, [updated.id]: toDraft(updated) }));
  };

  const save = async (c: WelfareCategory) => {
    const draft = drafts[c.id];
    setBusyId(c.id);
    try {
      replaceOne(await updateWelfareCategory(c.id, { name: draft.name, keywords: splitKeywords(draft.keywords) }));
    } catch (e) {
      alert(errorMessage(e, '저장에 실패했습니다.'));
    } finally {
      setBusyId(null);
    }
  };

  const toggleActive = async (c: WelfareCategory) => {
    setBusyId(c.id);
    try {
      replaceOne(await updateWelfareCategory(c.id, { active: !c.active }));
    } catch (e) {
      alert(errorMessage(e, '변경에 실패했습니다.'));
    } finally {
      setBusyId(null);
    }
  };

  const move = async (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= categories.length) return;
    const ids = categories.map((c) => c.id);
    [ids[index], ids[target]] = [ids[target], ids[index]];
    setBusyId(categories[index].id);
    try {
      const reordered = await reorderWelfareCategories(ids);
      // 편집 중이던 값은 순서만 바뀌었으니 그대로 둔다
      setCategories(reordered);
    } catch (e) {
      alert(errorMessage(e, '정렬에 실패했습니다.'));
    } finally {
      setBusyId(null);
    }
  };

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      await createWelfareCategory({
        code: newCategory.code,
        name: newCategory.name,
        keywords: splitKeywords(newCategory.keywords),
      });
      setNewCategory({ code: '', name: '', keywords: '' });
      await load();
    } catch (err) {
      alert(errorMessage(err, '추가에 실패했습니다.'));
    } finally {
      setCreating(false);
    }
  };

  const isDirty = (c: WelfareCategory) => {
    const d = drafts[c.id];
    return !!d && (d.name !== c.name || splitKeywords(d.keywords).join('\n') !== c.keywords.join('\n'));
  };

  return (
    <IonPage>
      <Helmet>
        <title>관리자 - 복지 카테고리</title>
        <meta name="description" content="재택 회사 모아보기의 복지 카테고리와 매칭 키워드 관리" />
      </Helmet>
      <CommonHeader />
      <IonContent>
        <div style={{ display: 'flex', alignItems: 'flex-start' }}>
          <AdminSidebar />
          <div style={{ flex: 1, minWidth: 0, maxWidth: 1000, margin: '0 auto', padding: 16 }}>
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div>
                <h1 style={{ margin: 0, fontSize: 22 }}>복지 카테고리</h1>
                <p style={{ margin: '4px 0 0', color: '#888', fontSize: 13 }}>
                  배치가 채용공고 본문에서 키워드를 찾아 회사별 복지를 채웁니다. 키워드를 바꾸면 다음 배치 실행(매일 11시)부터 반영돼요.
                  비활성화하면 재택 회사 화면의 필터와 태그에서 빠집니다.
                </p>
              </div>
              <IonButton fill="outline" onClick={load} disabled={loading}>
                <IonIcon slot="start" icon={refreshOutline} />
                새로고침
              </IonButton>
            </header>

            <form
              onSubmit={create}
              style={{ display: 'grid', gridTemplateColumns: '140px 140px 1fr auto', gap: 8, alignItems: 'center', marginBottom: 16 }}
            >
              <input
                style={inputStyle}
                placeholder="코드 (예: GYM)"
                aria-label="새 카테고리 코드"
                value={newCategory.code}
                onChange={(e) => setNewCategory({ ...newCategory, code: e.target.value.toUpperCase() })}
              />
              <input
                style={inputStyle}
                placeholder="이름 (예: 운동)"
                aria-label="새 카테고리 이름"
                value={newCategory.name}
                onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
              />
              <input
                style={inputStyle}
                placeholder="키워드 (쉼표로 구분: 피트니스, 헬스장, 운동비)"
                aria-label="새 카테고리 키워드"
                value={newCategory.keywords}
                onChange={(e) => setNewCategory({ ...newCategory, keywords: e.target.value })}
              />
              <IonButton type="submit" disabled={creating || !newCategory.code || !newCategory.name || !newCategory.keywords}>
                추가
              </IonButton>
            </form>

            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><IonSpinner /></div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                <thead>
                  <tr style={{ textAlign: 'left', color: '#888', fontSize: 12 }}>
                    <th style={{ ...cell, width: 70 }}>순서</th>
                    <th style={{ ...cell, width: 110 }}>코드</th>
                    <th style={{ ...cell, width: 130 }}>이름</th>
                    <th style={cell}>키워드 (쉼표로 구분)</th>
                    <th style={{ ...cell, width: 170 }} />
                  </tr>
                </thead>
                <tbody>
                  {categories.map((c, i) => {
                    const draft = drafts[c.id] ?? toDraft(c);
                    const busy = busyId === c.id;
                    return (
                      <tr key={c.id} style={{ opacity: c.active ? 1 : 0.5 }} data-testid={`welfare-row-${c.code}`}>
                        <td style={cell}>
                          <button type="button" aria-label={`${c.name} 위로`} disabled={i === 0 || busyId !== null} onClick={() => move(i, -1)}>
                            <IonIcon icon={arrowUpOutline} />
                          </button>
                          <button type="button" aria-label={`${c.name} 아래로`} disabled={i === categories.length - 1 || busyId !== null} onClick={() => move(i, 1)}>
                            <IonIcon icon={arrowDownOutline} />
                          </button>
                        </td>
                        <td style={{ ...cell, fontFamily: 'monospace' }}>{c.code}</td>
                        <td style={cell}>
                          <input
                            style={inputStyle}
                            aria-label={`${c.code} 이름`}
                            value={draft.name}
                            onChange={(e) => setDrafts({ ...drafts, [c.id]: { ...draft, name: e.target.value } })}
                          />
                        </td>
                        <td style={cell}>
                          <textarea
                            style={{ ...inputStyle, minHeight: 54, resize: 'vertical' }}
                            aria-label={`${c.code} 키워드`}
                            value={draft.keywords}
                            onChange={(e) => setDrafts({ ...drafts, [c.id]: { ...draft, keywords: e.target.value } })}
                          />
                        </td>
                        <td style={{ ...cell, whiteSpace: 'nowrap' }}>
                          <IonButton size="small" disabled={busy || !isDirty(c)} onClick={() => save(c)}>저장</IonButton>
                          <IonButton size="small" fill="outline" color={c.active ? 'medium' : 'success'} disabled={busy} onClick={() => toggleActive(c)}>
                            {c.active ? '비활성화' : '활성화'}
                          </IonButton>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default AdminWelfareCategories;
