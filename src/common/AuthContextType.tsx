import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { AuthResponse } from './authApi';

interface User {
  name: string; // 예시로 사용자 이름을 포함
  userId?: string; // "kakao@{id}" 또는 "local@{id}". 토큰 재발급에 필요하다.
}

interface AuthContextType {
  isLoggedIn: boolean;
  user: User | null;
  /** 카카오/자체 로그인 공통 성공 처리. 토큰과 사용자 정보를 저장하고 로그인 상태로 바꾼다. */
  login: (auth: AuthResponse) => void;
  logout: () => void;
}

const USER_STORAGE_KEY = 'authUser';

/** 새로고침 후에도 사용자 정보가 유지되도록 localStorage 에서 복원한다. */
const readStoredUser = (): User | null => {
  const raw = localStorage.getItem(USER_STORAGE_KEY);
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {

  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(!!localStorage.getItem('jwtToken'));
  const [user, setUser] = useState<User | null>(readStoredUser);

  // 로그인 시 JWT 토큰과 사용자 정보를 로컬 스토리지에 저장하고 로그인 상태 업데이트
  const login = (auth: AuthResponse) => {
    const userInfo: User = { name: auth.nickname, userId: auth.userId };
    localStorage.setItem('jwtToken', auth.token);
    localStorage.setItem('refreshToken', auth.refreshToken);
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userInfo));
    setIsLoggedIn(true);
    setUser(userInfo);
  }

  // 로그아웃 시 로컬 스토리지에서 JWT 토큰을 삭제하고 로그인 상태 업데이트
  const logout = () => {
    localStorage.removeItem('jwtToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem(USER_STORAGE_KEY);
    setIsLoggedIn(false);
    setUser(null);
    window.location.href = '/'; // 메인 페이지로 이동
  }

  // 컴포넌트가 처음 마운트될 때 JWT 토큰의 존재 여부를 확인하여 상태를 업데이트
  useEffect(() => {
    const token = localStorage.getItem('jwtToken');
    setIsLoggedIn(!!token);
  }, []);

  return (
    <AuthContext.Provider value={{ isLoggedIn, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
