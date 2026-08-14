import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import {
  IonAlert,
  IonButton,
  IonContent,
  IonIcon,
  IonModal,
  IonPage,
  IonSpinner,
} from '@ionic/react';
import { closeOutline } from 'ionicons/icons';
import { Helmet } from 'react-helmet';
import CommonHeader from '../common/CommonHeader';
import Sidebar from '../common/Sidebar';
import LoginModal from '../components/LoginModal';
import { useAuth } from '../common/AuthContextType';
import useIsMobile from '../common/useIsMobile';
import {
  MyCalendarDay,
  MyCalendarEntry,
  MyCalendarMonth,
  createMyCalendarEntry,
  deleteMyCalendarEntry,
  fetchMyCalendarMonth,
  guessCompanyName,
  updateMyCalendarEntry,
} from '../common/myCalendarApi';
import './MyCalendar.css';

/** 달력은 월요일 시작. 서버의 dayOfWeek(1=월 ~ 7=일)와 인덱스를 맞춘다. */
const WEEKDAYS = ['월', '화', '수', '목', '금', '토', '일'];

/** PC 셀에 미리 보여줄 일정 수. 넘치면 "+N건" 으로 접는다. */
const MAX_CHIPS_PER_CELL = 3;

interface TargetMonth {
  year: number;
  month: number;
}

/** 작성 중인 일정. id 가 없으면 새 일정이다. */
interface EntryForm {
  id: number | null;
  applyDate: string;
  companyName: string;
  url: string;
  memo: string;
}

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

const formatDateLabel = (dateKey: string) => {
  const [year, month, day] = dateKey.split('-').map(Number);
  const dayOfWeek = new Date(year, month - 1, day).getDay(); // 0=일
  return `${month}월 ${day}일 (${WEEKDAYS[(dayOfWeek + 6) % 7]})`;
};

const emptyForm = (applyDate: string): EntryForm => ({
  id: null,
  applyDate,
  companyName: '',
  url: '',
  memo: '',
});

const toForm = (entry: MyCalendarEntry): EntryForm => ({
  id: entry.id,
  applyDate: entry.applyDate,
  companyName: entry.companyName,
  url: entry.url ?? '',
  memo: entry.memo ?? '',
});

