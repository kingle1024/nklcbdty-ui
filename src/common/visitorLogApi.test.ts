import { buildVisitorParams, normalizeVisitorPage, formatVisitTime } from './visitorLogApi';

jest.mock('./adminApi', () => ({ __esModule: true, default: { get: jest.fn() } }));

describe('visitorLogApi', () => {
  const base = { page: 0, size: 50, domestic: true, excludeInternal: false, keyword: '', from: '', to: '' };

  it('빈 조건은 파라미터에서 뺀다', () => {
    expect(buildVisitorParams(base)).toEqual({
      page: '0',
      size: '50',
      domestic: 'true',
      excludeInternal: 'false',
    });
  });

  it('검색어는 앞뒤 공백을 지우고 기간은 그대로 넘긴다', () => {
    expect(buildVisitorParams({ ...base, keyword: '  /api/list ', from: '2026-11-01', to: '2026-11-17' })).toMatchObject({
      keyword: '/api/list',
      from: '2026-11-01',
      to: '2026-11-17',
    });
  });

  it('옛 응답이나 빈 응답에도 기본값을 채운다', () => {
    const page = normalizeVisitorPage({ rows: [{ id: 1 }], totalElements: 1 });
    expect(page.rows).toHaveLength(1);
    expect(page.originCounts).toEqual({ DOMESTIC: 0, FOREIGN: 0, INTERNAL: 0, UNKNOWN: 0 });
    expect(normalizeVisitorPage(undefined).rows).toEqual([]);
    expect(normalizeVisitorPage({ originCounts: { DOMESTIC: 3 } }).originCounts.DOMESTIC).toBe(3);
  });

  it('시각은 브라우저 시간대와 상관없이 서버 값 그대로 보여 준다', () => {
    expect(formatVisitTime('2026-11-17T13:49:15')).toBe('2026-11-17 13:49:15');
    expect(formatVisitTime('2026-11-17T13:49')).toBe('2026-11-17 13:49:00');
    expect(formatVisitTime(null)).toBe('-');
  });
});
