// 마이페이지 "내 경력" API. 백엔드 MyCareerController(/api/my-career) 와 짝이다.
//
// 요청·응답 모양은 관리자 경력(careerApi.ts, /api/admin/career)과 같아서 묶기·기간 표시·편집 폼은
// careerApi 의 함수를 그대로 쓴다. 다른 점은 인증뿐이다 — 관리자 토큰이 아니라 사용자 토큰이고,
// 1시간이면 만료되므로 401 에서 한 번 갱신해 재시도한다(myCalendarApi 와 같은 방식).
import axios from 'axios';
import API_URL from '../config';
import { refreshOnce } from './UseTokenRefresh';
import { CareerEntry, CareerEntryInput } from './careerApi';

const BASE = `${API_URL}/api/my-career`;

const authHeaders = (): Record<string, string> => {
  const token = localStorage.getItem('jwtToken');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

/** 리프레시 토큰까지 무효일 때만 부른다. 저장된 세션을 지우고 메인으로 보낸다 */
const clearAuthAndGoHome = () => {
  localStorage.removeItem('jwtToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('authUser');
  window.location.href = '/';
};

/** run 은 부를 때마다 authHeaders() 를 다시 읽어야 갱신된 토큰이 실린다 */
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

/**
 * 오류를 사람이 읽을 문장으로. 서버가 준 message(검사 실패 등)가 있으면 그대로 쓴다.
 *
 * 404/405 이면서 message 가 없으면 이 API 가 아직 없는 옛 서버다 — 프론트는 머지 즉시 뜨고
 * 백엔드는 손으로 재배포해야 해서 그 사이에 이 화면이 먼저 열릴 수 있다.
 */
export const myCareerErrorMessage = (error: unknown, fallback: string): string => {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { message?: string } | undefined;
    if (data?.message) {
      return data.message;
    }
    const status = error.response?.status;
    if (status === 404 || status === 405) {
      return '서버에 내 경력 기능이 아직 반영되지 않았습니다. 잠시 후 다시 시도해 주세요.';
    }
    if (status === 401) {
      return '로그인이 필요합니다. 다시 로그인해 주세요.';
    }
    if (!error.response) {
      return '서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.';
    }
  }
  return fallback;
};

/** 서버가 빠뜨린 목록 칸을 채운다. 화면은 배열이 늘 있다고 보고 .length 를 읽는다 */
export const withListDefaults = (e: CareerEntry): CareerEntry => ({
  ...e,
  slug: e.slug ?? `my-${e.id}`,
  achievements: e.achievements ?? [],
  techStack: e.techStack ?? [],
  tags: e.tags ?? [],
  referenceLinks: e.referenceLinks ?? [],
});

export const fetchMyCareer = async (): Promise<CareerEntry[]> => {
  try {
    const { data } = await withAuthRetry(() =>
      axios.get<{ entries: CareerEntry[]; count: number }>(BASE, { headers: authHeaders() }),
    );
    return (data.entries ?? []).map(withListDefaults);
  } catch (error) {
    throw new Error(myCareerErrorMessage(error, '경력을 가져오지 못했습니다.'));
  }
};

export const createMyCareer = async (input: CareerEntryInput): Promise<CareerEntry> => {
  try {
    const { data } = await withAuthRetry(() => axios.post<CareerEntry>(BASE, input, { headers: authHeaders() }));
    return withListDefaults(data);
  } catch (error) {
    throw new Error(myCareerErrorMessage(error, '저장하지 못했습니다.'));
  }
};

export const updateMyCareer = async (id: number, input: CareerEntryInput): Promise<CareerEntry> => {
  try {
    const { data } = await withAuthRetry(() =>
      axios.put<CareerEntry>(`${BASE}/${id}`, input, { headers: authHeaders() }),
    );
    return withListDefaults(data);
  } catch (error) {
    throw new Error(myCareerErrorMessage(error, '저장하지 못했습니다.'));
  }
};

export const deleteMyCareer = async (id: number): Promise<void> => {
  try {
    await withAuthRetry(() => axios.delete(`${BASE}/${id}`, { headers: authHeaders() }));
  } catch (error) {
    throw new Error(myCareerErrorMessage(error, '삭제하지 못했습니다.'));
  }
};
