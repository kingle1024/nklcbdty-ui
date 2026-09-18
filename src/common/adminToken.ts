// 관리자 토큰 저장/조회. adminApi 와 AuthContextType 양쪽에서 쓰기 때문에
// 다른 모듈을 import 하지 않는 잎(leaf) 모듈로 떼어 뒀다 (순환 import 방지).
//
// 관리자 토큰은 두 가지 경로로 들어온다.
//  1) /admin 의 관리자 아이디/비밀번호 로그인 (admin_account)
//  2) 관리자 이메일로 한 평소 로그인 — 그 사용자 토큰에 role=ADMIN 이 실려 있어 그대로 복사해 쓴다
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

/**
 * 지금 관리자 세션이 "관리자 이메일로 한 평소 로그인"인지.
 * 이 경우 관리자 토큰은 사용자 액세스 토큰의 복사본이라 1시간이면 만료되므로,
 * 401 을 만나면 로그인 화면으로 보내기 전에 토큰 갱신을 한 번 태워야 한다.
 */
export const isUserTokenAdminSession = (): boolean => {
  const adminToken = getAdminToken();
  return !!adminToken && adminToken === localStorage.getItem('jwtToken');
};
