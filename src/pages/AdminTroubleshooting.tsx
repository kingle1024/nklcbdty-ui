import React, { useCallback, useEffect, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { IonPage, IonContent, IonButton, IonSpinner, IonIcon, IonAlert } from '@ionic/react';
import { refreshOutline, linkOutline, copyOutline, checkmarkOutline } from 'ionicons/icons';
import { Helmet } from 'react-helmet';
import CommonHeader from '../common/CommonHeader';
import AdminSidebar from '../common/AdminSidebar';
import { isAdminLoggedIn } from '../common/adminApi';
import {
  TroubleshootingPage,
  copyToClipboard,
  fetchNotes,
  fetchNotesForExport,
  formatOccurredOn,
  notesToText,
  severityMeta,
} from '../common/troubleshootingApi';
import './AdminTroubleshooting.css';

const PAGE_SIZE = 20;

/** 태그가 수십 개라 처음에는 이만큼만 보여주고 나머지는 접는다 */
const TAGS_COLLAPSED = 12;

/** 페이징 버튼에 보여줄 페이지 번호(현재 페이지 기준 최대 5개) */
const pageNumbers = (current: number, totalPages: number): number[] => {
  const start = Math.max(0, Math.min(current - 2, totalPages - 5));
  const end = Math.min(totalPages, start + 5);
  const numbers: number[] = [];
  for (let i = start; i < end; i += 1) {
    numbers.push(i);
  }
  return numbers;
};

/**
 * 트러블슈팅 기록 목록.
 *
 * 기록은 로컬의 save-troubleshooting 스킬이 DB(troubleshooting_note)에 넣고, 이 화면은 읽기만 한다.
 * 그래서 글쓰기 버튼이 없다. 찾는 방법을 세 가지 둔 이유는 기록을 다시 꺼내는 실마리가
 * 그때그때 다르기 때문이다 — 프로젝트가 기억날 때, 태그가 기억날 때, 에러 메시지만 기억날 때.
 */
const AdminTroubleshooting: React.FC = () => {
  const history = useHistory();
  const location = useLocation();

  const [result, setResult] = useState<TroubleshootingPage | null>(null);
  const [page, setPage] = useState(0);
  // 입력 중인 검색어와 실제 조회에 쓰는 검색어를 나눠 타이핑마다 조회하지 않는다
  const [keywordInput, setKeywordInput] = useState('');
  const [keyword, setKeyword] = useState('');
  const [project, setProject] = useState('');
  const [severity, setSeverity] = useState('');
  const [tag, setTag] = useState('');
  const [showAllTags, setShowAllTags] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  // 전체 복사: 서버에서 본문까지 받아오는 동안 기다려야 하므로 진행 상태를 따로 둔다
  const [copyState, setCopyState] = useState<'idle' | 'working' | 'done' | 'failed'>('idle');
  const [copiedCount, setCopiedCount] = useState(0);

  // 미로그인 시 관리자 로그인(/admin)으로 보낸다
  useEffect(() => {
    if (!isAdminLoggedIn()) {
      history.replace('/admin');
    }
  }, [history]);

  // 주소에 실린 조건을 반영한다. 상세 화면에서 태그를 눌러 돌아오는 길
  // (/admin/troubleshooting?tag=race-condition)이 이걸로 이어진다.
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const nextKeyword = params.get('keyword') ?? '';
    setKeyword(nextKeyword);
    setKeywordInput(nextKeyword);
    setProject(params.get('project') ?? '');
    setSeverity(params.get('severity') ?? '');
    setTag(params.get('tag') ?? '');
    setPage(0);
  }, [location.search]);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      setResult(await fetchNotes({ keyword, project, severity, tag, page, size: PAGE_SIZE }));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '기록 목록을 가져오지 못했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, [keyword, project, severity, tag, page]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSearch = () => {
    setPage(0);
    setKeyword(keywordInput.trim());
  };

  /**
   * 지금 걸린 조건에 맞는 기록 전체를 본문까지 텍스트로 복사한다.
   * 보고 있는 페이지가 아니라 **조건에 맞는 전부**다 — 페이지를 넘겨가며 복사하게 만들지 않는다.
   */
  const handleCopyAll = async () => {
    setCopyState('working');
    try {
      const notes = await fetchNotesForExport({ keyword, project, severity, tag });
      if (notes.length === 0) {
        setCopyState('failed');
        setErrorMessage('복사할 기록이 없습니다.');
        window.setTimeout(() => setCopyState('idle'), 2500);
        return;
      }
      const ok = await copyToClipboard(notesToText(notes, { keyword, project, severity, tag }));
      setCopiedCount(notes.length);
      setCopyState(ok ? 'done' : 'failed');
      if (!ok) {
        setErrorMessage('클립보드에 넣지 못했습니다. 브라우저 권한을 확인해 주세요.');
      }
      // 실패는 조금 더 오래 남긴다 — 놓치면 빈 클립보드를 붙여 넣게 된다
      window.setTimeout(() => setCopyState('idle'), ok ? 2200 : 4000);
    } catch (error) {
      setCopyState('failed');
      setErrorMessage(error instanceof Error ? error.message : '기록을 가져오지 못했습니다.');
      window.setTimeout(() => setCopyState('idle'), 4000);
    }
  };

  /** 같은 값을 다시 누르면 해제된다 — 조건을 지우려고 드롭다운을 찾지 않게 */
  const toggleSeverity = (value: string) => {
    setPage(0);
    setSeverity((prev) => (prev === value ? '' : value));
  };

  const toggleTag = (value: string) => {
    setPage(0);
    setTag((prev) => (prev === value ? '' : value));
  };

  const clearFilters = () => {
    // 주소에 조건이 실려 들어온 경우(상세에서 태그를 눌러 온 길)에는 주소도 같이 비운다.
    // 그러지 않으면 화면은 비어 있는데 주소는 조건을 들고 있어, 새로고침하면 되살아난다.
    if (location.search) {
      history.replace('/admin/troubleshooting');
      return;
    }
    setPage(0);
    setKeyword('');
    setKeywordInput('');
    setProject('');
    setSeverity('');
    setTag('');
  };

  const rows = result?.rows ?? [];
  const totalPages = result?.totalPages ?? 0;
  // 필터 후보와 집계는 서버가 전체 기준으로 준다. 필터를 걸어도 선택지가 사라지지 않는다.
  const projects = result?.projects ?? [];
  const allTags = result?.tags ?? [];
  // 걸려 있는 태그는 접힌 뒤쪽에 있어도 반드시 보여준다. 상세에서 태그를 눌러 들어오면
  // (?tag=logback) 흔한 태그가 아닐 때가 많아, 안 보이면 무엇으로 좁혀졌는지 알 수 없다.
  const visibleTags = showAllTags
    ? allTags
    : tag && !allTags.slice(0, TAGS_COLLAPSED).includes(tag)
      ? [tag, ...allTags.slice(0, TAGS_COLLAPSED - 1)]
      : allTags.slice(0, TAGS_COLLAPSED);
  const hiddenTagCount = allTags.length - visibleTags.filter((t) => allTags.includes(t)).length;
  const severityCounts = result?.severityCounts ?? {};
  const hasFilter = !!(keyword || project || severity || tag);

  return (
    <IonPage>
      <Helmet>
        <title>관리자 - 트러블슈팅 기록</title>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="description" content="해결한 장애 기록 열람" />
      </Helmet>
      <CommonHeader />
      <IonContent>
        <div className="ts-layout">
          <AdminSidebar />
          <div className="ts-main">
            <header className="ts-head">
              <div>
                <h1>트러블슈팅 기록</h1>
                <p>
                  해결한 장애를 원인·해결·검증까지 남겨 둔 기록입니다.
                  {result ? ` 전체 ${result.totalNotes}건.` : ''}
                </p>
              </div>
              <div className="ts-head-actions">
                {/* 조건에 맞는 기록 전체를 본문까지 한 번에 복사한다. 상세를 열지 않고
                    Claude 에게 붙여 넣으려는 용도라 목록 화면에 둔다. */}
                <IonButton
                  fill="outline"
                  size="default"
                  onClick={handleCopyAll}
                  disabled={isLoading || copyState === 'working' || rows.length === 0}
                  color={copyState === 'failed' ? 'danger' : copyState === 'done' ? 'success' : undefined}
                >
                  {copyState === 'working' ? (
                    <IonSpinner name="crescent" style={{ width: 16, height: 16 }} />
                  ) : (
                    <IonIcon slot="start" icon={copyState === 'done' ? checkmarkOutline : copyOutline} />
                  )}
                  {copyState === 'working'
                    ? ' 모으는 중'
                    : copyState === 'done'
                      ? `${copiedCount}건 복사됨`
                      : copyState === 'failed'
                        ? '복사 실패'
                        : '전체 복사'}
                </IonButton>
                <IonButton fill="outline" size="default" onClick={load} disabled={isLoading}>
                  <IonIcon slot="start" icon={refreshOutline} />
                  새로고침
                </IonButton>
              </div>
            </header>

            {/* 심각도 요약 겸 필터. 숫자는 전체 기준이라 필터를 걸어도 변하지 않는다 */}
            {Object.keys(severityCounts).length > 0 && (
              <div className="ts-stats">
                {Object.entries(severityCounts).map(([level, count]) => (
                  <button
                    key={level}
                    type="button"
                    className={`ts-stat${severity === level ? ' selected' : ''}`}
                    onClick={() => toggleSeverity(level)}
                  >
                    <span className="ts-stat-num">{count}</span>
                    <span>{level}</span>
                  </button>
                ))}
              </div>
            )}

            <div className="ts-filters">
              <input
                value={keywordInput}
                onChange={(e) => setKeywordInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSearch();
                  }
                }}
                placeholder="제목·증상·원인·에러 코드·태그 검색"
              />
              <select
                value={project}
                onChange={(e) => {
                  setPage(0);
                  setProject(e.target.value);
                }}
              >
                <option value="">전체 프로젝트</option>
                {projects.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
              <IonButton size="small" fill="outline" onClick={handleSearch}>
                검색
              </IonButton>
            </div>

            {allTags.length > 0 && (
              <div className="ts-tagbar">
                {visibleTags.map((name) => (
                  <button
                    key={name}
                    type="button"
                    className={`ts-tag${tag === name ? ' selected' : ''}`}
                    onClick={() => toggleTag(name)}
                  >
                    #{name}
                  </button>
                ))}
                {(showAllTags || hiddenTagCount > 0) && (
                  <button
                    type="button"
                    className="ts-tag more"
                    onClick={() => setShowAllTags((v) => !v)}
                  >
                    {showAllTags ? '접기' : `+${hiddenTagCount} 더 보기`}
                  </button>
                )}
              </div>
            )}

            {hasFilter && (
              <p className="ts-applied">
                {result ? `${result.totalElements}건` : '조회 중'}
                {keyword ? ` · 검색 '${keyword}'` : ''}
                {project ? ` · ${project}` : ''}
                {severity ? ` · ${severity}` : ''}
                {tag ? ` · #${tag}` : ''}
                <button type="button" onClick={clearFilters}>
                  조건 지우기
                </button>
              </p>
            )}

            {isLoading ? (
              <div className="ts-loading">
                <IonSpinner name="crescent" />
                <span>기록을 불러오는 중...</span>
              </div>
            ) : rows.length === 0 ? (
              <div className="ts-empty">
                {hasFilter ? '조건에 맞는 기록이 없습니다.' : '저장된 기록이 없습니다.'}
              </div>
            ) : (
              <div className="ts-list">
                {rows.map((note) => {
                  const sev = severityMeta(note.severity);
                  return (
                    <div
                      key={note.slug}
                      className="ts-card"
                      onClick={() => history.push(`/admin/troubleshooting/${note.slug}`)}
                    >
                      <div className="ts-card-top">
                        <span className="ts-card-date">{formatOccurredOn(note.occurredOn)}</span>
                        <span className={sev.className}>{sev.label}</span>
                        <span>{note.project}</span>
                        {note.errorCode && <span className="ts-mono">{note.errorCode}</span>}
                        {note.hasReferences && <IonIcon icon={linkOutline} title="참고 링크 있음" />}
                      </div>
                      <h2 className="ts-card-title">{note.title}</h2>
                      {note.lesson && <p className="ts-card-lesson">{note.lesson}</p>}
                      {note.tags.length > 0 && (
                        <div className="ts-card-tags">
                          {note.tags.slice(0, 8).map((name) => (
                            <span key={name}>#{name}</span>
                          ))}
                          {note.tags.length > 8 && <span>+{note.tags.length - 8}</span>}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {totalPages > 1 && (
              <div className="ts-pagination">
                <button
                  className="ts-page-btn"
                  disabled={page === 0}
                  onClick={() => setPage(page - 1)}
                >
                  이전
                </button>
                {pageNumbers(page, totalPages).map((number) => (
                  <button
                    key={number}
                    className={`ts-page-btn${number === page ? ' current' : ''}`}
                    onClick={() => setPage(number)}
                  >
                    {number + 1}
                  </button>
                ))}
                <button
                  className="ts-page-btn"
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage(page + 1)}
                >
                  다음
                </button>
              </div>
            )}
          </div>
        </div>

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

export default AdminTroubleshooting;
