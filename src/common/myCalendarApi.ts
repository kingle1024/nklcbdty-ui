// 나의 캘린더 API. 백엔드 MyCalendarController(/api/my-calendar/**) 와 짝을 이룬다.
// 전부 로그인이 필요하다 — 서버에서 AuthFilter 가 토큰을 요구하고, 토큰이 없으면 401 이 온다.
import axios from 'axios';
import API_URL from '../config';

export interface MyCalendarEntry {
  id: number;
  /** yyyy-MM-dd */
  applyDate: string;
  companyName: string;
  url: string | null;
  memo: string | null;
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
  totalCount: number;
  days: MyCalendarDay[];
}

export interface MyCalendarEntryInput {
  applyDate: string;
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
