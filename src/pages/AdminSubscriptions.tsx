import React, { useEffect, useMemo, useState, useCallback } from 'react';
import axios from 'axios';
import {
  IonPage,
  IonContent,
  IonButton,
  IonInput,
  IonSpinner,
  IonModal,
  IonIcon,
  IonChip,
  IonLabel,
  IonCheckbox,
} from '@ionic/react';
import {
  closeOutline,
  searchOutline,
  peopleOutline,
  layersOutline,
  briefcaseOutline,
  refreshOutline,
  saveOutline,
  createOutline,
  mailOutline,
  paperPlaneOutline,
} from 'ionicons/icons';
import { Helmet } from 'react-helmet';
import './AdminSubscriptions.css';
import CommonHeader from '../common/CommonHeader';
import AdminSidebar from '../common/AdminSidebar';
import API_URL from '../config';

// TODO: 관리자 로그인 도입 후 fetchWithToken로 교체하여 Bearer 토큰을 첨부한다.

interface SubscriptionRow {
  userId: string;
  username: string | null;
  email: string | null;
  companies: string[];
  jobs: string[];
  careerYear: number | null;
  latestUpdateDts: string | null;
}

interface PageResponse {
  rows: SubscriptionRow[];
  totalElements: number;
  totalPages: number;
  pageNumber: number;
  pageSize: number;
}

interface SubscriptionItem {
  id: number;
  itemType: string;
  itemValue: string;
  insertDts: string | null;
  updateDts: string | null;
}

interface SubscriptionDetail {
  userId: string;
  username: string | null;
  email: string | null;
  items: SubscriptionItem[];
}

interface StatsResponse {
  totalSubscribers: number;
  totalItems: number;
  countsByItemType: Record<string, Record<string, number>>;
}

interface JobCategoryDtl {
  name: string;
}

interface JobCategoryMst {
  name: string;
  value?: string;
  categoryDtls?: JobCategoryDtl[];
}

const PAGE_SIZE = 20;

const COMPANY_OPTIONS = [
  { label: '네이버', value: 'naver' },
  { label: '카카오', value: 'kakao' },
  { label: '라인', value: 'line' },
  { label: '쿠팡', value: 'coupang' },
  { label: '배달의민족', value: 'baemin' },
  { label: '당근마켓', value: 'karrot' },
  { label: '토스', value: 'toss' },
  { label: '야놀자', value: 'yanolja' },
];

const CAREER_OPTIONS = [0, 1, 2, 3, 4, 5, 6, 7, 8];

const formatDate = (value: string | null): string => {
  if (!value) return '-';
  const date = new Date(value);
  if (isNaN(date.getTime())) return value;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const topEntries = (counts: Record<string, number> | undefined, limit = 3): Array<[string, number]> => {
  if (!counts) return [];
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit);
};

