import { WorkStyleCompany, highlightSegments, splitKeywords, visibleCompanyCodes } from './companyFeatureApi';

// 여기서 보는 건 순수 함수뿐이다. axios 1.x 는 ESM 이라 CRA jest 가 변환하지 못하므로 막아 둔다
// (adminApi 는 불러오는 순간 axios.create 를 부르므로 같이 막는다).
jest.mock('axios', () => ({}));
jest.mock('./adminApi', () => ({}));

describe('visibleCompanyCodes', () => {
  const company = (companyCd: string) => ({ companyCd } as WorkStyleCompany);
  const all = ['NAVER', 'KAKAO', 'LINE', 'COUPANG'];

  it('필터가 꺼져 있으면 탭 전부', () => {
    expect(visibleCompanyCodes(all, null)).toEqual(all);
  });

  it('조건에 맞는 회사만, 응답 순서가 아니라 탭 순서대로', () => {
    expect(visibleCompanyCodes(all, [company('COUPANG'), company('LINE'), company('NAVER')]))
      .toEqual(['NAVER', 'LINE', 'COUPANG']);
  });

  it('맞는 회사가 없으면 빈 목록', () => {
    expect(visibleCompanyCodes(all, [])).toEqual([]);
  });
});

describe('splitKeywords', () => {
  it('쉼표와 줄바꿈 모두 구분자, 공백·중복 정리', () => {
    expect(splitKeywords(' 식대, 식비\n점심 ,식대,, ')).toEqual(['식대', '식비', '점심']);
  });
});

describe('highlightSegments', () => {
  it('매칭 키워드만 hit 로 표시하고 원문은 그대로 이어진다', () => {
    const segments = highlightSegments('주 2회 재택근무를 해요', '재택');
    expect(segments.map((s) => s.text).join('')).toBe('주 2회 재택근무를 해요');
    expect(segments.filter((s) => s.hit).map((s) => s.text)).toEqual(['재택']);
  });

  it('키워드 공백 유무·대소문자는 무시', () => {
    const segments = highlightSegments('We work Remote First, 원격근무 OK', '원격 근무');
    expect(segments.filter((s) => s.hit).map((s) => s.text)).toEqual(['원격근무']);
    expect(highlightSegments('remote-first culture', 'Remote-First').some((s) => s.hit)).toBe(true);
  });

  it('정규식 특수문자가 든 키워드도 안전하다', () => {
    expect(highlightSegments('C++ 교육비 지원', 'C++').filter((s) => s.hit).map((s) => s.text)).toEqual(['C++']);
  });
});
