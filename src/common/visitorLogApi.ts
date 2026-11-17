import adminApi from './adminApi';

// 관리자 화면의 사용자 접속 로그(/api/admin/visitors).
// 401 이면 adminApi 가 토큰을 갱신해 한 번 다시 부르고, 그래도 안 되면 관리자 로그인으로 보낸다.

export type VisitorOrigin = 'DOMESTIC' | 'FOREIGN' | 'INTERNAL' | 'UNKNOWN';

export interface VisitorRow {
  id: number;
  path: string | null;
  ip: string | null;
  origin: VisitorOrigin;
  domestic: boolean;
  countryName: string | null;
  regionName: string | null;
  cityName: string | null;
  referer: string | null;
  acceptLanguage: string | null;
  insertDts: string | null;
}

export interface VisitorPage {
  rows: VisitorRow[];
  totalElements: number;
  totalPages: number;
  pageNumber: number;
  pageSize: number;
  originCounts: Record<VisitorOrigin, number>;
}

export interface VisitorQuery {
  page: number;
  size: number;
  domestic: boolean;
  excludeInternal: boolean;
  keyword: string;
  from: string; // yyyy-MM-dd, 비우면 조건 없음
  to: string;
}

export const ORIGIN_META: Record<VisitorOrigin, { label: string; className: string }> = {
  DOMESTIC: { label: '국내', className: 'origin-domestic' },
  INTERNAL: { label: '팀원', className: 'origin-internal' },
  FOREIGN: { label: '해외', className: 'origin-foreign' },
  UNKNOWN: { label: '미상', className: 'origin-unknown' },
};

const EMPTY_COUNTS: Record<VisitorOrigin, number> = { DOMESTIC: 0, FOREIGN: 0, INTERNAL: 0, UNKNOWN: 0 };

export const buildVisitorParams = (q: VisitorQuery): Record<string, string> => {
  const params: Record<string, string> = {
    page: String(q.page),
    size: String(q.size),
    domestic: String(q.domestic),
    excludeInternal: String(q.excludeInternal),
  };
  if (q.keyword.trim()) params.keyword = q.keyword.trim();
  if (q.from) params.from = q.from;
  if (q.to) params.to = q.to;
  return params;
};

// 백엔드가 옛 빌드거나 필드가 빠져도 화면이 깨지지 않게 기본값을 채운다.
export const normalizeVisitorPage = (raw: unknown): VisitorPage => {
  const data = (raw ?? {}) as Partial<VisitorPage>;
  return {
    rows: Array.isArray(data.rows) ? data.rows : [],
    totalElements: Number(data.totalElements) || 0,
    totalPages: Number(data.totalPages) || 0,
    pageNumber: Number(data.pageNumber) || 0,
    pageSize: Number(data.pageSize) || 0,
    originCounts: { ...EMPTY_COUNTS, ...(data.originCounts ?? {}) },
  };
};

export const fetchVisitors = async (q: VisitorQuery): Promise<VisitorPage> => {
  const { data } = await adminApi.get('/api/admin/visitors', { params: buildVisitorParams(q) });
  return normalizeVisitorPage(data);
};

export const formatVisitTime = (value: string | null): string => {
  if (!value) return '-';
  // 서버는 시간대 없는 KST 벽시계(2026-11-17T13:49:15)로 준다. Date 로 바꾸면 브라우저 시간대가 끼어드니 문자열로 자른다.
  // 초가 0 이면 Jackson 이 초를 빼고 준다(…T13:49).
  const m = value.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})(:\d{2})?/);
  return m ? `${m[1]} ${m[2]}${m[3] ?? ':00'}` : value;
};
