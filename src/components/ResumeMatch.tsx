import React, { useRef, useState } from 'react';
import { IonButton, IonIcon, IonSpinner } from '@ionic/react';
import { documentAttachOutline, refreshOutline } from 'ionicons/icons';
import { COMPANY_NAMES } from '../common/companies';
import {
  JobMatchHit,
  matchJobsByResume,
  validateResumeFile,
} from '../common/jobMatchApi';
import './ResumeMatch.css';

/** 한 번에 받아올 공고 수. 서버 상한은 20. */
const TOP_K = 10;

const careerText = (from: number, to: number): string => {
  if (!from && !to) return '경력 무관';
  if (from && to) return `${from}~${to}년`;
  if (from) return `${from}년 이상`;
  return `${to}년 이하`;
};

/** 코사인 유사도를 화면용 퍼센트로. 음수가 올 수도 있어 0~100 으로 자른다. */
const matchPercent = (score: number): number =>
  Math.max(0, Math.min(100, Math.round(score * 100)));

const companyLabel = (hit: JobMatchHit): string =>
  COMPANY_NAMES[hit.companyCd] ?? hit.sysCompanyCdNm ?? hit.companyCd;

/**
 * 이력서 PDF 를 올려 의미가 가까운 공고를 찾는다.
 *
 * <p>서버 {@code POST /api/jobs/match} 는 무상태다 — 이력서를 저장하지 않으니
 * 이 화면도 결과를 들고 있다가 새로고침하면 사라진다. 프로필에 이력서를 저장해
 * 상시 추천으로 쓰려면 서버에 벡터 저장이 먼저 필요하다.</p>
 */
const ResumeMatch: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [hits, setHits] = useState<JobMatchHit[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePick = (event: React.ChangeEvent<HTMLInputElement>) => {
    const picked = event.target.files?.[0] ?? null;
    // 같은 파일을 다시 골라도 onChange 가 뜨도록 입력값을 비운다.
    event.target.value = '';
    if (!picked) {
      return;
    }

    setHits(null);
    const invalid = validateResumeFile(picked);
    if (invalid) {
      setFile(null);
      setError(invalid);
      return;
    }
    setError(null);
    setFile(picked);
  };

  const handleSearch = async () => {
    if (!file || isLoading) {
      return;
    }
    setIsLoading(true);
    setError(null);
    setHits(null);

    const result = await matchJobsByResume(file, TOP_K);
    if (result.ok) {
      setHits(result.hits);
    } else {
      setError(result.message);
    }
    setIsLoading(false);
  };

  return (
    <div className="resume-match">
      <p className="resume-match-guide">
        이력서 PDF를 올리면 내용과 가장 가까운 공고를 찾아줍니다.
        올린 파일은 <strong>저장하지 않고</strong> 텍스트만 뽑아 바로 비교합니다.
      </p>

      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf,.pdf"
        onChange={handlePick}
        className="resume-match-input"
      />

      <div className="resume-match-actions">
        <IonButton
          fill="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={isLoading}
        >
          <IonIcon slot="start" icon={documentAttachOutline} />
          {file ? '다른 파일 선택' : 'PDF 선택'}
        </IonButton>

        <IonButton onClick={handleSearch} disabled={!file || isLoading}>
          {isLoading ? <IonSpinner name="crescent" /> : '공고 찾기'}
        </IonButton>
      </div>

      {file && (
        <p className="resume-match-file">
          <IonIcon icon={documentAttachOutline} />
          <span className="resume-match-filename">{file.name}</span>
          <span className="resume-match-filesize">
            {(file.size / 1024).toFixed(0)}KB
          </span>
        </p>
      )}

      {error && <p className="resume-match-error">{error}</p>}

      {isLoading && (
        <p className="resume-match-loading">
          <IonSpinner name="dots" /> 이력서를 읽고 공고와 비교하는 중입니다...
        </p>
      )}

      {hits && hits.length === 0 && !error && (
        <p className="resume-match-empty">
          매칭된 공고가 없습니다. 이력서에 직무·기술 키워드가 들어 있는지 확인해주세요.
        </p>
      )}

      {hits && hits.length > 0 && (
        <>
          <div className="resume-match-result-head">
            <h3>가장 가까운 공고 {hits.length}건</h3>
            <IonButton size="small" fill="clear" onClick={handleSearch} disabled={isLoading}>
              <IonIcon slot="start" icon={refreshOutline} />
              다시 찾기
            </IonButton>
          </div>

          <ul className="resume-match-list">
            {hits.map((hit, index) => (
              <li className="resume-match-card" key={hit.id ?? `${hit.jobDetailLink}-${index}`}>
                <div className="resume-match-rank">{index + 1}</div>

                <div className="resume-match-body">
                  <div className="resume-match-title-row">
                    <span className="resume-match-company">{companyLabel(hit)}</span>
                    <span className="resume-match-score">
                      일치도 {matchPercent(hit.score)}%
                    </span>
                  </div>

                  <p className="resume-match-title">{hit.annoSubject}</p>

                  <p className="resume-match-meta">
                    {[
                      hit.subJobCdNm,
                      hit.workplace,
                      careerText(hit.personalHistory, hit.personalHistoryEnd),
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>

                  {hit.jobDetailLink && (
                    <a
                      className="resume-match-link"
                      href={hit.jobDetailLink}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      자세히 보기
                    </a>
                  )}
                </div>
              </li>
            ))}
          </ul>

          <p className="resume-match-footnote">
            일치도는 이력서 본문과 공고를 벡터로 바꿔 계산한 유사도입니다.
            이력서 앞부분(약 3,000자)만 사용하므로, 핵심 경력이 뒤에 있으면 앞으로 옮기면 더 잘 맞습니다.
          </p>
        </>
      )}
    </div>
  );
};

export default ResumeMatch;
