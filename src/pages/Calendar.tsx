import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { IonButton, IonContent, IonFooter, IonPage, IonSpinner, IonText, IonToolbar } from '@ionic/react';
import { Helmet } from 'react-helmet';
import API_URL from '../config';
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
  closed: boolean;
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
 * 처음 열었을 때 펼쳐 둘 날짜.
 * 아직 지원할 수 있는 가장 가까운 마감일을 고르고, 그런 날이 없으면(지난 달 조회) 그 달 첫 마감일.
 * ISO 문자열(yyyy-MM-dd)은 사전순 비교가 날짜순 비교와 같다.
 */
const pickDefaultDate = (month: CalendarMonth): string | null => {
  if (month.days.length === 0) {
    return null;
  }
  const today = todayKey();
  const upcoming = month.days.find((day) => day.date >= today);
  return (upcoming ?? month.days[0]).date;
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
  const [data, setData] = useState<CalendarMonth | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [hasError, setHasError] = useState<boolean>(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  useEffect(() => {
    // 달/회사를 빠르게 바꾸면 먼저 보낸 요청이 늦게 도착해 화면을 덮을 수 있어 취소 플래그를 둔다.
    let cancelled = false;

    const fetchCalendar = async () => {
      setLoading(true);
      setHasError(false);
      try {
        // 마감 여부(closed)는 시시각각 바뀌므로 KV 캐시를 타지 않고 원본 API 에서 받는다.
        const response = await axios.get<CalendarMonth>(`${API_URL}/api/calendar/deadlines`, {
          params: { year: target.year, month: target.month, company },
        });
        if (cancelled) return;
        setData(response.data);
        setSelectedDate(pickDefaultDate(response.data));
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

  const daysByDate = useMemo(() => {
    const map = new Map<string, CalendarDay>();
    data?.days.forEach((day) => map.set(day.date, day));
    return map;
  }, [data]);

  const selectedDay = selectedDate ? daysByDate.get(selectedDate) : undefined;
  const today = todayKey();

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
          onClick={() => setSelectedDate(dateKey)}
          aria-label={day ? `${month.month}월 ${dayNumber}일 마감 ${day.count}건` : `${month.month}월 ${dayNumber}일`}
        >
          <span className="calendar-cell__day">{dayNumber}</span>
          {day && (isMobile ? (
            <span className="calendar-cell__count">{day.count}</span>
          ) : (
            <span className="calendar-cell__chips">
              {day.jobs.slice(0, MAX_CHIPS_PER_CELL).map((job) => (
                <span
                  className={`calendar-chip${job.closed ? ' calendar-chip--closed' : ''}`}
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
            {/* 연속으로 빠르게 눌러도 한 달만 움직이지 않도록 이전 상태에서 계산한다 */}
            <IonButton fill="clear" className="calendar-nav-btn" onClick={() => setTarget((prev) => shiftMonth(prev, -1))} aria-label="이전 달">
              &lsaquo;
            </IonButton>
            <h1 className="calendar-title">{target.year}년 {target.month}월</h1>
            <IonButton fill="clear" className="calendar-nav-btn" onClick={() => setTarget((prev) => shiftMonth(prev, 1))} aria-label="다음 달">
              &rsaquo;
            </IonButton>
            <IonButton size="small" fill="outline" className="calendar-today-btn" onClick={() => setTarget(thisMonth())}>
              이번 달
            </IonButton>
          </div>

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

          {!loading && !hasError && data && (
            <>
              <p className="calendar-summary">
                {data.month}월에 마감되는 공고 <strong>{data.totalCount}건</strong>
                <span className="calendar-summary__note">상시채용(영입종료시) 공고는 마감일이 없어 캘린더에 표시되지 않습니다.</span>
              </p>

              <div className="calendar-grid">
                {WEEKDAYS.map((label, index) => (
                  <div
                    className={`calendar-weekday${index === 5 ? ' calendar-weekday--saturday' : ''}${index === 6 ? ' calendar-weekday--sunday' : ''}`}
                    key={label}
                  >
                    {label}
                  </div>
                ))}
                {renderCells(data)}
              </div>

              {selectedDay ? (
                <section className="calendar-detail">
                  <h2 className="calendar-detail__title">
                    {selectedDay.date.replace(/^\d{4}-0?(\d+)-0?(\d+)$/, '$1월 $2일')} ({WEEKDAYS[selectedDay.dayOfWeek - 1]}) 마감 {selectedDay.count}건
                  </h2>
                  {selectedDay.jobs.map((job) => (
                    <div className="calendar-job" key={job.id ?? `${job.companyCd}-${job.annoId}`}>
                      <span
                        className="calendar-job__bar"
                        style={{ backgroundColor: COMPANY_COLORS[job.companyCd] || 'var(--border)' }}
                      />
                      <div className="calendar-job__body">
                        <h3 className="calendar-job__title">
                          {job.annoSubject}
                          {job.closed && <span className="calendar-badge-closed">마감</span>}
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
                  ))}
                </section>
              ) : (
                <div className="calendar-status">
                  {data.totalCount === 0
                    ? '이 달에 마감되는 공고가 없습니다.'
                    : '날짜를 선택하면 그날 마감되는 공고를 볼 수 있습니다.'}
                </div>
              )}
            </>
          )}
        </div>
      </IonContent>
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
