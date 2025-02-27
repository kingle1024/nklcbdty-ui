// UseTokenRefresh.ts
import { useState } from 'react';
import axios from 'axios';
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

  const fetchWithToken = async (url: string): Promise<LikesResponse | null | undefined> => {
    const token = localStorage.getItem('jwtToken');
    if (!token) {
      console.log('token is null');
      return null;
    }

    try {
      const response = await axios.get(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      return response.data;
    } catch (error: any) {
      console.error('Error fetching data:', error);
      if (error.response && error.response.status === 401 && !isRefreshing) {
        setIsRefreshing(true);
        await handleTokenRefresh();
        setIsRefreshing(false);
        return fetchWithToken(url); // 재요청
      } else {
        logout();
        return undefined;
      }
    }
  };

  return { fetchWithToken };
};

export default UseTokenRefresh;
