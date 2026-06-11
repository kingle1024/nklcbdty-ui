import axios from 'axios';
import API_URL from '../config';

// 관리자 토큰 저장/조회 (사용자 카카오 토큰과 별도 키)
const ADMIN_TOKEN_KEY = 'adminToken';
const ADMIN_NAME_KEY = 'adminDisplayName';

export const getAdminToken = (): string | null => localStorage.getItem(ADMIN_TOKEN_KEY);
export const getAdminDisplayName = (): string | null => localStorage.getItem(ADMIN_NAME_KEY);

export const setAdminAuth = (token: string, displayName?: string): void => {
  localStorage.setItem(ADMIN_TOKEN_KEY, token);
  if (displayName) {
    localStorage.setItem(ADMIN_NAME_KEY, displayName);
  }
};

export const clearAdminAuth = (): void => {
  localStorage.removeItem(ADMIN_TOKEN_KEY);
  localStorage.removeItem(ADMIN_NAME_KEY);
};

export const isAdminLoggedIn = (): boolean => !!getAdminToken();

// 관리자 API 전용 axios 인스턴스. 모든 요청에 Authorization 헤더를 붙이고,
// 401 이면 토큰을 비우고 로그인(/admin) 으로 보낸다.
const adminApi = axios.create({ baseURL: API_URL });

adminApi.interceptors.request.use((config) => {
  const token = getAdminToken();
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

adminApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      clearAdminAuth();
      // 로그인 페이지 자체가 아니면 로그인으로 이동
      if (window.location.pathname !== '/admin') {
        window.location.href = '/admin';
      }
    }
    return Promise.reject(error);
  }
);

export default adminApi;