const MyCalendar: React.FC = () => {
  const history = useHistory();
  const isMobile = useIsMobile();
  const { isLoggedIn } = useAuth();

  const [target, setTarget] = useState<TargetMonth>(thisMonth);
  const [data, setData] = useState<MyCalendarMonth | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(todayKey);
  // 모바일은 2단 배치가 안 들어가 그날 일정을 팝업으로 띄운다. PC 는 오른쪽 패널에 항상 붙어 있다.
  const [isDayOpen, setIsDayOpen] = useState<boolean>(false);

  const [form, setForm] = useState<EntryForm | null>(null);
  const [saving, setSaving] = useState<boolean>(false);
  const [guessing, setGuessing] = useState<boolean>(false);
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);
  const [showLoginModal, setShowLoginModal] = useState<boolean>(false);

  const load = useCallback(async () => {
    if (!isLoggedIn) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      setData(await fetchMyCalendarMonth(target.year, target.month));
    } catch (error) {
      setData(null);
      setErrorMessage(error instanceof Error ? error.message : '캘린더를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, [target, isLoggedIn]);

  useEffect(() => {
    load();
  }, [load]);

  const daysByDate = useMemo(() => {
    const map = new Map<string, MyCalendarDay>();
    data?.days.forEach((day) => map.set(day.date, day));
    return map;
  }, [data]);

  const selectedDay = daysByDate.get(selectedDate);
  const today = todayKey();

  const handleDayClick = (dateKey: string) => {
    setSelectedDate(dateKey);
    if (isMobile) {
      setIsDayOpen(true);
    }
  };

  const goToMonth = (delta: number) => {
    // 연속으로 빠르게 눌러도 한 달만 움직이지 않도록 이전 상태에서 계산한다.
    setTarget((prev) => shiftMonth(prev, delta));
  };

  const handleLoginClick = () => {
    if (isMobile) {
      history.push('/login');
    } else {
      setShowLoginModal(true);
    }
  };

  /**
   * URL 을 다 적고 넘어갈 때 회사명을 대신 채워 준다.
   * 이미 적어 둔 회사명은 건드리지 않는다 — 추측이 사용자가 쓴 값을 덮으면 안 된다.
   */
  const handleUrlBlur = async () => {
    if (!form || !form.url.trim() || form.companyName.trim()) {
      return;
    }
    setGuessing(true);
    try {
      const guessed = await guessCompanyName(form.url.trim());
      // 추측하는 동안 사용자가 직접 적었을 수 있다. 그때는 사용자 값을 남긴다.
      setForm((prev) =>
        prev && guessed && !prev.companyName.trim() ? { ...prev, companyName: guessed } : prev,
      );
    } finally {
      setGuessing(false);
    }
  };

  const handleSave = async () => {
    if (!form) {
      return;
    }
    if (!form.companyName.trim()) {
      setErrorMessage('회사명을 입력해 주세요.');
      return;
    }
    setSaving(true);
    try {
      const input = {
        applyDate: form.applyDate,
        companyName: form.companyName.trim(),
        url: form.url.trim(),
        memo: form.memo.trim(),
      };
      if (form.id === null) {
        await createMyCalendarEntry(input);
      } else {
        await updateMyCalendarEntry(form.id, input);
      }
      // 날짜를 옮겼을 수 있으니 저장한 날로 선택을 맞춘 뒤 다시 읽는다.
      setSelectedDate(form.applyDate);
      setForm(null);
      await load();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '일정을 저장하지 못했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteMyCalendarEntry(id);
      await load();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '일정을 삭제하지 못했습니다.');
    }
  };

  const renderCells = (month: MyCalendarMonth) => {
    // 1일이 월요일이 아니면 그만큼 앞을 비운다.
    const blanks = Array.from({ length: month.firstDayOfWeek - 1 }, (_, index) => (
      <div className="mycal-cell mycal-cell--blank" key={`blank-${index}`} />
    ));

    const cells = Array.from({ length: month.lengthOfMonth }, (_, index) => {
      const dayNumber = index + 1;
      const dateKey = toDateKey(month.year, month.month, dayNumber);
      const day = daysByDate.get(dateKey);
      const dayOfWeek = ((month.firstDayOfWeek - 1 + index) % 7) + 1;

      const classNames = [
        'mycal-cell',
        dateKey === today ? 'mycal-cell--today' : '',
        dateKey === selectedDate ? 'mycal-cell--selected' : '',
        dayOfWeek === 6 ? 'mycal-cell--saturday' : '',
        dayOfWeek === 7 ? 'mycal-cell--sunday' : '',
      ].filter(Boolean).join(' ');

      return (
        <button
          type="button"
          className={classNames}
          key={dateKey}
          onClick={() => handleDayClick(dateKey)}
          aria-label={
            day
              ? `${month.month}월 ${dayNumber}일 일정 ${day.count}건`
              : `${month.month}월 ${dayNumber}일 일정 추가`
          }
        >
          <span className="mycal-cell__day">{dayNumber}</span>
          {day && (isMobile ? (
            <span className="mycal-cell__count">{day.count}</span>
          ) : (
            <span className="mycal-cell__chips">
              {day.entries.slice(0, MAX_CHIPS_PER_CELL).map((entry) => (
                <span className="mycal-chip" key={entry.id}>
                  <span className="mycal-chip__text">{entry.companyName}</span>
                </span>
              ))}
              {day.count > MAX_CHIPS_PER_CELL && (
                <span className="mycal-chip__more">+{day.count - MAX_CHIPS_PER_CELL}건</span>
              )}
            </span>
          ))}
        </button>
      );
    });

    return [...blanks, ...cells];
  };

  const renderDayEntries = (day: MyCalendarDay | undefined) => (
    <>
      {(day?.entries ?? []).map((entry) => (
        <div className="mycal-entry" key={entry.id}>
          <div className="mycal-entry__body">
            <h3 className="mycal-entry__company">{entry.companyName}</h3>
            {entry.url && (
              <a
                className="mycal-entry__link"
                href={entry.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                공고 열기
              </a>
            )}
            {entry.memo && <p className="mycal-entry__memo">{entry.memo}</p>}
          </div>
          <div className="mycal-entry__actions">
            <IonButton size="small" fill="clear" onClick={() => setForm(toForm(entry))}>
              수정
            </IonButton>
            <IonButton size="small" fill="clear" color="danger" onClick={() => setDeleteTargetId(entry.id)}>
              삭제
            </IonButton>
          </div>
        </div>
      ))}
      {(day?.entries.length ?? 0) === 0 && (
        <p className="mycal-detail__placeholder">
          이 날에 적어 둔 일정이 없습니다.<br />
          지원할 회사를 추가해 보세요.
        </p>
      )}
      <IonButton
        expand="block"
        size="small"
        className="mycal-add-btn"
        onClick={() => setForm(emptyForm(selectedDate))}
      >
        + 일정 추가
      </IonButton>
    </>
  );

  const dayPanelTitle = `${formatDateLabel(selectedDate)} 일정 ${selectedDay?.count ?? 0}건`;

  const renderCalendar = () => {
    if (loading) {
      return (
        <div className="mycal-status">
          <IonSpinner name="crescent" />
        </div>
      );
    }
    if (!data) {
      return <div className="mycal-status">캘린더를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.</div>;
    }
    return (
      <>
        <p className="mycal-summary">
          {data.month}월에 적어 둔 일정 <strong>{data.totalCount}건</strong>
          <span className="mycal-summary__note">날짜를 누르면 그날 일정을 보고 추가할 수 있습니다.</span>
        </p>

        {/* PC: 왼쪽 달력 · 오른쪽 일정. 모바일: 달력만 두고 날짜를 누르면 팝업. */}
        <div className="mycal-layout">
          <div className="mycal-grid">
            {WEEKDAYS.map((label, index) => (
              <div
                className={`mycal-weekday${index === 5 ? ' mycal-weekday--saturday' : ''}${index === 6 ? ' mycal-weekday--sunday' : ''}`}
                key={label}
              >
                {label}
              </div>
            ))}
            {renderCells(data)}
          </div>

          {!isMobile && (
            <aside className="mycal-detail">
              <h2 className="mycal-detail__title">{dayPanelTitle}</h2>
              {renderDayEntries(selectedDay)}
            </aside>
          )}
        </div>
      </>
    );
  };

  return (
    <IonPage>
      <Helmet>
        <title>나의 채용 캘린더 | 네카라쿠배당토야</title>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="description" content="내가 지원할 회사를 달력에 저장해 두는 나만의 채용 캘린더" />
      </Helmet>
      <CommonHeader />
      <IonContent>
        <div className="mypage-container">
          <Sidebar activeTab="calendar" />
          <div className="content">
            <h2>나의 채용 캘린더</h2>

            {!isLoggedIn ? (
              // 개인 일정이라 로그인해야 볼 수 있다. 서버도 토큰 없이는 401 을 낸다.
              <div className="mycal-login-gate">
                <p>로그인하면 지원할 회사를 달력에 저장할 수 있습니다.</p>
                <IonButton size="small" onClick={handleLoginClick}>로그인</IonButton>
              </div>
            ) : (
              <>
                <div className="mycal-toolbar">
                  <IonButton fill="clear" className="mycal-nav-btn" onClick={() => goToMonth(-1)} aria-label="이전 달">
                    &lsaquo;
                  </IonButton>
                  <h3 className="mycal-title">{target.year}년 {target.month}월</h3>
                  <IonButton fill="clear" className="mycal-nav-btn" onClick={() => goToMonth(1)} aria-label="다음 달">
                    &rsaquo;
                  </IonButton>
                  <IonButton size="small" fill="outline" className="mycal-today-btn" onClick={() => setTarget(thisMonth())}>
                    이번 달
                  </IonButton>
                </div>

                {renderCalendar()}
              </>
            )}
          </div>
        </div>
      </IonContent>

      {/* 모바일 전용 팝업. 날짜를 누르면 그날 일정이 시트로 올라온다. */}
      <IonModal
        isOpen={isMobile && isDayOpen}
        onDidDismiss={() => setIsDayOpen(false)}
        className="mycal-modal"
        initialBreakpoint={0.75}
        breakpoints={[0, 0.75, 1]}
      >
        <div className="mycal-modal__body">
          <header className="mycal-modal__header">
            <h2>{dayPanelTitle}</h2>
            <IonButton fill="clear" size="small" aria-label="닫기" onClick={() => setIsDayOpen(false)}>
              <IonIcon slot="icon-only" icon={closeOutline} />
            </IonButton>
          </header>
          {renderDayEntries(selectedDay)}
        </div>
      </IonModal>

      {/* 등록·수정 폼. 필수값은 회사명뿐이다. */}
      <IonModal isOpen={form !== null} onDidDismiss={() => setForm(null)} className="mycal-form-modal">
        {form && (
          <div className="mycal-form">
            <header className="mycal-modal__header">
              <h2>{form.id === null ? '일정 추가' : '일정 수정'}</h2>
              <IonButton fill="clear" size="small" aria-label="닫기" onClick={() => setForm(null)}>
                <IonIcon slot="icon-only" icon={closeOutline} />
              </IonButton>
            </header>

            <label className="mycal-field">
              <span className="mycal-field__label">날짜</span>
              <input
                type="date"
                value={form.applyDate}
                onChange={(e) => setForm({ ...form, applyDate: e.target.value })}
              />
            </label>

            <label className="mycal-field">
              <span className="mycal-field__label">공고 URL</span>
              <input
                type="url"
                inputMode="url"
                value={form.url}
                placeholder="https://careers.example.com/jobs/123"
                onChange={(e) => setForm({ ...form, url: e.target.value })}
                onBlur={handleUrlBlur}
              />
              <span className="mycal-field__hint">
                {guessing ? '회사명을 찾는 중…' : '주소를 넣으면 회사명을 자동으로 채워 드립니다.'}
              </span>
            </label>

            <label className="mycal-field">
              <span className="mycal-field__label">
                회사명 <em className="mycal-field__required">필수</em>
              </span>
              <input
                type="text"
                value={form.companyName}
                maxLength={100}
                placeholder="예) 카카오"
                onChange={(e) => setForm({ ...form, companyName: e.target.value })}
              />
            </label>

            <label className="mycal-field">
              <span className="mycal-field__label">메모</span>
              <textarea
                rows={4}
                value={form.memo}
                maxLength={2000}
                placeholder="예) 서류 마감 23:59, 포트폴리오 첨부 필요"
                onChange={(e) => setForm({ ...form, memo: e.target.value })}
              />
            </label>

            <div className="mycal-form__actions">
              <IonButton fill="outline" onClick={() => setForm(null)}>취소</IonButton>
              <IonButton onClick={handleSave} disabled={saving}>
                {saving ? '저장 중…' : '저장'}
              </IonButton>
            </div>
          </div>
        )}
      </IonModal>

      <IonAlert
        isOpen={deleteTargetId !== null}
        onDidDismiss={() => setDeleteTargetId(null)}
        header="일정 삭제"
        message="이 일정을 삭제할까요?"
        buttons={[
          { text: '취소', role: 'cancel' },
          {
            text: '삭제',
            role: 'destructive',
            handler: () => {
              if (deleteTargetId !== null) {
                handleDelete(deleteTargetId);
              }
            },
          },
        ]}
      />

      <IonAlert
        isOpen={!!errorMessage}
        onDidDismiss={() => setErrorMessage('')}
        header="알림"
        message={errorMessage}
        buttons={['확인']}
      />

      {/* 오버레이는 ion-header 안에 두면 Ionic 이 template 에 가둬 열리지 않는다. 헤더 밖에 둔다. */}
      {!isMobile && <LoginModal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} />}
    </IonPage>
  );
};

export default MyCalendar;
