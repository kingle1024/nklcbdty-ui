/**
 * 회사 코드(job_mst.company_cd) → 표시 이름 / 브랜드 색.
 *
 * 목록(ListContainer)과 캘린더(Calendar)가 같은 회사 탭·같은 색을 쓰도록 한곳에 모았다.
 * 'ALL' 은 화면의 "전체" 탭 전용 키로, 서버에도 같은 값으로 넘긴다.
 */
export const COMPANY_NAMES: { [key: string]: string } = {
  ALL: '전체',
  NAVER: '네이버',
  KAKAO: '카카오',
  LINE: '라인',
  COUPANG: '쿠팡',
  BAEMIN: '배달의민족',
  DAANGN: '당근마켓',
  TOSS: '토스',
  YANOLJA: '야놀자',
};

export const COMPANY_COLORS: { [key: string]: string } = {
  NAVER: '#1EC800',
  KAKAO: '#FFEB00',
  LINE: '#00B700',
  COUPANG: '',
  BAEMIN: '#48D1CC',
  DAANGN: '#EB8717',
  TOSS: '#3182F7',
  YANOLJA: '#F5A3B8',
  ALL: 'transparent',
};
