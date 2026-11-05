import React, { useRef, useState } from 'react';
import { IonButton, IonIcon, IonSpinner } from '@ionic/react';
import {
  closeOutline,
  copyOutline,
  documentAttachOutline,
  downloadOutline,
  sparklesOutline,
} from 'ionicons/icons';
import {
  FitStatus,
  requestResumeReview,
  ResumeReview as ReviewResult,
  ReviewDocument,
} from '../common/resumeReviewApi';
import { ACCEPT_ATTRIBUTE, validateReviewFiles } from '../common/resumeReviewFiles';
import './ResumeReview.css';

type JobSource = 'url' | 'text';

const FIT_LABEL: Record<FitStatus, string> = {
  MATCHED: '충족',
  PARTIAL: '보강 필요',
  MISSING: '근거 없음',
};

const kb = (bytes: number) => `${Math.max(1, Math.round(bytes / 1024))}KB`;

/** 확장자를 떼고 "_첨삭.txt" 를 붙인다. 원래 PDF 여도 고친 글은 글자뿐이라 txt 로 준다. */
const revisedFileName = (fileName: string) => `${fileName.replace(/\.[^.]+$/, '')}_첨삭.txt`;

const download = (fileName: string, text: string) => {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
};

/**
 * 공고(주소 또는 붙여넣은 글)와 이력서·포트폴리오를 올리면 AI 가 견주어 고칠 곳을 찾고,
 * 고친 글과 함께 "무엇을 왜 바꿨는지" 를 항목별로 보여 준다.
 *
 * 고친 글은 서버가 변경 목록을 원문에 적용해 만든 것이라, 변경 목록에 없는 곳은 원문 그대로다.
 */
