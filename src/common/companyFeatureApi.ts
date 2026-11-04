import axios from 'axios';
import API_URL from '../config';
import adminApi from './adminApi';

/**
 * 근무형태(재택 등)별 회사 모아보기 + 복지 카테고리 API.
 * 회사별 근무형태·복지는 nklcbdty-batch 가 채용공고 본문에서 키워드로 자동 추출한다.
 */

export interface WelfareCategory {
  id: number;
  code: string;
  name: string;
  keywords: string[];
  sortOrder: number;
  active: boolean;
}

/** 어느 공고의 어느 문구에서 찾았는지 */
export interface FeatureEvidence {
  jobId: number;
  annoSubject: string | null;
  sysCompanyNm: string | null;
  jobDetailLink: string | null;
  matchedKeyword: string;
  snippet: string;
}

export interface CompanyWelfare {
  code: string;
  name: string;
  evidences: FeatureEvidence[];
}

export interface WorkStyleCompany {
  companyCd: string;
  companyNm: string;
  careerPageUrl: string | null;
  /** 근무형태로 거르지 않고 복지로만 찾았으면 null */
  workStyle: string | null;
  workStyleLabel: string | null;
  /** 근무형태로 찾았으면 그 근거 공고 수, 복지로만 찾았으면 (고른) 복지 근거 공고 수 */
  postingCount: number;
  evidences: FeatureEvidence[];
  welfares: CompanyWelfare[];
}

export interface WelfareCategoryInput {
  code?: string;
  name?: string;
  keywords?: string[];
  active?: boolean;
}

/** 복지를 여러 개 골랐을 때: 모두 가진 회사(ALL) / 하나라도 가진 회사(ANY) */
export type WelfareMatch = 'ALL' | 'ANY';

export interface FeatureCompanyQuery {
  /** 없으면 근무형태로 거르지 않는다(복지로만) */
  workStyle: string | null;
  welfare: string[];
  match: WelfareMatch;
}

/** /api/company/features 쿼리스트링. match 는 복지를 2개 이상 골랐을 때만 의미가 있어 그때만 붙인다. */
export const featureCompanyQuery = ({ workStyle, welfare, match }: FeatureCompanyQuery): string => {
  const params = new URLSearchParams();
  if (workStyle) params.append('workStyle', workStyle);
  welfare.forEach((code) => params.append('welfare', code));
  if (welfare.length > 1) params.append('match', match);
  return params.toString();
};

/** 근무형태·복지 조건에 맞는 회사 목록 */
export const fetchFeatureCompanies = async (query: FeatureCompanyQuery): Promise<WorkStyleCompany[]> => {
  const qs = featureCompanyQuery(query);
  const { data } = await axios.get<WorkStyleCompany[]>(
    `${API_URL}/api/company/features${qs ? `?${qs}` : ''}`,
  );
  return Array.isArray(data) ? data : [];
};

export const fetchActiveWelfareCategories = async (): Promise<WelfareCategory[]> => {
  const { data } = await axios.get<WelfareCategory[]>(`${API_URL}/api/company/welfare-categories`);
  return Array.isArray(data) ? data : [];
};

// ---- 관리자 ----

export const fetchAllWelfareCategories = async (): Promise<WelfareCategory[]> => {
  const { data } = await adminApi.get<WelfareCategory[]>(`${API_URL}/api/admin/welfare-categories`);
  return Array.isArray(data) ? data : [];
};

export const createWelfareCategory = async (input: WelfareCategoryInput): Promise<WelfareCategory> => {
  const { data } = await adminApi.post<WelfareCategory>(`${API_URL}/api/admin/welfare-categories`, input);
  return data;
};

export const updateWelfareCategory = async (
  id: number,
  input: WelfareCategoryInput,
): Promise<WelfareCategory> => {
  const { data } = await adminApi.put<WelfareCategory>(`${API_URL}/api/admin/welfare-categories/${id}`, input);
  return data;
};

export const reorderWelfareCategories = async (orderedIds: number[]): Promise<WelfareCategory[]> => {
  const { data } = await adminApi.put<WelfareCategory[]>(
    `${API_URL}/api/admin/welfare-categories/order`,
    orderedIds,
  );
  return Array.isArray(data) ? data : [];
};

/** 서버 400 응답의 message 를 꺼낸다. */
export const errorMessage = (error: unknown, fallback: string): string => {
  const message = (error as { response?: { data?: { message?: unknown } } })?.response?.data?.message;
  return typeof message === 'string' && message ? message : fallback;
};

// ---- 화면 헬퍼 ----

/**
 * 메인 화면 회사 탭 중 보여 줄 것. 근무형태 필터가 꺼져 있으면(null) 전부,
 * 켜져 있으면 조건에 맞는 회사만 탭 순서 그대로.
 */
export const visibleCompanyCodes = (
  allCodes: string[],
  featureCompanies: WorkStyleCompany[] | null,
): string[] => {
  if (!featureCompanies) return allCodes;
  const matched = new Set(featureCompanies.map((c) => c.companyCd));
  return allCodes.filter((code) => matched.has(code));
};

/** 관리자 입력 "식대, 식비\n점심" → ['식대','식비','점심'] (쉼표·줄바꿈 모두 구분자) */
export const splitKeywords = (input: string): string[] =>
  Array.from(new Set(input.split(/[,\n]/).map((k) => k.trim()).filter(Boolean)));

/** 근거 발췌에서 매칭된 키워드를 강조하기 위한 조각. 키워드 사이 공백 유무·대소문자는 무시한다. */
export const highlightSegments = (
  snippet: string,
  keyword: string,
): Array<{ text: string; hit: boolean }> => {
  const parts = keyword.trim().split(/\s+/).filter(Boolean)
    .map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  if (!parts.length) return [{ text: snippet, hit: false }];
  const pattern = new RegExp(`(${parts.join('\\s*')})`, 'gi');
  return snippet
    .split(pattern)
    .filter((text) => text !== '')
    .map((text) => ({ text, hit: new RegExp(`^${parts.join('\\s*')}$`, 'i').test(text) }));
};
