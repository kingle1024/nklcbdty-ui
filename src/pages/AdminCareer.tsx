import React, { useCallback, useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { IonPage, IonContent, IonButton, IonSpinner, IonIcon, IonAlert } from '@ionic/react';
import { refreshOutline, copyOutline, checkmarkOutline, addOutline, createOutline } from 'ionicons/icons';
import { Helmet } from 'react-helmet';
import CommonHeader from '../common/CommonHeader';
import AdminSidebar from '../common/AdminSidebar';
import { isAdminLoggedIn } from '../common/adminApi';
import { copyToClipboard } from '../common/troubleshootingApi';
import AdminCareerEditor, { EditTarget } from './AdminCareerEditor';
import {
  CareerEntry,
  CareerForm,
  careerToText,
  fetchCareer,
  formatPeriod,
  formatTenure,
  groupCareer,
} from '../common/careerApi';
import './AdminTroubleshooting.css';
import './AdminCareer.css';

/** 항목 하나의 본문. 회사 행과 프로젝트 행이 같은 모양을 쓴다 */
const EntryBody: React.FC<{ entry: CareerEntry }> = ({ entry }) => (
  <>
    {entry.summary && <p className="cr-summary">{entry.summary}</p>}
    {/* 저장된 원문 그대로. 줄바꿈과 글머리표가 내용의 일부다 */}
    {entry.description && <p className="ts-body cr-desc">{entry.description}</p>}
    {entry.achievements.length > 0 && (
      <ul className="cr-achievements">
        {entry.achievements.map((a, i) => (
          <li key={i}>{a}</li>
        ))}
      </ul>
    )}
    {entry.techStack.length > 0 && (
      <div className="ts-card-tags">
        {entry.techStack.map((t) => (
          <span key={t}>{t}</span>
        ))}
      </div>
    )}
    {entry.referenceLinks.length > 0 && (
      <ul className="cr-links">
        {entry.referenceLinks.map((link, i) => (
          <li key={i}>
            {link.url ? (
              <a href={link.url} target="_blank" rel="noopener noreferrer">
                {link.label}
              </a>
            ) : (
              link.label
            )}
          </li>
        ))}
      </ul>
    )}
  </>
);

/** 항목 옆에 붙는 작은 '수정' 버튼 */
const EditButton: React.FC<{ onClick: () => void; label?: string; icon?: string }> = ({
  onClick,
  label = '수정',
  icon = createOutline,
}) => (
  <button type="button" className="cr-edit-btn" onClick={onClick}>
    <IonIcon icon={icon} />
    {label}
  </button>
);

const ProjectItem: React.FC<{ entry: CareerEntry; onEdit: (entry: CareerEntry) => void }> = ({
  entry,
  onEdit,
}) => {
  const period = formatPeriod(entry);
  return (
    <div className="cr-project">
      <div className="cr-project-head">
        <h3>{entry.title}</h3>
        {period && <span className="cr-period">{period}</span>}
        <EditButton onClick={() => onEdit(entry)} />
      </div>
      {(entry.team || entry.role) && (
        <div className="cr-sub">{[entry.team, entry.role].filter(Boolean).join(' · ')}</div>
      )}
      <EntryBody entry={entry} />
    </div>
  );
};

/**
 * 내 경력 기록. 회사별 경력과 경력기술서 항목을 회사 단위로 묶어 보여준다.
 *
 * 기록은 두 군데서 들어온다 — 로컬의 save-career 스킬이 DB(career_entry)에 바로 넣고,
 * 이 화면에서도 추가·수정·삭제한다(AdminCareerEditor).
 * 한 사람의 경력이라 많아야 수십 건이어서 페이징·검색 없이 전부 펼친다.
 */
const AdminCareer: React.FC = () => {
  const history = useHistory();
  const [entries, setEntries] = useState<CareerEntry[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [copyState, setCopyState] = useState<'idle' | 'done' | 'failed'>('idle');
  const [editTarget, setEditTarget] = useState<EditTarget | null>(null);

  useEffect(() => {
    if (!isAdminLoggedIn()) {
      history.replace('/admin');
    }
  }, [history]);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      setEntries(await fetchCareer());
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '경력 기록을 가져오지 못했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleCopyAll = async () => {
    if (!entries || entries.length === 0) return;
    const ok = await copyToClipboard(careerToText(entries));
    setCopyState(ok ? 'done' : 'failed');
    if (!ok) {
      setErrorMessage('클립보드에 넣지 못했습니다. 브라우저 권한을 확인해 주세요.');
    }
    window.setTimeout(() => setCopyState('idle'), ok ? 2200 : 4000);
  };

  const list = entries ?? [];
  const { companies, personal, others } = groupCareer(list);
  const edit = (entry: CareerEntry) => setEditTarget({ entry });
  const add = (preset: Partial<CareerForm> = {}) => setEditTarget({ preset });

  const handleSaved = () => {
    setEditTarget(null);
    load();
  };

  return (
    <IonPage>
      <Helmet>
        <title>관리자 - 내 경력</title>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="description" content="회사별 경력과 경력기술서 기록 열람" />
      </Helmet>
      <CommonHeader />
      <IonContent>
        <div className="ts-layout">
          <AdminSidebar />
          <div className="ts-main">
            <header className="ts-head">
              <div>
                <h1>내 경력</h1>
                <p>
                  회사별 경력과 경력기술서 항목입니다.
                  {entries ? ` 전체 ${list.length}건.` : ''}
                </p>
              </div>
              <div className="ts-head-actions">
                <IonButton size="default" onClick={() => add({ entryType: 'company' })} disabled={isLoading}>
                  <IonIcon slot="start" icon={addOutline} />
                  추가
                </IonButton>
                {/* 전부를 마크다운으로 복사한다. Claude 에게 붙여 넣어 경력기술서를 쓰게 하려는 용도 */}
                <IonButton
                  fill="outline"
                  size="default"
                  onClick={handleCopyAll}
                  disabled={isLoading || list.length === 0}
                  color={copyState === 'failed' ? 'danger' : copyState === 'done' ? 'success' : undefined}
                >
                  <IonIcon slot="start" icon={copyState === 'done' ? checkmarkOutline : copyOutline} />
                  {copyState === 'done' ? `${list.length}건 복사됨` : copyState === 'failed' ? '복사 실패' : '전체 복사'}
                </IonButton>
                <IonButton fill="outline" size="default" onClick={load} disabled={isLoading}>
                  <IonIcon slot="start" icon={refreshOutline} />
                  새로고침
                </IonButton>
              </div>
            </header>

            {isLoading ? (
              <div className="ts-loading">
                <IonSpinner name="crescent" />
                <span>기록을 불러오는 중...</span>
              </div>
            ) : list.length === 0 ? (
              <div className="ts-empty">
                저장된 경력이 없습니다.
                <br />
                위의 &apos;추가&apos; 로 넣거나, Claude 에게 이력서·경력기술서를 붙여 넣고
                &quot;경력 저장해줘&quot; 라고 하면 채워집니다.
              </div>
            ) : (
              <div className="ts-list">
                {companies.map((c) => {
                  const period = c.head ? formatPeriod(c.head) : '';
                  const tenure = c.head ? formatTenure(c.head) : '';
                  return (
                    <section key={c.name} className="ts-card cr-company">
                      <div className="cr-company-head">
                        <h2>{c.name}</h2>
                        {period && (
                          <span className="cr-period">
                            {period}
                            {tenure && ` · ${tenure}`}
                          </span>
                        )}
                        {c.head && !c.head.endedOn && c.head.startedOn && (
                          <span className="cr-badge">재직 중</span>
                        )}
                        <span className="cr-head-actions">
                          {/* 회사 행 없이 프로젝트만 있는 회사면 회사 정보를 새로 만들게 한다 */}
                          {c.head ? (
                            <EditButton onClick={() => edit(c.head as CareerEntry)} />
                          ) : (
                            <EditButton
                              label="회사 정보 추가"
                              icon={addOutline}
                              onClick={() => add({ entryType: 'company', company: c.name })}
                            />
                          )}
                          <EditButton
                            label="프로젝트"
                            icon={addOutline}
                            onClick={() => add({ entryType: 'project', company: c.name })}
                          />
                        </span>
                      </div>
                      {c.head && (
                        <>
                          <div className="cr-sub">
                            {[c.head.title, c.head.team, c.head.role].filter(Boolean).join(' · ')}
                          </div>
                          <EntryBody entry={c.head} />
                        </>
                      )}
                      {c.projects.length > 0 && (
                        <div className="cr-projects">
                          {c.projects.map((p) => (
                            <ProjectItem key={p.slug} entry={p} onEdit={edit} />
                          ))}
                        </div>
                      )}
                    </section>
                  );
                })}

                {personal.length > 0 && (
                  <section className="ts-card cr-company">
                    <div className="cr-company-head">
                      <h2>개인 프로젝트</h2>
                    </div>
                    <div className="cr-projects">
                      {personal.map((p) => (
                        <ProjectItem key={p.slug} entry={p} onEdit={edit} />
                      ))}
                    </div>
                  </section>
                )}

                {others.length > 0 && (
                  <section className="ts-card cr-company">
                    <div className="cr-company-head">
                      <h2>기타 이력</h2>
                    </div>
                    <div className="cr-projects">
                      {others.map((o) => (
                        <ProjectItem key={o.slug} entry={o} onEdit={edit} />
                      ))}
                    </div>
                  </section>
                )}
              </div>
            )}
          </div>
        </div>

        <AdminCareerEditor
          target={editTarget}
          companies={companies.map((c) => c.name)}
          onClose={() => setEditTarget(null)}
          onSaved={handleSaved}
        />

        <IonAlert
          isOpen={!!errorMessage}
          onDidDismiss={() => setErrorMessage('')}
          header="알림"
          message={errorMessage}
          buttons={['확인']}
        />
      </IonContent>
    </IonPage>
  );
};

export default AdminCareer;
