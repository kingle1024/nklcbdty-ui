// 나의 캘린더 API. 백엔드 MyCalendarController(/api/my-calendar/**) 와 짝을 이룬다.
// 전부 로그인이 필요하다 — 서버에서 AuthFilter 가 토큰을 요구하고, 토큰이 없으면 401 이 온다.
import axios from 'axios';
import API_URL from '../config';

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

export const fetchMyCalendarMonth = async (year: number, month: number): Promise<MyCalendarMonth> => {
  try {
    const res = await axios.get<MyCalendarMonth>(`${API_URL}/api/my-calendar/entries`, {
      params: { year, month },
      headers: authHeaders(),
    });
    return res.data;
  } catch (error) {
    throw new Error(messageOf(error, '캘린더를 불러오지 못했습니다.'));
  }
};

export const createMyCalendarEntry = async (input: MyCalendarEntryInput): Promise<MyCalendarEntry> => {
  try {
    const res = await axios.post<MyCalendarEntry>(`${API_URL}/api/my-calendar/entries`, input, {
      headers: authHeaders(),
    });
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
    const res = await axios.put<MyCalendarEntry>(`${API_URL}/api/my-calendar/entries/${id}`, input, {
      headers: authHeaders(),
    });
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
    const res = await axios.put<MyCalendarEntry>(
      `${API_URL}/api/my-calendar/entries/${id}/complete`,
      { completed },
      { headers: authHeaders() },
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
    await axios.delete(`${API_URL}/api/my-calendar/entries/${id}`, { headers: authHeaders() });
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
    const res = await axios.get<{ companyName: string | null }>(
      `${API_URL}/api/my-calendar/company-name`,
      { params: { url }, headers: authHeaders() },
    );
    return res.data.companyName ?? '';
  } catch {
    return '';
  }
};
