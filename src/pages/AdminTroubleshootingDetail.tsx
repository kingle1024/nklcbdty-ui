import React, { useCallback, useEffect, useState } from 'react';
import { useHistory, useParams } from 'react-router-dom';
import { IonPage, IonContent, IonButton, IonSpinner, IonIcon } from '@ionic/react';
import { arrowBackOutline, copyOutline, checkmarkOutline } from 'ionicons/icons';
import { Helmet } from 'react-helmet';
import CommonHeader from '../common/CommonHeader';
import AdminSidebar from '../common/AdminSidebar';
import { isAdminLoggedIn } from '../common/adminApi';
import {
  TroubleshootingDetail,
  copyToClipboard,
  fetchNote,
  formatOccurredOn,
  formatStamp,
  noteToText,
  severityMeta,
} from '../common/troubleshootingApi';
import './AdminTroubleshooting.css';

/**
 * 기록 한 건. 저장할 때 나눠 둔 절(증상 → 원인 → 해결 → 검증 → 예방 → 교훈)을 그대로 보여준다.
 *
 * 순서를 이렇게 고정한 이유는 이 기록의 목적이 "고쳤다" 가 아니라 "어떻게 원인에 도달했는가" 라서다.
 * 증상 → 원인 → 해결 순으로 읽히면 진단 과정이 남고, 해결부터 보여주면 결과만 남는다.
 *
 * 본문은 손대지 않고 그대로 내보낸다 — 증상에 넣어 둔 에러 메시지 원문이 나중에 검색 키가 된다.
 */
const SECTIONS: Array<{
  key: keyof TroubleshootingDetail;
  title: string;
  hint?: string;
  /** 로그·에러 메시지가 섞이는 절은 등폭으로 — 원문 정렬이 살아 있어야 읽힌다 */
  log?: boolean;
}> = [
  { key: 'symptom', title: '증상', hint: '관측된 사실과 에러 메시지 원문', log: true },
  { key: 'rootCause', title: '원인', hint: '직접 원인 → 그 원인 → 왜 하필 지금' },
  { key: 'resolution', title: '해결', hint: '무엇을 왜 그렇게 고쳤는지' },
  { key: 'verification', title: '검증', hint: '고쳐진 것을 어떻게 증명했는지' },
  { key: 'prevention', title: '재발 방지' },
];

