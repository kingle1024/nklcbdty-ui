import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { IonPage, IonContent, IonButton, IonIcon, IonSpinner } from '@ionic/react';
import { refreshOutline, chevronBackOutline, chevronForwardOutline } from 'ionicons/icons';
import { Helmet } from 'react-helmet';
import CommonHeader from '../common/CommonHeader';
import AdminSidebar from '../common/AdminSidebar';
import { isAdminLoggedIn } from '../common/adminApi';
import {
  fetchVisitors,
  formatVisitTime,
  ORIGIN_META,
  VisitorOrigin,
  VisitorPage,
  VisitorQuery,
} from '../common/visitorLogApi';
import './AdminVisitors.css';

const PAGE_SIZE = 50;
// "국내만" 은 거의 늘 켜 두고 볼 것이라 마지막 선택을 기억한다. 해외 접속은 대부분 구글·클라우드 봇이다.
const DOMESTIC_KEY = 'adminVisitors.domestic';
const EXCLUDE_INTERNAL_KEY = 'adminVisitors.excludeInternal';

const readFlag = (key: string, fallback: boolean): boolean => {
  try {
    const v = localStorage.getItem(key);
    return v === null ? fallback : v === 'true';
  } catch {
    return fallback;
  }
};

const writeFlag = (key: string, value: boolean) => {
  try {
    localStorage.setItem(key, String(value));
  } catch {
    // 저장소를 못 쓰면 이번 화면에서만 유지된다
  }
};

const SUMMARY_ORDER: VisitorOrigin[] = ['DOMESTIC', 'INTERNAL', 'FOREIGN', 'UNKNOWN'];

