import React, { useCallback, useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { IonPage, IonContent, IonButton, IonSpinner, IonIcon, IonAlert } from '@ionic/react';
import { copyOutline, checkmarkOutline, addOutline } from 'ionicons/icons';
import { Helmet } from 'react-helmet';
import CommonHeader from '../common/CommonHeader';
import Sidebar from '../common/Sidebar';
import { useAuth } from '../common/AuthContextType';
import { copyToClipboard } from '../common/troubleshootingApi';
import {
  CareerEntry,
  CareerForm,
  careerToText,
  formatPeriod,
  formatTenure,
  groupCareer,
} from '../common/careerApi';
import { createMyCareer, deleteMyCareer, fetchMyCareer, updateMyCareer } from '../common/myCareerApi';
import AdminCareerEditor, { CareerEditorApi, EditTarget } from './AdminCareerEditor';
import { EditButton, EntryBody, ProjectItem } from './AdminCareer';
import './Mypage.css';
import './AdminTroubleshooting.css';
import './AdminCareer.css';
import './MyCareer.css';

const MY_API: CareerEditorApi = { create: createMyCareer, update: updateMyCareer, remove: deleteMyCareer };

/**
 * 마이페이지 "내 경력". 회사·프로젝트(경력기술서)·학력·자격증을 적어 두고 회사별로 묶어 본다.
 *
 * 관리자 경력 화면(AdminCareer)과 보여주는 방식·편집 모달을 같이 쓰고, 저장처만 사용자 본인의
 * 경력(/api/my-career)이다. 적어 둔 것은 '전체 복사' 로 마크다운 한 덩어리로 뽑아
 * 이력서·자기소개서 초안에 붙여 쓸 수 있다.
 */
const MyCareer: React.FC = () => {
  const history = useHistory();
  const { isLoggedIn } = useAuth();
  const [entries, setEntries] = useState<CareerEntry[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [copyState, setCopyState] = useState<'idle' | 'done' | 'failed'>('idle');
  const [editTarget, setEditTarget] = useState<EditTarget | null>(null);

  // 마이페이지는 로그인 전용이다. 다른 마이페이지 화면과 같이 비로그인 진입은 메인으로 보낸다
  useEffect(() => {
    if (!isLoggedIn) {
      history.replace('/');
    }
  }, [isLoggedIn, history]);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      setEntries(await fetchMyCareer());
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '경력을 가져오지 못했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isLoggedIn) {
      load();
    }
  }, [isLoggedIn, load]);

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
        <title>내 경력 - 마이페이지</title>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="description" content="회사별 경력과 경력기술서를 적어 두는 곳" />
      </Helmet>
      <CommonHeader />
      <IonContent>
        <div className="mypage-container">
          <Sidebar activeTab="career" />
          <div className="content my-career">
            <header className="ts-head">
              <div>
                <h1>내 경력</h1>
                <p>
                  회사·프로젝트·학력·자격증을 적어 두세요.
                  {entries ? ` 전체 ${list.length}건.` : ''}
                </p>
              </div>
              <div className="ts-head-actions">
                <IonButton size="default" onClick={() => add({ entryType: 'company' })} disabled={isLoading}>
                  <IonIcon slot="start" icon={addOutline} />
                  추가
                </IonButton>
                {/* 마크다운으로 복사 — 이력서·자기소개서 초안을 쓸 때 붙여 넣는 용도 */}
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
              </div>
            </header>

            {isLoading ? (
              <div className="ts-loading">
                <IonSpinner name="crescent" />
                <span>경력을 불러오는 중...</span>
              </div>
            ) : list.length === 0 ? (
              <div className="ts-empty my-career-empty">
                아직 적어 둔 경력이 없습니다.
                <br />
                다니는(다녔던) 회사부터 추가하고, 회사 카드의 &apos;프로젝트&apos; 로 경력기술서 항목을 붙여 보세요.
                <div>
                  <IonButton onClick={() => add({ entryType: 'company' })}>
                    <IonIcon slot="start" icon={addOutline} />
                    첫 경력 추가
                  </IonButton>
                </div>
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
                        {c.head && !c.head.endedOn && c.head.startedOn && <span className="cr-badge">재직 중</span>}
                        <span className="cr-head-actions">
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
                            <ProjectItem key={p.id} entry={p} onEdit={edit} />
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
                        <ProjectItem key={p.id} entry={p} onEdit={edit} />
                      ))}
                    </div>
                  </section>
                )}

                {others.length > 0 && (
                  <section className="ts-card cr-company">
                    <div className="cr-company-head">
                      <h2>학력·자격증·기타</h2>
                    </div>
                    <div className="cr-projects">
                      {others.map((o) => (
                        <ProjectItem key={o.id} entry={o} onEdit={edit} />
                      ))}
                    </div>
                  </section>
                )}
              </div>
            )}
          </div>
        </div>

        <AdminCareerEditor
          api={MY_API}
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

export default MyCareer;
