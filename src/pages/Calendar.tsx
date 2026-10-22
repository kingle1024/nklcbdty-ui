import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { IonButton, IonContent, IonFooter, IonIcon, IonModal, IonPage, IonSearchbar, IonSpinner, IonText, IonToolbar } from '@ionic/react';
import { closeOutline } from 'ionicons/icons';
import { Helmet } from 'react-helmet';
import API_URL from '../config';
import { cachedGet } from '../common/kvCache';
import CommonHeader from '../common/CommonHeader';
import useIsMobile from '../common/useIsMobile';
import { COMPANY_COLORS, COMPANY_NAMES } from '../common/companies';
import './Calendar.css';

interface CalendarJob {
  id: number | null;
  annoId: string;
  companyCd: string;
  companyNm: string;
  annoSubject: string;
  subJobCdNm: string | null;
  empTypeCdNm: string | null;
  workplace: string | null;
  jobDetailLink: string;
  endDate: string;
  endTime: string | null;
}

interface CalendarDay {
  date: string;
  dayOfWeek: number;
  count: number;
  jobs: CalendarJob[];
}

interface CalendarMonth {
  year: number;
  month: number;
  firstDayOfWeek: number;
  lengthOfMonth: number;
  totalCount: number;
  days: CalendarDay[];
}

interface TargetMonth {
  year: number;
  month: number;
}

/** 상단 필터 상태. 회사만 서버 조회 조건이고, 나머지는 받아 온 그 달 안에서 걸러낸다. */
interface CalendarFilters {
  keyword: string;
  subJob: string;
  empType: string;
  status: JobStatus;
}

/** 진행여부. OPEN = 아직 마감 전, CLOSED = 이미 마감. */
type JobStatus = 'ALL' | 'OPEN' | 'CLOSED';

const STATUS_LABELS: { value: JobStatus; label: string }[] = [
  { value: 'ALL', label: '전체' },
  { value: 'OPEN', label: '진행 중' },
  { value: 'CLOSED', label: '마감' },
];

const EMPTY_FILTERS: CalendarFilters = { keyword: '', subJob: '', empType: '', status: 'ALL' };

/** 달력은 월요일 시작. 서버의 dayOfWeek(1=월 ~ 7=일)와 인덱스를 맞춘다. */
const WEEKDAYS = ['월', '화', '수', '목', '금', '토', '일'];

/** PC 셀에 미리 보여줄 공고 수. 넘치면 "+N건" 으로 접는다. */
const MAX_CHIPS_PER_CELL = 3;

const pad = (value: number) => String(value).padStart(2, '0');

const toDateKey = (year: number, month: number, day: number) => `${year}-${pad(month)}-${pad(day)}`;

const thisMonth = (): TargetMonth => {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
};

const todayKey = () => {
  const now = new Date();
  return toDateKey(now.getFullYear(), now.getMonth() + 1, now.getDate());
};

const shiftMonth = ({ year, month }: TargetMonth, delta: number): TargetMonth => {
  // Date 가 연 넘어감(12월 → 1월)을 알아서 처리한다.
  const shifted = new Date(year, month - 1 + delta, 1);
  return { year: shifted.getFullYear(), month: shifted.getMonth() + 1 };
};

/**
 * "yyyy-MM-dd HH:mm:ss" 를 Date 로. 사파리는 공백으로 구분된 형식을 못 읽어 T 로 바꿔 준다.
 * 마감 여부를 서버가 아니라 여기서 판정하는 이유: 서버 응답에 "지금" 기준 값이 들어가면
 * 응답을 캐싱할 수 없다.
 */
const parseEndDate = (endDate: string): Date | null => {
  const parsed = new Date(endDate.replace(' ', 'T'));
  return isNaN(parsed.getTime()) ? null : parsed;
};

const isClosed = (job: CalendarJob, nowMs: number): boolean => {
  const end = parseEndDate(job.endDate);
  return end !== null && end.getTime() < nowMs;
};

const isFilterActive = (filters: CalendarFilters): boolean =>
  filters.keyword.trim() !== '' || filters.subJob !== '' || filters.empType !== '' || filters.status !== 'ALL';

