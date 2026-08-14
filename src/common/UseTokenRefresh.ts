// UseTokenRefresh.ts
// 액세스 토큰(1시간)이 만료되면 리프레시 토큰(30일)으로 조용히 갱신해 로그인을 유지한다.
// 로그아웃은 "리프레시 토큰이 정말 무효일 때"만 한다 — 일시적인 서버/네트워크 오류로
// 로그아웃하면 사용자는 아무 이유 없이 로그인이 풀린 것처럼 보인다.
import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import { useAuth } from './AuthContextType';
import API_URL from '../config';

type RefreshResult = 'ok' | 'invalid' | 'error';

// 여러 컴포넌트/탭 내 요청이 동시에 401 을 받아도 갱신 요청은 한 번만 나가도록
// 훅 인스턴스가 아니라 모듈 단위로 공유한다. (겹쳐 부르면 한쪽의 회전된 토큰이
// 무효가 되어 로그아웃될 수 있다)
let refreshPromise: Promise<RefreshResult> | null = null;

const storedUserId = (): string | null => {
  const raw = localStorage.getItem('authUser');
  if (!raw) {
    return null;
  }
  try {
    return (JSON.parse(raw) as { userId?: string }).userId ?? null;
  } catch {
    return null;
  }
};

const requestTokenRefresh = async (): Promise<RefreshResult> => {
  const refreshToken = localStorage.getItem('refreshToken');
  const userId = storedUserId();
  if (!refreshToken || !userId) {
    return 'invalid';
  }

  try {
    // 백엔드 RefreshRequest 는 { refreshToken, userVo: { userId } } 형태를 받는다.
    const tokenResponse = await axios.post(`${API_URL}/api/auth/refresh`, {
      refreshToken,
      userVo: { userId }
    }, {
      headers: {
        'Authorization': `Bearer ${refreshToken}`
      }
    });

    localStorage.setItem('jwtToken', tokenResponse.data.accessToken);
    localStorage.setItem('refreshToken', tokenResponse.data.refreshToken);
    return 'ok';
  } catch (refreshError) {
    console.error('Error refreshing token:', refreshError);
    if (axios.isAxiosError(refreshError) && refreshError.response?.status === 401) {
      return 'invalid'; // 리프레시 토큰 만료/무효 — 다시 로그인해야 한다
    }
    return 'error'; // 서버 장애·네트워크 오류 — 로그인 상태는 유지한다
  }
};

const refreshOnce = (): Promise<RefreshResult> => {
  if (!refreshPromise) {
    refreshPromise = requestTokenRefresh().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
};

const UseTokenRefresh = () => {
  const { logout } = useAuth();

  const fetchWithToken = async <T>(
    url: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' = 'GET',
    data?: any,
    isRetry = false
  ): Promise<T | null | undefined> => {
    const token = localStorage.getItem('jwtToken');
    if (!token) {
      console.log('token is null');
      logout();
      return null;
    }

    const config: AxiosRequestConfig = {
      headers: {
        'Authorization': `Bearer ${token}`,
        ...(data && ['POST', 'PUT', 'PATCH'].includes(method.toUpperCase()) && { 'Content-Type': 'application/json' }),
      }
    }

    try {
      let response: AxiosResponse<T>;
      const lowerMethod = method.toLocaleLowerCase();

      if (lowerMethod === 'get') {
        response = await axios.get<T>(url, config); // GET은 url과 config
      } else if (lowerMethod === 'post') {
        response = await axios.post<T>(url, data, config); // POST는 url, data, config
      } else if (lowerMethod === 'put') {
        response = await axios.put<T>(url, data, config); // PUT은 url, data, config
      } else if (lowerMethod === 'delete') {
        if (data) {
          response = await axios.delete<T>(url, { ...config, data: data });
        } else {
          response = await axios.delete<T>(url, config);
        }
      } else if (lowerMethod === 'patch') {
        response = await axios.patch<T>(url, data, config); // PATCH는 url, data, config
      } else {
        console.error(`Unsupported HTTP method: ${method}`);
        return undefined;
      }

      return response.data;
    } catch (error: any) {
      console.error('Error fetching data:', error);

      if (error.response && error.response.status === 401 && !isRetry) {
        const result = await refreshOnce();
        if (result === 'ok') {
          return fetchWithToken<T>(url, method, data, true);
        }
        if (result === 'invalid') {
          logout();
        }
        return undefined;
      }

      // 401 이 아닌 오류(서버 500, 네트워크 단절 등)는 이 요청만 실패로 처리하고
      // 로그인 상태는 건드리지 않는다.
      return undefined;
    }
  };

  return { fetchWithToken };
};

export default UseTokenRefresh;
