import axios from 'axios';
import API_URL from '../config';
import { getAdminToken, setAdminAuth, clearAdminAuth, isUserTokenAdminSession } from './adminToken';
import { refreshOnce } from './UseTokenRefresh';

// 토큰 저장/조회는 adminToken 모듈에 있다(AuthContextType 과 같이 쓰느라 분리).
// 기존 import 경로(`../common/adminApi`)를 그대로 쓸 수 있게 다시 내보낸다.
export * from './adminToken';

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
  async (error) => {
    if (error?.response?.status !== 401) {
      return Promise.reject(error);
    }

    // 관리자 이메일로 한 평소 로그인이면 관리자 토큰은 1시간짜리 사용자 토큰의 복사본이다.
    // 만료됐다고 관리자 로그인 화면으로 보내지 말고, 사용자 토큰과 같은 경로로 갱신해 한 번 재시도한다.
    const config = error.config as ({ _adminRetried?: boolean } & typeof error.config) | undefined;
    if (config && !config._adminRetried && isUserTokenAdminSession()) {
      config._adminRetried = true;
      const result = await refreshOnce();
      const refreshed = localStorage.getItem('jwtToken');
      if (result === 'ok' && refreshed) {
        setAdminAuth(refreshed);
        return adminApi.request(config);
      }
    }

    clearAdminAuth();
    // 로그인 페이지 자체가 아니면 로그인으로 이동
    if (window.location.pathname !== '/admin') {
      window.location.href = '/admin';
    }
    return Promise.reject(error);
  }
);

export default adminApi;
