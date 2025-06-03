// UseTokenRefresh.ts
import { useState } from 'react';
import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import { useAuth } from './AuthContextType';
import API_URL from '../config';
import { LikesResponse } from '../response/LikesResponse';

const UseTokenRefresh = () => {
  const { user, logout } = useAuth();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleTokenRefresh = async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) {
      console.log('refreshToken is null');
      logout();
      return;
    }

    try {
      const tokenResponse = await axios.post(`${API_URL}/api/auth/refresh`, {
        refreshToken,
        user
      }, {
        headers: {
          'Authorization': `Bearer ${refreshToken}`
        }
      });

      const newAccessToken = tokenResponse.data.accessToken;
      const newRefreshToken = tokenResponse.data.refreshToken;
      localStorage.setItem('jwtToken', newAccessToken);
      localStorage.setItem('refreshToken', newRefreshToken);
    } catch (refreshError) {
      console.error('Error refreshing token:', refreshError);
      logout();
    }
  };

  const fetchWithToken = async <T>(
    url: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' = 'GET',
    data?: any
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
      } else if (lowerMethod === 'head') {
        response = await axios.head<T>(url, config); // HEAD는 url과 config
      } else {
        console.error(`Unsupported HTTP method: ${method}`);
        // 지원하지 않는 메소드인 경우 어떻게 처리할지 결정
        // 현재 로직에 맞춰 undefined 반환
        return undefined;
      }

      return response.data;
    } catch (error: any) {
      console.error('Error fetching data:', error);
      if (error.response && error.response.status === 401 && !isRefreshing) {
        setIsRefreshing(true);
        await handleTokenRefresh();
        setIsRefreshing(false);
        return fetchWithToken<T>(url, method, data);
      } else {
        logout();
        return undefined;
      }
    }
  };

  return { fetchWithToken };
};

export default UseTokenRefresh;