const ResumeReview: React.FC = () => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [source, setSource] = useState<JobSource>('url');
  const [jobUrl, setJobUrl] = useState('');
  const [jobText, setJobText] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [review, setReview] = useState<ReviewResult | null>(null);

  const addFiles = (picked: FileList | null) => {
    if (!picked || picked.length === 0) {
      return;
    }
    // 같은 이름은 새로 고른 것으로 바꾼다 — 고친 파일을 다시 올리는 경우가 많다.
    const incoming = Array.from(picked);
    const next = [...files.filter((f) => !incoming.some((n) => n.name === f.name)), ...incoming];
    const problem = validateReviewFiles(next);
    setError(problem);
    if (!problem) {
      setFiles(next);
    }
  };

  const removeFile = (name: string) => {
    setFiles((prev) => prev.filter((f) => f.name !== name));
    setError(null);
  };

  const jobFilled = source === 'url' ? jobUrl.trim() !== '' : jobText.trim() !== '';
  const canSubmit = jobFilled && files.length > 0 && !loading;

  const submit = async () => {
    if (!canSubmit) {
      return;
    }
    setLoading(true);
    setError(null);
    setReview(null);
    const result = await requestResumeReview({
      files,
      jobUrl: source === 'url' ? jobUrl : '',
      jobText: source === 'text' ? jobText : '',
    });
    setLoading(false);
    if (result.ok) {
      setReview(result.review);
    } else {
      setError(result.message);
    }
  };

  return (
    <div className="resume-review">
      <p className="rr-guide">
        지원할 공고와 내 이력서·포트폴리오를 올리면, 공고에 맞춰 문서를 고치고 무엇을 왜 바꿨는지 함께 알려드려요.
        없는 경험을 지어내지 않고, 이미 적힌 내용을 공고의 언어로 다듬어요. 올린 파일은 저장하지 않아요.
      </p>

      <section className="rr-step">
        <h3 className="rr-step-title">1. 채용 공고</h3>
        <div className="rr-segment" role="radiogroup" aria-label="공고 입력 방식">
          {(
            [
              ['url', '공고 주소'],
              ['text', '공고 내용 붙여넣기'],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={source === value}
              className={`rr-segment-option${source === value ? ' is-selected' : ''}`}
              onClick={() => setSource(value)}
            >
              {label}
            </button>
          ))}
        </div>
        {source === 'url' ? (
          <>
            <input
              className="rr-input"
              type="url"
              inputMode="url"
              placeholder="https://www.wanted.co.kr/wd/... 또는 공유 링크"
              value={jobUrl}
              onChange={(e) => setJobUrl(e.target.value)}
              aria-label="공고 주소"
            />
            <p className="rr-hint">페이지를 읽지 못하면 공고 내용을 직접 붙여넣어 주세요.</p>
          </>
        ) : (
          <textarea
            className="rr-input rr-textarea"
            placeholder="주요업무, 자격요건, 우대사항 등 공고 내용을 붙여넣어 주세요."
            value={jobText}
            onChange={(e) => setJobText(e.target.value)}
            aria-label="공고 내용"
            rows={8}
          />
        )}
      </section>

      <section className="rr-step">
        <h3 className="rr-step-title">2. 이력서·포트폴리오</h3>
        <input
          ref={inputRef}
          className="rr-file-input"
          type="file"
          multiple
          accept={ACCEPT_ATTRIBUTE}
          onChange={(e) => {
            addFiles(e.target.files);
            // 같은 파일을 지웠다가 다시 고를 수 있게 비운다.
            e.target.value = '';
          }}
        />
        <IonButton fill="outline" size="small" onClick={() => inputRef.current?.click()} disabled={loading}>
          <IonIcon slot="start" icon={documentAttachOutline} />
          파일 고르기
        </IonButton>
        <span className="rr-hint rr-inline-hint">PDF·TXT·MD, 최대 5개</span>
        {files.length > 0 && (
          <ul className="rr-files">
            {files.map((file) => (
              <li key={file.name} className="rr-file">
                <span className="rr-file-name">{file.name}</span>
                <span className="rr-file-size">{kb(file.size)}</span>
                <button
                  type="button"
                  className="rr-icon-btn"
                  onClick={() => removeFile(file.name)}
                  aria-label={`${file.name} 빼기`}
                  disabled={loading}
                >
                  <IonIcon icon={closeOutline} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="rr-submit">
        <IonButton onClick={submit} disabled={!canSubmit}>
          <IonIcon slot="start" icon={sparklesOutline} />
          {review ? '다시 첨삭하기' : '첨삭하기'}
        </IonButton>
      </div>

      {error && <p className="rr-error" role="alert">{error}</p>}
      {loading && (
        <p className="rr-loading">
          <IonSpinner name="dots" />
          공고와 문서를 비교하고 있어요. 1분 정도 걸릴 수 있어요.
        </p>
      )}

      {review && <ReviewResultView review={review} />}
    </div>
  );
};

const ReviewResultView: React.FC<{ review: ReviewResult }> = ({ review }) => {
  const heading = [review.company, review.jobTitle].filter(Boolean).join(' · ');
  return (
    <div className="rr-result">
      {heading && <h3 className="rr-result-title">{heading}</h3>}
      <p className="rr-notice">
        AI 가 제안한 고침이에요. 실제와 다르게 바뀐 곳은 그대로 쓰지 말고 고쳐 주세요.
        <strong> [직접 입력: …]</strong> 자리는 직접 확인해서 채워야 해요.
      </p>

      {review.fit.length > 0 && (
        <section className="rr-card">
          <h4>공고 요구사항과 내 문서</h4>
          <ul className="rr-fit-list">
            {review.fit.map((fit) => (
              <li key={fit.requirement} className="rr-fit">
                <span className={`rr-badge rr-badge--${fit.status.toLowerCase()}`}>{FIT_LABEL[fit.status]}</span>
                <div>
                  <p className="rr-fit-req">{fit.requirement}</p>
                  {fit.evidence && <p className="rr-fit-evidence">{fit.evidence}</p>}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {review.documents.map((doc) => (
        <DocumentView key={doc.fileName} doc={doc} />
      ))}

      {review.suggestions.length > 0 && (
        <section className="rr-card">
          <h4>직접 보강하면 좋은 것</h4>
          <p className="rr-hint">문서에 근거가 없어 AI 가 대신 써 넣지 않은 것들이에요.</p>
          <ul className="rr-suggestions">
            {review.suggestions.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
};

const DocumentView: React.FC<{ doc: ReviewDocument }> = ({ doc }) => {
  const [view, setView] = useState<'revised' | 'original'>('revised');
  const [copied, setCopied] = useState(false);
  const applied = doc.changes.filter((c) => c.applied);
  const notApplied = doc.changes.filter((c) => !c.applied);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(doc.revisedText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // 클립보드 권한이 없으면 다운로드로 받으면 된다.
    }
  };

  return (
    <section className="rr-card">
      <div className="rr-doc-head">
        <h4 className="rr-doc-name">{doc.fileName}</h4>
        <span className="rr-doc-count">바꾼 곳 {applied.length}개</span>
      </div>
      {doc.summary && <p className="rr-doc-summary">{doc.summary}</p>}

      {doc.changes.length === 0 ? (
        <p className="rr-hint">이 문서는 공고에 맞춰 고칠 곳을 찾지 못했어요.</p>
      ) : (
        <ol className="rr-changes">
          {[...applied, ...notApplied].map((change, index) => (
            <li key={`${index}-${change.before}`} className={`rr-change${change.applied ? '' : ' is-pending'}`}>
              <div className="rr-change-head">
                <span className="rr-change-no">{index + 1}</span>
                {change.section && <span className="rr-change-section">{change.section}</span>}
                <span className="rr-change-type">{change.type === 'INSERT' ? '추가' : '수정'}</span>
                {!change.applied && <span className="rr-badge rr-badge--partial">원문에서 못 찾아 제안만</span>}
              </div>
              {change.type === 'REPLACE' && change.before && (
                <p className="rr-diff rr-diff--before">
                  <span className="rr-diff-mark" aria-hidden="true">−</span>
                  <del>{change.before}</del>
                </p>
              )}
              {change.type === 'INSERT' && change.before && (
                <p className="rr-diff rr-diff--anchor">“{change.before}” 다음 줄에</p>
              )}
              <p className="rr-diff rr-diff--after">
                <span className="rr-diff-mark" aria-hidden="true">+</span>
                <ins>{change.after}</ins>
              </p>
              {change.reason && <p className="rr-change-reason">왜: {change.reason}</p>}
            </li>
          ))}
        </ol>
      )}

      <div className="rr-doc-toolbar">
        <div className="rr-segment rr-segment--small" role="radiogroup" aria-label="본문 보기">
          {(
            [
              ['revised', '고친 글'],
              ['original', '원문'],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={view === value}
              className={`rr-segment-option${view === value ? ' is-selected' : ''}`}
              onClick={() => setView(value)}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="rr-doc-actions">
          <IonButton fill="clear" size="small" onClick={copy}>
            <IonIcon slot="start" icon={copyOutline} />
            {copied ? '복사됨' : '고친 글 복사'}
          </IonButton>
          <IonButton fill="clear" size="small" onClick={() => download(revisedFileName(doc.fileName), doc.revisedText)}>
            <IonIcon slot="start" icon={downloadOutline} />
            내려받기
          </IonButton>
        </div>
      </div>
      <pre className="rr-doc-text">{view === 'revised' ? doc.revisedText : doc.originalText}</pre>
    </section>
  );
};

export default ResumeReview;