const matchesFilters = (job: CalendarJob, filters: CalendarFilters, nowMs: number): boolean => {
  if (filters.subJob && job.subJobCdNm !== filters.subJob) return false;
  if (filters.empType && job.empTypeCdNm !== filters.empType) return false;
  if (filters.status !== 'ALL' && isClosed(job, nowMs) !== (filters.status === 'CLOSED')) return false;

  const keyword = filters.keyword.trim().toLowerCase();
  if (!keyword) return true;
  return [job.annoSubject, job.companyNm, job.subJobCdNm, job.workplace]
    .some((field) => field != null && field.toLowerCase().includes(keyword));
};

/**
 * 필터를 통과한 공고만 남긴 달. 건수(day.count, totalCount)도 남은 공고 기준으로 다시 센다.
 * 서버 조회 없이 받아 온 달 안에서만 걸러내므로 드롭다운을 바꿔도 화면이 바로 반응한다.
 */
const applyFilters = (month: CalendarMonth, filters: CalendarFilters, nowMs: number): CalendarMonth => {
  if (!isFilterActive(filters)) {
    return month;
  }
  const days = month.days
    .map((day) => {
      const jobs = day.jobs.filter((job) => matchesFilters(job, filters, nowMs));
      return { ...day, jobs, count: jobs.length };
    })
    .filter((day) => day.count > 0);

  return { ...month, days, totalCount: days.reduce((sum, day) => sum + day.count, 0) };
};

/**
 * 드롭다운에 채울 값 목록. 그 달에 실제로 있는 값만 뽑는다.
 * 고른 값이 이번 달에 없어도 목록에 남겨 둔다 — 달을 넘길 때마다 선택이 풀리면
 * "프론트엔드 공고가 언제 마감되나" 를 달력으로 훑을 수가 없다.
 */
const collectOptions = (
  month: CalendarMonth | null,
  pick: (job: CalendarJob) => string | null,
  selected: string,
): string[] => {
  const values = new Set<string>();
  month?.days.forEach((day) => day.jobs.forEach((job) => {
    const value = pick(job);
    if (value) values.add(value);
  }));
  if (selected) values.add(selected);
  return Array.from(values).sort((a, b) => a.localeCompare(b, 'ko'));
};

/**
 * 처음 열었을 때 펼쳐 둘 날짜.
 * 아직 지원할 수 있는 공고가 남은 가장 이른 날을 고른다. 오늘이라도 그날 마감이 이미
 * 다 지났으면 건너뛴다. 그런 날이 없으면(지난 달 조회) 그 달 첫 마감일.
 */
const pickDefaultDate = (month: CalendarMonth, nowMs: number): string | null => {
  if (month.days.length === 0) {
    return null;
  }
  const open = month.days.find((day) => day.jobs.some((job) => !isClosed(job, nowMs)));
  return (open ?? month.days[0]).date;
};

/** 공고 클릭 로그. 목록 화면과 같은 API 를 쓴다. 실패해도 이동은 막지 않는다. */
const logJobClick = (job: CalendarJob) => {
  const url = `${API_URL}/api/log/job_history?anno_id=${job.annoId}&anno_subject=${encodeURIComponent(job.annoSubject)}`;
  axios.get(url).catch(() => undefined);
};

