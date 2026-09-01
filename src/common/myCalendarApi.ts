// 나의 캘린더 API. 백엔드 MyCalendarController(/api/my-calendar/**) 와 짝을 이룬다.
// 전부 로그인이 필요하다 — 서버에서 AuthFilter 가 토큰을 요구하고, 토큰이 없으면 401 이 온다.
import axios from 'axios';
import API_URL from '../config';
import { refreshOnce } from './UseTokenRefresh';

export interface MyCalendarEntry {
  id: number;
  /** yyyy-MM-dd. 상시채용이면 null. */
  applyDate: string | null;
  /** 마감일 없는 상시채용인지. 참이면 달력 칸이 아니라 상시채용 목록에 들어간다. */
  ongoing: boolean;
  companyName: string;
  url: string | null;
  memo: string | null;
  /** 지원을 마쳤다고 손으로 표시했는지 */
  completed: boolean;
  completedAt: string | null;
}

export interface MyCalendarDay {
  date: string;
  dayOfWeek: number;
  count: number;
  entries: MyCalendarEntry[];
}

export interface MyCalendarMonth {
  year: number;
  month: number;
  firstDayOfWeek: number;
  lengthOfMonth: number;
  /** 그 달에 적어 둔 일정 건수. 상시채용은 특정 달의 것이 아니라 여기에 안 들어간다. */
  totalCount: number;
  days: MyCalendarDay[];
  /** 마감일 없는 상시채용. 어느 달을 조회해도 같은 목록이 온다. */
  ongoingEntries: MyCalendarEntry[];
  ongoingCount: number;
}

export interface MyCalendarEntryInput {
  /** ongoing 이 참이면 서버가 무시한다. */
  applyDate: string;
  /** 상시채용으로 저장할지. 참이면 날짜 없이 저장된다. */
  ongoing: boolean;
  companyName: string;
  url: string;
  memo: string;
}

const authHeaders = (): Record<string, string> => {
  const token = localStorage.getItem('jwtToken');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

/** 리프레시 토큰까지 무효일 때만 부른다. 저장된 세션을 지우고 메인으로 보낸다. */
const clearAuthAndGoHome = () => {
  localStorage.removeItem('jwtToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('authUser');
  window.location.href = '/';
};

/*
 * 액세스 토큰은 1시간이면 만료돼 401 이 온다. 로그인이 풀린 게 아니라 토큰이 낡은 것뿐인데,
 * 그대로 두면 로그인해 둔 사용자에게 "로그인이 필요합니다" 알림이 계속 뜬다.
 * 401 이면 리프레시 토큰으로 한 번 갱신해 재시도하고, 리프레시 토큰까지 무효일 때만
 * 세션을 지우고 메인으로 보낸다. run 은 부를 때마다 authHeaders() 를 다시 읽어야
 * 갱신된 토큰이 실린다.
 */
const withAuthRetry = async <T>(run: () => Promise<T>): Promise<T> => {
  try {
    return await run();
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      const result = await refreshOnce();
      if (result === 'ok') {
        return run();
      }
      if (result === 'invalid') {
        clearAuthAndGoHome();
      }
    }
    throw error;
  }
};

/** 서버가 돌려준 사용자용 메세지를 꺼낸다. 없으면 기본 문구. */
const messageOf = (error: unknown, fallback: string): string => {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { message?: string } | undefined;
    if (data?.message) {
      return data.message;
    }
    if (error.response?.status === 401) {
      return '로그인이 필요합니다. 다시 로그인해 주세요.';
    }
    if (!error.response) {
      return '서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.';
    }
  }
  return fallback;
};

/*
 * 상시채용·완료를 모르는 옛 서버는 ongoingEntries / ongoing / completed 를 안 보낸다.
 * 그대로 쓰면 화면이 undefined.length 로 죽고, 체크박스가 controlled ↔ uncontrolled 를
 * 넘나든다. 프론트는 Netlify 로 즉시 뜨는데 백엔드는 콘솔에서 손으로 재배포해야 해서
 * 둘의 시차는 늘 생긴다 — 빠진 값은 이 한 곳에서 채우고 화면은 몰라도 되게 한다.
 *
 * 서버가 새 필드를 보내기 시작하면 이 함수는 아무것도 바꾸지 않는 통과 지점이 된다.
 */