const AdminTroubleshootingDetail: React.FC = () => {
  const history = useHistory();
  const { slug } = useParams<{ slug: string }>();

  const [note, setNote] = useState<TroubleshootingDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  // '복사됨' / '복사 실패' 중 어느 쪽인지. 잠깐 보여주고 되돌린다.
  const [copyState, setCopyState] = useState<'idle' | 'done' | 'failed'>('idle');

  useEffect(() => {
    if (!isAdminLoggedIn()) {
      history.replace('/admin');
    }
  }, [history]);

  const load = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      setNote(await fetchNote(slug));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '기록을 가져오지 못했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    load();
  }, [load]);

  // 다른 기록으로 넘어가면 이전 화면의 '복사됨' 표시가 남지 않게 되돌린다
  useEffect(() => {
    setCopyState('idle');
  }, [slug]);

  const handleCopyAll = async () => {
    if (!note) {
      return;
    }
    const ok = await copyToClipboard(noteToText(note));
    setCopyState(ok ? 'done' : 'failed');
    // 실패는 조금 더 오래 남겨 둔다 — 놓치면 빈 클립보드를 붙여 넣게 된다
    window.setTimeout(() => setCopyState('idle'), ok ? 1800 : 4000);
  };

  const sev = severityMeta(note?.severity ?? null);

  return (
    <IonPage>
      <Helmet>
        <title>{note ? `${note.title} - 트러블슈팅` : '트러블슈팅 기록'}</title>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Helmet>
      <CommonHeader />
      <IonContent>
        <div className="ts-layout">
          <AdminSidebar />
          <div className="ts-main">
            <div className="ts-detail-toolbar">
              <IonButton
                fill="clear"
                size="small"
                onClick={() => history.push('/admin/troubleshooting')}
              >
                <IonIcon slot="start" icon={arrowBackOutline} />
                목록으로
              </IonButton>

              {/* 기록 전체를 마크다운 텍스트로 클립보드에 넣는다. Claude 에게 붙여 넣어
                  참고시키는 용도라, 화면에 보이는 순서 그대로 절 제목을 붙여 뽑는다. */}
              <IonButton
                fill="outline"
                size="small"
                disabled={!note}
                onClick={handleCopyAll}
                color={copyState === 'failed' ? 'danger' : copyState === 'done' ? 'success' : undefined}
              >
                <IonIcon slot="start" icon={copyState === 'done' ? checkmarkOutline : copyOutline} />
                {copyState === 'done' ? '복사됨' : copyState === 'failed' ? '복사 실패' : '전체 복사'}
              </IonButton>
            </div>

            {isLoading ? (
              <div className="ts-loading">
                <IonSpinner name="crescent" />
                <span>기록을 불러오는 중...</span>
              </div>
            ) : errorMessage || !note ? (
              <div className="ts-empty">{errorMessage || '기록을 찾을 수 없습니다.'}</div>
            ) : (
              <article className="ts-detail">
                <div className="ts-card-top">
                  <span className="ts-card-date">{formatOccurredOn(note.occurredOn)}</span>
                  <span className={sev.className}>{sev.label}</span>
                  {note.errorCode && <span className="ts-mono">{note.errorCode}</span>}
                </div>

                <h1 className="ts-detail-title">{note.title}</h1>

                <div className="ts-detail-meta">
                  <span>
                    <b>프로젝트</b>
                    {note.project}
                  </span>
                  {note.component && (
                    <span>
                      <b>구성요소</b>
                      {note.component}
                    </span>
                  )}
                  {note.techStack.length > 0 && (
                    <span>
                      <b>기술</b>
                      {note.techStack.join(', ')}
                    </span>
                  )}
                </div>

                {note.lesson && (
                  <div className="ts-section">
                    <h2>교훈</h2>
                    <p className="ts-lesson">{note.lesson}</p>
                  </div>
                )}

                {SECTIONS.map((section) => {
                  const value = note[section.key];
                  // 값이 비어 있는 절은 빈 제목만 남기지 않고 아예 그린다
                  if (typeof value !== 'string' || !value.trim()) {
                    return null;
                  }
                  return (
                    <div className="ts-section" key={section.key as string}>
                      <h2>
                        {section.title}
                        {section.hint && <span className="ts-section-hint">{section.hint}</span>}
                      </h2>
                      <p className={`ts-body${section.log ? ' log' : ''}`}>{value}</p>
                    </div>
                  );
                })}

                {note.tags.length > 0 && (
                  <div className="ts-section">
                    <h2>태그</h2>
                    <div className="ts-tagbar">
                      {note.tags.map((name) => (
                        <button
                          key={name}
                          type="button"
                          className="ts-tag"
                          onClick={() =>
                            history.push(
                              `/admin/troubleshooting?tag=${encodeURIComponent(name)}`
                            )
                          }
                        >
                          #{name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {note.referenceLinks.length > 0 && (
                  <div className="ts-section">
                    <h2>참고</h2>
                    <ul className="ts-links">
                      {note.referenceLinks.map((link, index) => (
                        <li key={`${link.label}-${index}`}>
                          {link.url ? (
                            // 외부 저장소·CI 로 나가는 링크. 기록 화면을 잃지 않게 새 탭으로 연다
                            <a href={link.url} target="_blank" rel="noopener noreferrer">
                              {link.label}
                            </a>
                          ) : (
                            // 주소가 없는 줄(커밋 해시 등)은 링크로 만들지 않는다
                            link.label
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="ts-detail-foot">
                  <span className="ts-mono">{note.slug}</span>
                  {' · '}
                  기록 {formatStamp(note.createdAt)}
                  {note.updatedAt && note.updatedAt !== note.createdAt
                    ? ` · 갱신 ${formatStamp(note.updatedAt)}`
                    : ''}
                </div>
              </article>
            )}
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default AdminTroubleshootingDetail;