const AdminSubscriptions: React.FC = () => {
  const [page, setPage] = useState<PageResponse | null>(null);
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [keyword, setKeyword] = useState('');
  const [appliedKeyword, setAppliedKeyword] = useState('');
  const [pageNumber, setPageNumber] = useState(0);

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [detail, setDetail] = useState<SubscriptionDetail | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);

  // 편집 상태
  const [editCompanies, setEditCompanies] = useState<string[]>([]);
  const [editJobs, setEditJobs] = useState<string[]>([]);
  const [editCareer, setEditCareer] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [sendingUserId, setSendingUserId] = useState<string | null>(null);

  // 직무 카테고리 (마이페이지와 동일 API)
  const [jobCategories, setJobCategories] = useState<JobCategoryMst[]>([]);

  const fetchList = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const params = new URLSearchParams({
        page: String(pageNumber),
        size: String(PAGE_SIZE),
      });
      if (appliedKeyword) {
        params.set('keyword', appliedKeyword);
      }
      const { data } = await axios.get<PageResponse>(
        `${API_URL}/api/admin/subscriptions?${params.toString()}`
      );
      setPage(data);
    } catch (e) {
      console.error('관리자 구독 목록 조회 실패:', e);
    } finally {
      setIsRefreshing(false);
      setIsLoading(false);
    }
  }, [pageNumber, appliedKeyword]);

  const fetchStats = useCallback(async () => {
    try {
      const { data } = await axios.get<StatsResponse>(`${API_URL}/api/admin/subscriptions/stats`);
      setStats(data);
    } catch (e) {
      console.error('관리자 통계 조회 실패:', e);
    }
  }, []);

  const fetchJobCategories = useCallback(async () => {
    try {
      const { data } = await axios.get<JobCategoryMst[]>(`${API_URL}/api/category/list`);
      setJobCategories(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('직무 카테고리 조회 실패:', e);
    }
  }, []);

  useEffect(() => { fetchList(); }, [fetchList]);
  useEffect(() => { fetchStats(); }, [fetchStats]);
  useEffect(() => { fetchJobCategories(); }, [fetchJobCategories]);

  const applyDetailToEditForm = (d: SubscriptionDetail) => {
    setEditCompanies(d.items.filter(i => i.itemType === 'company').map(i => i.itemValue));
    setEditJobs(d.items.filter(i => i.itemType === 'job').map(i => i.itemValue));
    const careerItems = d.items.filter(i => i.itemType === 'career_year');
    if (careerItems.length === 0) {
      setEditCareer(null);
    } else {
      const lastCareer = careerItems[careerItems.length - 1];
      const parsed = parseInt(lastCareer.itemValue, 10);
      setEditCareer(isNaN(parsed) ? null : parsed);
    }
  };

  const openDetail = async (userId: string) => {
    setSelectedUserId(userId);
    setIsDetailLoading(true);
    setDetail(null);
    try {
      const { data } = await axios.get<SubscriptionDetail>(
        `${API_URL}/api/admin/subscriptions/${encodeURIComponent(userId)}`
      );
      setDetail(data);
      applyDetailToEditForm(data);
    } catch (e) {
      console.error('관리자 구독 상세 조회 실패:', e);
    } finally {
      setIsDetailLoading(false);
    }
  };

  const closeDetail = () => {
    setSelectedUserId(null);
    setDetail(null);
    setEditCompanies([]);
    setEditJobs([]);
    setEditCareer(null);
  };

  const toggleCompany = (value: string, checked: boolean) => {
    setEditCompanies(prev => checked
      ? (prev.includes(value) ? prev : [...prev, value])
      : prev.filter(v => v !== value));
  };

  const toggleJob = (value: string, checked: boolean) => {
    setEditJobs(prev => checked
      ? (prev.includes(value) ? prev : [...prev, value])
      : prev.filter(v => v !== value));
  };

  const handleSave = async () => {
    if (!selectedUserId) return;
    setIsSaving(true);
    try {
      const payload = {
        subscribedServices: editCompanies,
        selectedJobRoles: editJobs,
        selectedCareerYears: editCareer !== null ? String(editCareer) : null,
      };
      const { data } = await axios.put<SubscriptionDetail>(
        `${API_URL}/api/admin/subscriptions/${encodeURIComponent(selectedUserId)}`,
        payload
      );
      setDetail(data);
      applyDetailToEditForm(data);
      fetchList();
      fetchStats();
      alert('저장되었습니다.');
    } catch (e) {
      console.error('구독 수정 실패:', e);
      alert('저장에 실패했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  const sendMail = async (userId: string, email: string | null) => {
    const target = email ? `${userId} (${email})` : userId;
    if (!window.confirm(`${target} 사용자에게 맞춤 채용 공고 메일을 발송하시겠습니까?`)) return;
    setSendingUserId(userId);
    try {
      await axios.post(
        `${API_URL}/api/admin/subscriptions/${encodeURIComponent(userId)}/send-email`
      );
      // 백엔드에서 @Async로 처리되므로 요청만 큐잉되고 즉시 202 응답
      alert(`메일 발송 요청을 보냈습니다. ${email ? `(${email})` : ''}`);
    } catch (e) {
      console.error('메일 발송 요청 실패:', e);
      alert('메일 발송 요청에 실패했습니다.');
    } finally {
      setSendingUserId(null);
    }
  };

  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setPageNumber(0);
    setAppliedKeyword(keyword.trim());
  };

  const resetSearch = () => {
    setKeyword('');
    setAppliedKeyword('');
    setPageNumber(0);
  };

  const topCompanies = useMemo(() => topEntries(stats?.countsByItemType.company), [stats]);
  const topJobs = useMemo(() => topEntries(stats?.countsByItemType.job), [stats]);

  const totalPages = page?.totalPages ?? 0;
  const canPrev = pageNumber > 0;
  const canNext = pageNumber + 1 < totalPages;

  const hasChanges = useMemo(() => {
    if (!detail) return false;
    const origCompanies = detail.items.filter(i => i.itemType === 'company').map(i => i.itemValue).sort();
    const origJobs = detail.items.filter(i => i.itemType === 'job').map(i => i.itemValue).sort();
    const careerItems = detail.items.filter(i => i.itemType === 'career_year');
    const origCareer = careerItems.length > 0
      ? parseInt(careerItems[careerItems.length - 1].itemValue, 10)
      : null;
    const editC = [...editCompanies].sort();
    const editJ = [...editJobs].sort();
    return (
      JSON.stringify(origCompanies) !== JSON.stringify(editC) ||
      JSON.stringify(origJobs) !== JSON.stringify(editJ) ||
      origCareer !== editCareer
    );
  }, [detail, editCompanies, editJobs, editCareer]);

  return (
    <IonPage>
      <Helmet>
        <title>관리자 - 구독 관리</title>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="description" content="구독 관리 관리자 페이지" />
      </Helmet>
      <CommonHeader />
      <IonContent className="admin-content">
        <div style={{ display: 'flex', alignItems: 'flex-start' }}>
        <AdminSidebar />
        <div className="admin-wrapper" style={{ flex: 1, minWidth: 0 }}>
          <header className="admin-header">
            <div>
              <h1 className="admin-title">구독 관리</h1>
              <p className="admin-subtitle">user_interest 테이블 기반 구독자 현황을 조회·관리합니다.</p>
            </div>
            <IonButton
              fill="outline"
              size="default"
              onClick={() => { fetchList(); fetchStats(); }}
              disabled={isRefreshing}
            >
              <IonIcon slot="start" icon={refreshOutline} />
              새로고침
            </IonButton>
          </header>

          {/* 통계 카드 */}
          <section className="stat-grid">
            <div className="stat-card stat-card--primary">
              <div className="stat-card__icon"><IonIcon icon={peopleOutline} /></div>
              <div className="stat-card__body">
                <div className="stat-card__label">총 구독자</div>
                <div className="stat-card__value">{stats?.totalSubscribers ?? '-'}</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-card__icon"><IonIcon icon={layersOutline} /></div>
              <div className="stat-card__body">
                <div className="stat-card__label">총 구독 항목</div>
                <div className="stat-card__value">{stats?.totalItems ?? '-'}</div>
              </div>
            </div>
            <div className="stat-card stat-card--list">
              <div className="stat-card__label">기업별 TOP 3</div>
              <div className="stat-card__chips">
                {topCompanies.length === 0 ? (
                  <span className="muted">데이터 없음</span>
                ) : (
                  topCompanies.map(([name, count]) => (
                    <span key={name} className="rank-chip">
                      <strong>{name}</strong> <em>{count}</em>
                    </span>
                  ))
                )}
              </div>
            </div>
            <div className="stat-card stat-card--list">
              <div className="stat-card__label">직무별 TOP 3</div>
              <div className="stat-card__chips">
                {topJobs.length === 0 ? (
                  <span className="muted">데이터 없음</span>
                ) : (
                  topJobs.map(([name, count]) => (
                    <span key={name} className="rank-chip rank-chip--alt">
                      <IonIcon icon={briefcaseOutline} />
                      <strong>{name}</strong> <em>{count}</em>
                    </span>
                  ))
                )}
              </div>
            </div>
          </section>

          {/* 검색바 */}
          <form className="search-bar" onSubmit={handleSearch}>
            <div className="search-bar__input">
              <IonIcon icon={searchOutline} />
              <IonInput
                value={keyword}
                placeholder="userId, 이메일, 회사, 직무로 검색"
                onIonChange={(e) => setKeyword(e.detail.value ?? '')}
              />
            </div>
            <IonButton type="submit" className="search-bar__btn">검색</IonButton>
            {appliedKeyword && (
              <IonButton type="button" fill="outline" onClick={resetSearch}>초기화</IonButton>
            )}
          </form>

          {appliedKeyword && (
            <div className="applied-keyword">
              <IonChip color="primary">
                <IonLabel>“{appliedKeyword}” 검색 결과</IonLabel>
              </IonChip>
            </div>
          )}

          {/* 테이블 */}
          <section className="table-card">
            {isLoading ? (
              <div className="loading-row">
                <IonSpinner name="crescent" />
                <span>구독자 목록을 불러오는 중...</span>
              </div>
            ) : page && page.rows.length > 0 ? (
              <>
                <div className="table-wrapper">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th style={{ width: '180px' }}>User ID</th>
                        <th style={{ width: '180px' }}>이메일</th>
                        <th>구독 기업</th>
                        <th>관심 직무</th>
                        <th style={{ width: '70px' }}>경력</th>
                        <th style={{ width: '150px' }}>최근 변경</th>
                        <th style={{ width: '170px' }}>관리</th>
                      </tr>
                    </thead>
                    <tbody>
                      {page.rows.map((row) => (
                        <tr key={row.userId}>
                          <td className="mono">{row.userId}</td>
                          <td>{row.email ?? <span className="muted">-</span>}</td>
                          <td>
                            <div className="tag-list">
                              {row.companies.length === 0 ? (
                                <span className="muted">-</span>
                              ) : (
                                row.companies.map((c) => (
                                  <span key={c} className="tag tag--company">{c}</span>
                                ))
                              )}
                            </div>
                          </td>
                          <td>
                            <div className="tag-list">
                              {row.jobs.length === 0 ? (
                                <span className="muted">-</span>
                              ) : (
                                row.jobs.map((j) => (
                                  <span key={j} className="tag tag--job">{j}</span>
                                ))
                              )}
                            </div>
                          </td>
                          <td className="center">
                            {row.careerYear !== null ? (
                              <span className="badge">{row.careerYear}년</span>
                            ) : (
                              <span className="muted">-</span>
                            )}
                          </td>
                          <td className="mono small">{formatDate(row.latestUpdateDts)}</td>
                          <td>
                            <div className="row-actions">
                              <IonButton size="small" fill="outline" onClick={() => openDetail(row.userId)}>
                                <IonIcon slot="icon-only" icon={createOutline} />
                              </IonButton>
                              <IonButton
                                size="small"
                                fill="outline"
                                color="success"
                                disabled={!row.email || sendingUserId === row.userId}
                                title={row.email ? '맞춤 채용 메일 발송' : '이메일이 없어 발송 불가'}
                                onClick={() => sendMail(row.userId, row.email)}
                              >
                                {sendingUserId === row.userId ? (
                                  <IonSpinner name="crescent" className="btn-spinner-inline" />
                                ) : (
                                  <IonIcon slot="icon-only" icon={mailOutline} />
                                )}
                              </IonButton>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="pagination">
                  <span className="pagination__info">
                    총 <strong>{page.totalElements}</strong>명 / {pageNumber + 1} / {Math.max(totalPages, 1)} 페이지
                  </span>
                  <div className="pagination__buttons">
                    <IonButton
                      fill="outline"
                      size="small"
                      disabled={!canPrev}
                      onClick={() => setPageNumber((p) => Math.max(0, p - 1))}
                    >이전</IonButton>
                    <IonButton
                      fill="outline"
                      size="small"
                      disabled={!canNext}
                      onClick={() => setPageNumber((p) => p + 1)}
                    >다음</IonButton>
                  </div>
                </div>
              </>
            ) : (
              <div className="empty"><p>구독자 데이터가 없습니다.</p></div>
            )}
          </section>
        </div>
        </div>

        {/* 편집 모달 */}
        <IonModal isOpen={selectedUserId !== null} onDidDismiss={closeDetail}>
          <div className="modal-container">
            <header className="modal-header">
              <div>
                <h2>{detail?.username ?? selectedUserId}</h2>
                <p className="modal-subtitle">
                  <span className="mono">{detail?.userId ?? selectedUserId}</span>
                  {detail?.email && <> · {detail.email}</>}
                </p>
              </div>
              <IonButton fill="clear" onClick={closeDetail}>
                <IonIcon icon={closeOutline} />
              </IonButton>
            </header>

            <div className="modal-body">
              {isDetailLoading ? (
                <div className="loading-row">
                  <IonSpinner name="crescent" />
                  <span>상세 정보를 불러오는 중...</span>
                </div>
              ) : (
                <>
                  {/* 구독 기업 */}
                  <section className="edit-section">
                    <h3 className="edit-section__title">구독 기업</h3>
                    <div className="check-grid">
                      {COMPANY_OPTIONS.map(option => {
                        const checked = editCompanies.includes(option.value);
                        return (
                          <label
                            key={option.value}
                            className={`check-card ${checked ? 'check-card--active' : ''}`}
                          >
                            <IonCheckbox
                              checked={checked}
                              onIonChange={e => toggleCompany(option.value, e.detail.checked)}
                            />
                            <span>{option.label}</span>
                          </label>
                        );
                      })}
                    </div>
                  </section>

                  {/* 경력 */}
                  <section className="edit-section">
                    <h3 className="edit-section__title">경력</h3>
                    <div className="career-row">
                      {CAREER_OPTIONS.map(year => (
                        <IonButton
                          key={year}
                          size="small"
                          fill={editCareer === year ? 'solid' : 'outline'}
                          color={editCareer === year ? 'primary' : 'medium'}
                          onClick={() => setEditCareer(year)}
                        >
                          {year}년
                        </IonButton>
                      ))}
                      {editCareer !== null && (
                        <IonButton
                          size="small"
                          fill="clear"
                          color="danger"
                          onClick={() => setEditCareer(null)}
                        >
                          선택 해제
                        </IonButton>
                      )}
                    </div>
                  </section>

                  {/* 관심 직무 */}
                  <section className="edit-section">
                    <h3 className="edit-section__title">관심 직무</h3>
                    {jobCategories.length === 0 ? (
                      <p className="muted">직무 카테고리를 불러오지 못했습니다.</p>
                    ) : (
                      jobCategories.map((cat) => (
                        <div key={cat.value ?? cat.name} className="job-category">
                          <div className="job-category__title">{cat.name}</div>
                          <div className="check-grid">
                            {(cat.categoryDtls ?? []).map(dtl => {
                              const checked = editJobs.includes(dtl.name);
                              return (
                                <label
                                  key={dtl.name}
                                  className={`check-card ${checked ? 'check-card--active' : ''}`}
                                >
                                  <IonCheckbox
                                    checked={checked}
                                    onIonChange={e => toggleJob(dtl.name, e.detail.checked)}
                                  />
                                  <span>{dtl.name}</span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      ))
                    )}
                  </section>
                </>
              )}
            </div>

            <footer className="modal-footer">
              <span className="modal-footer__hint">
                {hasChanges ? '변경된 내용이 있습니다.' : '변경 사항 없음'}
              </span>
              <div className="modal-footer__actions">
                <IonButton
                  fill="outline"
                  color="success"
                  disabled={!detail?.email || sendingUserId === selectedUserId}
                  title={detail?.email ? '맞춤 채용 메일 발송' : '이메일이 없어 발송 불가'}
                  onClick={() => selectedUserId && sendMail(selectedUserId, detail?.email ?? null)}
                >
                  {sendingUserId === selectedUserId ? (
                    <>
                      <IonSpinner name="crescent" className="btn-spinner" />
                      발송중
                    </>
                  ) : (
                    <>
                      <IonIcon slot="start" icon={paperPlaneOutline} />
                      메일 발송
                    </>
                  )}
                </IonButton>
                <IonButton fill="outline" onClick={closeDetail} disabled={isSaving}>
                  취소
                </IonButton>
                <IonButton onClick={handleSave} disabled={!hasChanges || isSaving}>
                  {isSaving ? (
                    <>
                      <IonSpinner name="crescent" className="btn-spinner" />
                      저장중
                    </>
                  ) : (
                    <>
                      <IonIcon slot="start" icon={saveOutline} />
                      저장
                    </>
                  )}
                </IonButton>
              </div>
            </footer>
          </div>
        </IonModal>
      </IonContent>
    </IonPage>
  );
};

export default AdminSubscriptions;