const entryWithDefaults = (entry: MyCalendarEntry): MyCalendarEntry => ({
  ...entry,
  applyDate: entry.applyDate ?? null,
  ongoing: entry.ongoing ?? entry.applyDate == null,
  completed: entry.completed ?? false,
  completedAt: entry.completedAt ?? null,
});

const withDefaults = (month: MyCalendarMonth): MyCalendarMonth => ({
  ...month,
  days: (month.days ?? []).map((day) => ({
    ...day,
    entries: (day.entries ?? []).map(entryWithDefaults),
  })),
  ongoingEntries: (month.ongoingEntries ?? []).map(entryWithDefaults),
  ongoingCount: month.ongoingCount ?? 0,
});

export const fetchMyCalendarMonth = async (year: number, month: number): Promise<MyCalendarMonth> => {
  try {
    const res = await withAuthRetry(() =>
      axios.get<MyCalendarMonth>(`${API_URL}/api/my-calendar/entries`, {
        params: { year, month },
        headers: authHeaders(),
      }),
    );
    return withDefaults(res.data);
  } catch (error) {
    throw new Error(messageOf(error, '캘린더를 불러오지 못했습니다.'));
  }
};

export const createMyCalendarEntry = async (input: MyCalendarEntryInput): Promise<MyCalendarEntry> => {
  try {
    const res = await withAuthRetry(() =>
      axios.post<MyCalendarEntry>(`${API_URL}/api/my-calendar/entries`, input, {
        headers: authHeaders(),
      }),
    );
    return res.data;
  } catch (error) {
    throw new Error(messageOf(error, '일정을 저장하지 못했습니다.'));
  }
};

export const updateMyCalendarEntry = async (
  id: number,
  input: MyCalendarEntryInput,
): Promise<MyCalendarEntry> => {
  try {
    const res = await withAuthRetry(() =>
      axios.put<MyCalendarEntry>(`${API_URL}/api/my-calendar/entries/${id}`, input, {
        headers: authHeaders(),
      }),
    );
    return res.data;
  } catch (error) {
    throw new Error(messageOf(error, '일정을 수정하지 못했습니다.'));
  }
};

/**
 * 완료 표시를 켜고 끈다. 상시채용은 마감일이 없어 목록에서 저절로 내려가지 않으므로 필요하다.
 *
 * 켤지 끌지를 그대로 보내므로 같은 요청이 두 번 가도 결과가 같다. PATCH 가 어울리지만 PUT 이다 —
 * 서버 CORS 가 PATCH 를 허용하지 않아서 PATCH 로 보내면 preflight 에서 막힌다.
 */
export const setMyCalendarEntryCompleted = async (
  id: number,
  completed: boolean,
): Promise<MyCalendarEntry> => {
  try {
    const res = await withAuthRetry(() =>
      axios.put<MyCalendarEntry>(
        `${API_URL}/api/my-calendar/entries/${id}/complete`,
        { completed },
        { headers: authHeaders() },
      ),
    );
    return res.data;
  } catch (error) {
    throw new Error(
      messageOf(error, completed ? '완료로 표시하지 못했습니다.' : '완료를 되돌리지 못했습니다.'),
    );
  }
};

export const deleteMyCalendarEntry = async (id: number): Promise<void> => {
  try {
    await withAuthRetry(() =>
      axios.delete(`${API_URL}/api/my-calendar/entries/${id}`, { headers: authHeaders() }),
    );
  } catch (error) {
    throw new Error(messageOf(error, '일정을 삭제하지 못했습니다.'));
  }
};

/**
 * URL 로 회사명을 추측한다. 입력 도우미일 뿐이라 실패해도 화면에 오류를 띄우지 않고
 * 빈 값을 돌려준다 — 회사명은 사용자가 직접 적으면 된다.
 */
export const guessCompanyName = async (url: string): Promise<string> => {
  try {
    const res = await withAuthRetry(() =>
      axios.get<{ companyName: string | null }>(
        `${API_URL}/api/my-calendar/company-name`,
        { params: { url }, headers: authHeaders() },
      ),
    );
    return res.data.companyName ?? '';
  } catch {
    return '';
  }
};
