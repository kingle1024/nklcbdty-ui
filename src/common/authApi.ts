// 자체 로그인/회원가입 API 호출. 백엔드 LocalAuthController(/api/auth/**) 와 짝을 이룬다.
// 응답 형태는 카카오 로그인(/api/kakaoLogin)과 같아서 로그인 성공 처리를 한 곳에서 쓸 수 있다.
import axios from 'axios';
import API_URL from '../config';

/** /api/auth/login, /api/auth/signup, /api/kakaoLogin 이 공통으로 돌려주는 형태 */
export interface AuthResponse {
  token: string;
  refreshToken: string;
  userId: string;
  nickname: string;
}

/** 서버가 돌려준 사용자용 메세지를 꺼낸다. 없으면 기본 문구. */
const messageOf = (error: unknown, fallback: string): string => {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { message?: string } | undefined;
    if (data?.message) {
      return data.message;
    }
    if (!error.response) {
      return '서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.';
    }
  }
  return fallback;
};

export const login = async (email: string, password: string): Promise<AuthResponse> => {
  try {
    const res = await axios.post<AuthResponse>(`${API_URL}/api/auth/login`, { email, password });
    return res.data;
  } catch (error) {
    throw new Error(messageOf(error, '로그인에 실패했습니다.'));
  }
};

export const signup = async (
  email: string,
  password: string,
  nickname: string
): Promise<AuthResponse> => {
  try {
    const res = await axios.post<AuthResponse>(`${API_URL}/api/auth/signup`, { email, password, nickname });
    return res.data;
  } catch (error) {
    throw new Error(messageOf(error, '회원가입에 실패했습니다.'));
  }
};

/** 회원가입 화면의 이메일 중복 확인. 확인에 실패하면 가입 시도를 막지 않도록 false 로 본다. */
export const emailExists = async (email: string): Promise<boolean> => {
  try {
    const res = await axios.get<{ exists: boolean }>(`${API_URL}/api/auth/email-exists`, {
      params: { email },
    });
    return res.data.exists;
  } catch (error) {
    return false;
  }
};