const Calendar: React.FC = () => {
  const isMobile = useIsMobile();
  const [target, setTarget] = useState<TargetMonth>(thisMonth);
  const [company, setCompany] = useState<string>('ALL');
  const [filters, setFilters] = useState<CalendarFilters>(EMPTY_FILTERS);
  const [data, setData] = useState<CalendarMonth | null>(null);
  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  const [loading, setLoading] = useState<boolean>(true);
  const [hasError, setHasError] = useState<boolean>(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  // 모바일은 2단 배치가 안 들어가 팝업으로 띄운다. PC 는 오른쪽 패널에 항상 붙어 있다.
  const [isDetailOpen, setIsDetailOpen] = useState<boolean>(false);

  useEffect(() => {
    // 달/회사를 빠르게 바꾸면 먼저 보낸 요청이 늦게 도착해 화면을 덮을 수 있어 취소 플래그를 둔다.
    let cancelled = false;

    const fetchCalendar = async () => {
      setLoading(true);
      setHasError(false);
      try {
        // 목록과 같은 KV 캐시를 탄다. 응답에 "지금" 기준 값이 없어 캐싱해도 안전하다.
        const month = await cachedGet<CalendarMonth>(
          `nklcb:calendar:${company}:${target.year}-${pad(target.month)}`,
          `${API_URL}/api/calendar/deadlines`,
          { year: String(target.year), month: String(target.month), company },
        );
        if (cancelled) return;
        // 마감 판정 기준 시각을 여기서 한 번만 잡는다. 렌더마다 Date.now() 를 새로 부르면
        // 아래 useMemo 들이 매 렌더 다시 돈다.
        setNowMs(Date.now());
        setData(month);
      } catch (error) {
        if (cancelled) return;
        console.error('캘린더 조회 실패:', error);
        setData(null);
        setHasError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchCalendar();
    return () => {
      cancelled = true;
    };
  }, [target, company]);

  // 화면에 그리는 건 필터를 통과한 달. 원본(data)은 "전체 N건 중" 안내와 드롭다운 목록에만 쓴다.
  const filtered = useMemo(() => (data ? applyFilters(data, filters, nowMs) : null), [data, filters, nowMs]);
  const filterActive = isFilterActive(filters);

  const subJobOptions = useMemo(
    () => collectOptions(data, (job) => job.subJobCdNm, filters.subJob),
    [data, filters.subJob],
  );
  const empTypeOptions = useMemo(
    () => collectOptions(data, (job) => job.empTypeCdNm, filters.empType),
    [data, filters.empType],
  );

  const daysByDate = useMemo(() => {
    const map = new Map<string, CalendarDay>();
    filtered?.days.forEach((day) => map.set(day.date, day));
    return map;
  }, [filtered]);

  // 달이나 필터가 바뀌어 펼쳐 둔 날짜가 사라졌으면 남은 날짜로 옮긴다.
  useEffect(() => {
    setSelectedDate((prev) => {
      if (!filtered) return null;
      if (prev && filtered.days.some((day) => day.date === prev)) return prev;
      return pickDefaultDate(filtered, nowMs);
    });
  }, [filtered, nowMs]);

  const selectedDay = selectedDate ? daysByDate.get(selectedDate) : undefined;
  const today = todayKey();

  // 빈 화면일 때 "이 달에 없는 것"과 "필터에 걸러진 것"을 구분해 준다.
  const emptyMessage = filtered && filtered.totalCount === 0
    ? (filterActive ? '필터 조건에 맞는 공고가 없습니다.' : '이 달에 마감되는 공고가 없습니다.')
    : '날짜를 선택하면 그날 마감되는 공고가 여기에 표시됩니다.';

  const handleDayClick = (dateKey: string) => {
    setSelectedDate(dateKey);
    if (isMobile) {
      setIsDetailOpen(true);
    }
  };

  const updateFilter = (patch: Partial<CalendarFilters>) => {
    setFilters((prev) => ({ ...prev, ...patch }));
  };

  const goToMonth = (delta: number) => {
    // 연속으로 빠르게 눌러도 한 달만 움직이지 않도록 이전 상태에서 계산한다.
    setTarget((prev) => shiftMonth(prev, delta));
  };

  const renderCells = (month: CalendarMonth) => {
    // 1일이 월요일이 아니면 그만큼 앞을 비운다.
    const blanks = Array.from({ length: month.firstDayOfWeek - 1 }, (_, index) => (
      <div className="calendar-cell calendar-cell--blank" key={`blank-${index}`} />
    ));

    const cells = Array.from({ length: month.lengthOfMonth }, (_, index) => {
      const dayNumber = index + 1;
      const dateKey = toDateKey(month.year, month.month, dayNumber);
      const day = daysByDate.get(dateKey);
      const dayOfWeek = ((month.firstDayOfWeek - 1 + index) % 7) + 1;

      const classNames = [
        'calendar-cell',
        day ? 'calendar-cell--has-jobs' : 'calendar-cell--empty',
        dateKey === today ? 'calendar-cell--today' : '',
        dateKey === selectedDate ? 'calendar-cell--selected' : '',
        dayOfWeek === 6 ? 'calendar-cell--saturday' : '',
        dayOfWeek === 7 ? 'calendar-cell--sunday' : '',
      ].filter(Boolean).join(' ');

      return (
        <button
          type="button"
          className={classNames}
          key={dateKey}
          disabled={!day}
          onClick={() => handleDayClick(dateKey)}
          aria-label={day ? `${month.month}월 ${dayNumber}일 마감 ${day.count}건` : `${month.month}월 ${dayNumber}일`}
        >
          <span className="calendar-cell__day">{dayNumber}</span>
          {day && (isMobile ? (
            // 그날 공고가 전부 마감이면 배지도 흐리게 — 지난 달을 봐도 진행 중처럼 보이지 않게
            <span className={`calendar-cell__count${day.jobs.every((job) => isClosed(job, nowMs)) ? ' calendar-cell__count--closed' : ''}`}>
              {day.count}
            </span>
          ) : (
            <span className="calendar-cell__chips">
              {day.jobs.slice(0, MAX_CHIPS_PER_CELL).map((job) => (
                <span
                  className={`calendar-chip${isClosed(job, nowMs) ? ' calendar-chip--closed' : ''}`}
                  key={job.id ?? `${job.companyCd}-${job.annoId}`}
                >
                  <i className="calendar-chip__dot" style={{ backgroundColor: COMPANY_COLORS[job.companyCd] || 'var(--text-muted)' }} />
                  <span className="calendar-chip__text">{job.companyNm} {job.annoSubject}</span>
                </span>
              ))}
              {day.count > MAX_CHIPS_PER_CELL && (
                <span className="calendar-chip__more">+{day.count - MAX_CHIPS_PER_CELL}건</span>
              )}
            </span>
          ))}
        </button>
      );
    });

    return [...blanks, ...cells];
  };

  const dayTitle = (day: CalendarDay) =>
    `${day.date.replace(/^\d{4}-0?(\d+)-0?(\d+)$/, '$1월 $2일')} (${WEEKDAYS[day.dayOfWeek - 1]}) 마감 ${day.count}건`;

  const renderJobs = (day: CalendarDay) => (
    <>
      {day.jobs.map((job) => {
        const closed = isClosed(job, nowMs);
        return (
          <div
            className={`calendar-job${closed ? ' calendar-job--closed' : ''}`}
            key={job.id ?? `${job.companyCd}-${job.annoId}`}
          >
            <span
              className="calendar-job__bar"
              style={{ backgroundColor: COMPANY_COLORS[job.companyCd] || 'var(--border)' }}
            />
            <div className="calendar-job__body">
              <h3 className="calendar-job__title">
                {job.annoSubject}
                {closed && <span className="calendar-badge-closed">마감</span>}
              </h3>
              <p className="calendar-job__meta">
                {job.companyNm}
                {job.subJobCdNm ? ` | ${job.subJobCdNm}` : ''}
                {job.endTime ? ` | ${job.endTime} 마감` : ''}
                {job.workplace ? ` | ${job.workplace}` : ''}
              </p>
              <a
                href={job.jobDetailLink}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => logJobClick(job)}
              >
                자세히 보기
              </a>
            </div>
          </div>
        );
      })}
    </>
  );

  return (
    <IonPage>
      <Helmet>
        <title>채용 캘린더 | 네카라쿠배당토야</title>
        <meta name="description" content="네카라쿠배당토야 채용 공고 마감일을 달력으로 한눈에. 네이버, 카카오, 라인, 쿠팡, 배달의민족, 당근마켓, 토스, 야놀자 공고 마감일 확인." />
        <meta property="og:title" content="채용 캘린더 | 네카라쿠배당토야" />
        <meta property="og:description" content="이번 달 마감되는 채용 공고를 달력으로 확인하세요." />
      </Helmet>
      <CommonHeader />
      <IonContent fullscreen>
        <div className="calendar-page">
          <div className="calendar-toolbar">
            <IonButton fill="clear" className="calendar-nav-btn" onClick={() => goToMonth(-1)} aria-label="이전 달">
              &lsaquo;
            </IonButton>
            <h1 className="calendar-title">{target.year}년 {target.month}월</h1>
            <IonButton fill="clear" className="calendar-nav-btn" onClick={() => goToMonth(1)} aria-label="다음 달">
              &rsaquo;
            </IonButton>
            <IonButton size="small" fill="outline" className="calendar-today-btn" onClick={() => setTarget(thisMonth())}>
              이번 달
            </IonButton>
          </div>

          {/* 상단 필터. 회사만 서버에 넘기고(달마다 캐시된다) 나머지는 받아 온 달 안에서 걸러낸다. */}
          <section className="calendar-filters" aria-label="공고 필터">
            <div className="calendar-company-filter">
              {Object.keys(COMPANY_NAMES).map((companyCd) => (
                <IonButton
                  key={companyCd}
                  onClick={() => setCompany(companyCd)}
                  color={company === companyCd ? 'primary' : 'medium'}
                >
                  {COMPANY_NAMES[companyCd]}
                </IonButton>
              ))}
            </div>

            <div className="calendar-filters__row">
              <IonSearchbar
                className="calendar-filters__search"
                value={filters.keyword}
                onIonInput={(e) => updateFilter({ keyword: e.detail.value || '' })}
                placeholder="공고명, 직무, 근무지 검색"
                debounce={0}
              />

              <label className="calendar-select">
                <span className="calendar-select__label">직무</span>
                <select
                  value={filters.subJob}
                  onChange={(e) => updateFilter({ subJob: e.target.value })}
                  disabled={subJobOptions.length === 0}
                >
                  <option value="">전체</option>
                  {subJobOptions.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </label>

              <label className="calendar-select">
                <span className="calendar-select__label">채용형태</span>
                <select
                  value={filters.empType}
                  onChange={(e) => updateFilter({ empType: e.target.value })}
                  disabled={empTypeOptions.length === 0}
                >
                  <option value="">전체</option>
                  {empTypeOptions.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </label>

              <label className="calendar-select">
                <span className="calendar-select__label">진행여부</span>
                <select
                  value={filters.status}
                  onChange={(e) => updateFilter({ status: e.target.value as JobStatus })}
                >
                  {STATUS_LABELS.map(({ value, label }) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </label>

              <IonButton
                size="small"
                fill="clear"
                className="calendar-filters__reset"
                disabled={!filterActive}
                onClick={() => setFilters(EMPTY_FILTERS)}
              >
                필터 초기화
              </IonButton>
            </div>
          </section>

          {loading && (
            <div className="calendar-status">
              <IonSpinner name="crescent" />
            </div>
          )}

          {!loading && hasError && (
            <div className="calendar-status">
              캘린더를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.
            </div>
          )}

          {!loading && !hasError && data && filtered && (
            <>
              <p className="calendar-summary">
                {filtered.month}월에 마감되는 공고 <strong>{filtered.totalCount}건</strong>
                {filterActive && <span className="calendar-summary__total">(필터 없이 {data.totalCount}건)</span>}
                <span className="calendar-summary__note">상시채용(영입종료시) 공고는 마감일이 없어 캘린더에 표시되지 않습니다.</span>
              </p>

              {/* PC: 왼쪽 달력 · 오른쪽 공고. 모바일: 달력만 두고 날짜를 누르면 팝업. */}
              <div className="calendar-layout">
                <div className="calendar-grid">
                  {WEEKDAYS.map((label, index) => (
                    <div
                      className={`calendar-weekday${index === 5 ? ' calendar-weekday--saturday' : ''}${index === 6 ? ' calendar-weekday--sunday' : ''}`}
                      key={label}
                    >
                      {label}
                    </div>
                  ))}
                  {renderCells(filtered)}
                </div>

                {!isMobile && (
                  <aside className="calendar-detail">
                    {selectedDay ? (
                      <>
                        <h2 className="calendar-detail__title">{dayTitle(selectedDay)}</h2>
                        {renderJobs(selectedDay)}
                      </>
                    ) : (
                      <p className="calendar-detail__placeholder">{emptyMessage}</p>
                    )}
                  </aside>
                )}
              </div>

              {isMobile && filtered.totalCount === 0 && (
                <div className="calendar-status">{emptyMessage}</div>
              )}
            </>
          )}
        </div>
      </IonContent>

      {/* 모바일 전용 팝업. 날짜를 누르면 그날 공고가 시트로 올라온다. */}
      <IonModal
        isOpen={isMobile && isDetailOpen && !!selectedDay}
        onDidDismiss={() => setIsDetailOpen(false)}
        className="calendar-modal"
        initialBreakpoint={0.75}
        breakpoints={[0, 0.75, 1]}
      >
        {selectedDay && (
          <div className="calendar-modal__body">
            <header className="calendar-modal__header">
              <h2>{dayTitle(selectedDay)}</h2>
              <IonButton fill="clear" size="small" aria-label="닫기" onClick={() => setIsDetailOpen(false)}>
                <IonIcon slot="icon-only" icon={closeOutline} />
              </IonButton>
            </header>
            {renderJobs(selectedDay)}
          </div>
        )}
      </IonModal>

      <IonFooter>
        <IonToolbar>
          <IonText className="footer-text">
            &copy; 2025 네카라쿠배당토야.
          </IonText>
        </IonToolbar>
      </IonFooter>
    </IonPage>
  );
};

export default Calendar;
