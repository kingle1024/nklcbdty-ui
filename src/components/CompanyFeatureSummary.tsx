import React, { useState } from 'react';
import { FeatureEvidence, WorkStyleCompany, highlightSegments } from '../common/companyFeatureApi';
import './CompanyFeatureSummary.css';

/** 근거 발췌. 매칭된 키워드를 강조하고, 원문 공고로 가는 링크를 단다. */
const EvidenceLine: React.FC<{ evidence: FeatureEvidence }> = ({ evidence }) => (
  <li className="company-feature__evidence">
    <p className="company-feature__snippet">
      “
      {highlightSegments(evidence.snippet, evidence.matchedKeyword).map((seg, i) =>
        seg.hit ? <mark key={i}>{seg.text}</mark> : <React.Fragment key={i}>{seg.text}</React.Fragment>,
      )}
      ”
    </p>
    {evidence.jobDetailLink ? (
      <a href={evidence.jobDetailLink} target="_blank" rel="noopener noreferrer">
        {evidence.sysCompanyNm ? `[${evidence.sysCompanyNm}] ` : ''}
        {evidence.annoSubject ?? '공고 보기'}
      </a>
    ) : (
      <span>{evidence.annoSubject}</span>
    )}
  </li>
);

interface CompanyFeatureSummaryProps {
  company: WorkStyleCompany;
  /** 필터에서 고른 복지 코드. 해당 태그를 강조한다. */
  selectedWelfare: string[];
}

/**
 * 메인 공고 목록 위에 붙는 회사 요약. "재택근무 회사만" 필터를 켰을 때 선택한 회사의
 * 근무형태·복지와, 공고 어디서 찾았는지(근거)를 보여 준다.
 */
const CompanyFeatureSummary: React.FC<CompanyFeatureSummaryProps> = ({ company, selectedWelfare }) => {
  const [open, setOpen] = useState(false);

  return (
    <section className="company-feature" aria-label={`${company.companyNm} 근무형태·복지`}>
      <div className="company-feature__head">
        {company.workStyleLabel && <span className="company-feature__badge">{company.workStyleLabel}</span>}
        <span className="company-feature__count">공고 {company.postingCount}건에서 확인</span>
        <button type="button" className="company-feature__toggle" onClick={() => setOpen((v) => !v)}>
          {open ? '근거 접기' : '어디서 찾았나요?'}
        </button>
      </div>

      <div className="company-feature__welfares">
        {company.welfares.length === 0 ? (
          <span className="company-feature__muted">공고에서 찾은 복지 정보가 아직 없어요</span>
        ) : (
          company.welfares.map((w) => (
            <span
              key={w.code}
              className={`company-feature__tag${selectedWelfare.includes(w.code) ? ' is-selected' : ''}`}
            >
              {w.name}
            </span>
          ))
        )}
      </div>

      {open && (
        <div className="company-feature__details">
          {company.workStyleLabel && (
            <>
              <h3>{company.workStyleLabel}</h3>
              <ul>
                {company.evidences.map((e) => (
                  <EvidenceLine key={`ws-${e.jobId}`} evidence={e} />
                ))}
              </ul>
            </>
          )}
          {company.welfares.map((w) => (
            <React.Fragment key={w.code}>
              <h3>{w.name}</h3>
              <ul>
                {w.evidences.map((e) => (
                  <EvidenceLine key={`${w.code}-${e.jobId}`} evidence={e} />
                ))}
              </ul>
            </React.Fragment>
          ))}
          <p className="company-feature__note">
            공고 문구를 자동으로 찾은 결과라 실제와 다를 수 있어요. 정확한 조건은 각 공고에서 확인해 주세요.
          </p>
        </div>
      )}
    </section>
  );
};

export default CompanyFeatureSummary;
