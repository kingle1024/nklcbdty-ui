import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
interface User {
  name: string; // 예시로 사용자 이름을 포함
}

interface AuthContextType {
  isLoggedIn: boolean;
  user: User | null;
  login: (token: string, userInfo: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {

  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(!!localStorage.getItem('jwtToken'));
  const [user, setUser] = useState<User | null>(null);

  // 로그인 시 JWT 토큰을 로컬 스토리지에 저장하고 로그인 상태 업데이트
  const login = (token: string, userInfo: User) => {
    setIsLoggedIn(true);
    setUser(userInfo);
  }
  
  // 로그아웃 시 로컬 스토리지에서 JWT 토큰을 삭제하고 로그인 상태 업데이트
  const logout = () => {
    localStorage.removeItem('jwtToken');
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
