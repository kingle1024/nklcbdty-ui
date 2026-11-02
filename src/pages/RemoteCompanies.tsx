import React, { useEffect, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { IonContent, IonPage, IonSpinner } from '@ionic/react';
import { Helmet } from 'react-helmet';
import CommonHeader from '../common/CommonHeader';
import { COMPANY_COLORS } from '../common/companies';
import {
  FeatureEvidence,
  WelfareCategory,
  WorkStyleCompany,
  fetchActiveWelfareCategories,
  fetchWorkStyleCompanies,
  highlightSegments,
  parseWelfareQuery,
  toWelfareQuery,
} from '../common/companyFeatureApi';
import './RemoteCompanies.css';

/** 지금은 재택만. 유연근무제(FLEXIBLE) 등이 생기면 같은 화면을 근무형태 코드만 바꿔 쓴다. */
const WORK_STYLE = 'REMOTE';

/** 근거 발췌. 매칭된 키워드를 강조하고, 원문 공고로 가는 링크를 단다. */
const EvidenceLine: React.FC<{ evidence: FeatureEvidence }> = ({ evidence }) => (
  <li className="remote-companies__evidence">
    <p className="remote-companies__snippet">
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

const CompanyCard: React.FC<{ company: WorkStyleCompany; selected: string[] }> = ({ company, selected }) => {
  const [open, setOpen] = useState(false);
  const color = COMPANY_COLORS[company.companyCd] || '#c4c4c4';

  return (
    <article className="remote-companies__card">
      <header className="remote-companies__card-head">
        <span className="remote-companies__dot" style={{ background: color }} />
        <h2>{company.companyNm}</h2>
        <span className="remote-companies__badge">{company.workStyleLabel}</span>
        <span className="remote-companies__count">근거 공고 {company.postingCount}건</span>
      </header>

      <div className="remote-companies__welfares">
        {company.welfares.length === 0 ? (
          <span className="remote-companies__muted">공고에서 찾은 복지 정보가 아직 없어요</span>
        ) : (
          company.welfares.map((w) => (
            <span
              key={w.code}
              className={`remote-companies__tag${selected.includes(w.code) ? ' is-selected' : ''}`}
            >
              {w.name}
            </span>
          ))
        )}
      </div>

      <button type="button" className="remote-companies__toggle" onClick={() => setOpen((v) => !v)}>
        {open ? '근거 접기' : '어디서 찾았나요?'}
      </button>

      {open && (
        <div className="remote-companies__details">
          <h3>{company.workStyleLabel}</h3>
          <ul>
            {company.evidences.map((e) => (
              <EvidenceLine key={`ws-${e.jobId}`} evidence={e} />
            ))}
          </ul>
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
          {company.careerPageUrl && (
            <a className="remote-companies__career" href={company.careerPageUrl} target="_blank" rel="noopener noreferrer">
              {company.companyNm} 채용 페이지로 가기 →
            </a>
          )}
        </div>
      )}
    </article>
  );
};

const RemoteCompanies: React.FC = () => {
  const history = useHistory();
  const location = useLocation();
  const selected = parseWelfareQuery(location.search);
  const selectedKey = selected.join(',');

  const [categories, setCategories] = useState<WelfareCategory[]>([]);
  const [companies, setCompanies] = useState<WorkStyleCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    fetchActiveWelfareCategories()
      .then(setCategories)
      .catch((e) => console.error('복지 카테고리 조회 실패:', e));
  }, []);

  useEffect(() => {
    // 필터를 빠르게 바꾸면 늦게 온 이전 응답이 화면을 덮지 않게
    let cancelled = false;
    setLoading(true);
    setHasError(false);
    fetchWorkStyleCompanies(WORK_STYLE, selectedKey ? selectedKey.split(',') : [])
      .then((list) => {
        if (!cancelled) setCompanies(list);
      })
      .catch((e) => {
        if (cancelled) return;
        console.error('재택 회사 조회 실패:', e);
        setCompanies([]);
        setHasError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedKey]);

  // 필터는 URL 에 둔다 — 새로고침·링크 공유 시에도 같은 필터로 열린다
  const toggle = (code: string) => {
    const next = selected.includes(code) ? selected.filter((c) => c !== code) : [...selected, code];
    history.replace(`${location.pathname}${toWelfareQuery(next)}`);
  };

  return (
    <IonPage>
      <Helmet>
        <title>재택근무 회사 모아보기 - 네카라쿠배당토야</title>
        <meta name="description" content="채용공고에서 재택근무가 확인된 회사와 복지를 모아 봅니다." />
      </Helmet>
      <CommonHeader />
      <IonContent>
        <div className="remote-companies">
          <h1>재택근무 회사 모아보기</h1>
          <p className="remote-companies__desc">
            열려 있는 채용공고 본문에서 재택·원격 근무 문구를 찾아 모았어요. 복지를 고르면 고른 복지를
            모두 가진 회사만 보여요.
          </p>

          <div className="remote-companies__filters" role="group" aria-label="복지 필터">
            <button
              type="button"
              className={`remote-companies__chip${selected.length === 0 ? ' is-active' : ''}`}
              onClick={() => history.replace(location.pathname)}
            >
              전체
            </button>
            {categories.map((c) => (
              <button
                key={c.code}
                type="button"
                aria-pressed={selected.includes(c.code)}
                className={`remote-companies__chip${selected.includes(c.code) ? ' is-active' : ''}`}
                onClick={() => toggle(c.code)}
              >
                {c.name}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="remote-companies__center"><IonSpinner /></div>
          ) : hasError ? (
            <p className="remote-companies__center">목록을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.</p>
          ) : companies.length === 0 ? (
            <p className="remote-companies__center">
              {selected.length ? '고른 복지를 모두 가진 재택 회사가 없어요.' : '아직 재택근무가 확인된 회사가 없어요.'}
            </p>
          ) : (
            <div className="remote-companies__list">
              {companies.map((company) => (
                <CompanyCard key={company.companyCd} company={company} selected={selected} />
              ))}
            </div>
          )}
          <p className="remote-companies__note">
            공고 문구를 자동으로 찾은 결과라 실제와 다를 수 있어요. 정확한 조건은 각 공고에서 확인해 주세요.
          </p>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default RemoteCompanies;