const AdminVisitors: React.FC = () => {
  const history = useHistory();
  const [domestic, setDomestic] = useState<boolean>(() => readFlag(DOMESTIC_KEY, true));
  const [excludeInternal, setExcludeInternal] = useState<boolean>(() => readFlag(EXCLUDE_INTERNAL_KEY, false));
  const [keywordInput, setKeywordInput] = useState('');
  const [keyword, setKeyword] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(0);
  const [data, setData] = useState<VisitorPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAdminLoggedIn()) {
      history.replace('/admin');
    }
  }, [history]);

  // 체크박스를 연달아 누르면 요청이 여러 개 겹친다. 늦게 도착한 옛 응답이 새 조건의 결과를 덮지 않게 마지막 요청만 반영한다.
  const requestSeq = useRef(0);

  const load = useCallback(async () => {
    const query: VisitorQuery = { page, size: PAGE_SIZE, domestic, excludeInternal, keyword, from, to };
    const seq = ++requestSeq.current;
    setLoading(true);
    setError(null);
    try {
      const result = await fetchVisitors(query);
      if (seq === requestSeq.current) setData(result);
    } catch (e) {
      if (seq !== requestSeq.current) return;
      const status = (e as { response?: { status?: number } })?.response?.status;
      setError(
        status === 404
          ? '서버에 접속 로그 API 가 아직 없습니다. 백엔드 배포가 반영되면 보입니다.'
          : '접속 로그를 불러오지 못했습니다.'
      );
    } finally {
      if (seq === requestSeq.current) setLoading(false);
    }
  }, [page, domestic, excludeInternal, keyword, from, to]);

  useEffect(() => {
    load();
  }, [load]);

  // 조건이 바뀌면 첫 페이지부터 본다
  const changeFilter = (apply: () => void) => {
    apply();
    setPage(0);
  };

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    changeFilter(() => setKeyword(keywordInput));
  };

  const counts = data?.originCounts;
  const total = counts ? SUMMARY_ORDER.reduce((sum, o) => sum + (counts[o] ?? 0), 0) : 0;
  const totalPages = data?.totalPages ?? 0;

  return (
    <IonPage>
      <Helmet>
        <title>접속 로그 - 관리자</title>
        <meta charSet="utf-8" />
      </Helmet>
      <CommonHeader />
      <IonContent>
        <div style={{ display: 'flex', alignItems: 'flex-start' }}>
          <AdminSidebar />
          <div className="visitors-main">
            <header className="visitors-header">
              <div>
                <h1>사용자 접속 로그</h1>
                <p>공고 목록·상세 API 호출 기록입니다. 국내 여부는 접속 IP 가 한국에 할당된 대역(APNIC)인지로 판별합니다.</p>
              </div>
              <IonButton fill="outline" size="small" onClick={load} disabled={loading}>
                <IonIcon slot="start" icon={refreshOutline} />
                새로고침
              </IonButton>
            </header>

            <div className="visitors-filters">
              <label className="visitors-check">
                <input
                  type="checkbox"
                  checked={domestic}
                  onChange={(e) => {
                    const v = e.target.checked;
                    writeFlag(DOMESTIC_KEY, v);
                    changeFilter(() => setDomestic(v));
                  }}
                />
                국내 접속만
              </label>
              <label className="visitors-check">
                <input
                  type="checkbox"
                  checked={excludeInternal}
                  onChange={(e) => {
                    const v = e.target.checked;
                    writeFlag(EXCLUDE_INTERNAL_KEY, v);
                    changeFilter(() => setExcludeInternal(v));
                  }}
                />
                팀원 접속 제외
              </label>
              <div className="visitors-dates">
                <input
                  type="date"
                  value={from}
                  max={to || undefined}
                  onChange={(e) => changeFilter(() => setFrom(e.target.value))}
                  aria-label="시작일"
                />
                <span>~</span>
                <input
                  type="date"
                  value={to}
                  min={from || undefined}
                  onChange={(e) => changeFilter(() => setTo(e.target.value))}
                  aria-label="종료일"
                />
              </div>
              <form className="visitors-search" onSubmit={onSearch}>
                <input
                  type="search"
                  value={keywordInput}
                  placeholder="경로·IP 검색"
                  onChange={(e) => setKeywordInput(e.target.value)}
                />
                <button type="submit">검색</button>
              </form>
            </div>

            {counts && (
              <div className="visitors-summary">
                <span className="visitors-summary-total">
                  {from || to ? '기간 내' : '전체'} {total.toLocaleString()}건
                </span>
                {SUMMARY_ORDER.filter((o) => o !== 'UNKNOWN' || counts.UNKNOWN > 0).map((o) => (
                  <span key={o} className={`origin-badge ${ORIGIN_META[o].className}`}>
                    {ORIGIN_META[o].label} {(counts[o] ?? 0).toLocaleString()}
                  </span>
                ))}
              </div>
            )}

            {error ? (
              <div className="visitors-empty visitors-error">{error}</div>
            ) : loading && !data ? (
              <div className="visitors-empty">
                <IonSpinner name="crescent" />
              </div>
            ) : !data || data.rows.length === 0 ? (
              <div className="visitors-empty">조건에 맞는 접속 기록이 없습니다.</div>
            ) : (
              <div className={`visitors-table-wrap${loading ? ' is-loading' : ''}`}>
                <table className="visitors-table">
                  <thead>
                    <tr>
                      <th>시각</th>
                      <th>출처</th>
                      <th>IP</th>
                      <th>경로</th>
                      <th>지역</th>
                      <th>유입</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.rows.map((r) => {
                      const meta = ORIGIN_META[r.origin] ?? ORIGIN_META.UNKNOWN;
                      const place = [r.countryName, r.regionName, r.cityName].filter(Boolean).join(' · ');
                      return (
                        <tr key={r.id}>
                          <td className="nowrap">{formatVisitTime(r.insertDts)}</td>
                          <td>
                            <span className={`origin-badge ${meta.className}`}>{meta.label}</span>
                          </td>
                          <td className="nowrap mono">{r.ip ?? '-'}</td>
                          <td className="mono path" title={r.path ?? ''}>{r.path ?? '-'}</td>
                          <td className="muted">{place || '-'}</td>
                          <td className="muted referer" title={r.referer ?? ''}>{r.referer ?? '-'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {totalPages > 1 && (
              <div className="visitors-pager">
                <IonButton size="small" fill="clear" disabled={page === 0 || loading} onClick={() => setPage(page - 1)}>
                  <IonIcon slot="icon-only" icon={chevronBackOutline} />
                </IonButton>
                <span>
                  {page + 1} / {totalPages} 페이지 · {data?.totalElements.toLocaleString()}건
                </span>
                <IonButton
                  size="small"
                  fill="clear"
                  disabled={page + 1 >= totalPages || loading}
                  onClick={() => setPage(page + 1)}
                >
                  <IonIcon slot="icon-only" icon={chevronForwardOutline} />
                </IonButton>
              </div>
            )}
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default AdminVisitors;
