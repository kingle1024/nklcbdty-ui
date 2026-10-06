// 내 경력 기록 열람 API. 백엔드 AdminCareerController(/api/admin/career) 와 짝이다.
//
// 트러블슈팅 기록과 같은 방식이다 — 기록은 로컬의 save-career 스킬이 DB(career_entry)에 넣고,
// 이 화면은 읽기만 한다. 개인 이력이라 관리자 경로에 둔다.
import axios from 'axios';
import adminApi from './adminApi';
import { ReferenceLink } from './troubleshootingApi';

export interface CareerEntry {
  id: number;
  slug: string;
  /** company | project | education | certificate | ... */
  entryType: string;
  company: string | null;
  title: string;
  team: string | null;
  role: string | null;
  /** YYYY-MM-DD. 날짜를 안 적은 항목(자격증 등)은 비어 있다 */
  startedOn: string | null;
  /** 비어 있으면 재직·진행 중 */
  endedOn: string | null;
  summary: string | null;
  description: string | null;
  achievements: string[];
  techStack: string[];
  tags: string[];
  referenceLinks: ReferenceLink[];
  updatedAt: string | null;
}

/** 회사 하나와 그 회사에서 한 프로젝트들 */
export interface CompanyBlock {
  name: string;
  /** 회사 행. 프로젝트만 저장하고 회사 행을 안 넣었으면 없다 */
  head: CareerEntry | null;
  projects: CareerEntry[];
}

export interface CareerGroups {
  companies: CompanyBlock[];
  /** 회사가 비어 있는 프로젝트 */
  personal: CareerEntry[];
  /** 학력·자격증 등 회사·프로젝트가 아닌 이력 */
  others: CareerEntry[];
}

const BASE = '/api/admin/career';

export const fetchCareer = async (): Promise<CareerEntry[]> => {
  try {
    const { data } = await adminApi.get<{ entries: CareerEntry[]; count: number }>(BASE);
    return data.entries ?? [];
  } catch (error) {
    if (axios.isAxiosError(error)) {
      // 프론트는 바로 배포되고 백엔드는 수동 배포라, 이 API 가 아직 없는 서버를 만날 수 있다
      if (error.response?.status === 404) {
        throw new Error('서버에 경력 기록 기능이 아직 반영되지 않았습니다.');
      }
      if (!error.response) {
        throw new Error('서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.');
      }
    }
    throw new Error('경력 기록을 가져오지 못했습니다.');
  }
};

/** 추가·수정 요청 본문. 백엔드 CareerEntryRequest 와 짝이다 */
export interface CareerEntryInput {
  entryType: string;
  company: string | null;
  title: string;
  team: string | null;
  role: string | null;
  startedOn: string | null;
  endedOn: string | null;
  summary: string | null;
  description: string | null;
  achievements: string[];
  techStack: string[];
  tags: string[];
  /** 한 줄에 하나. "라벨: https://..." 또는 주소만 */
  referenceLinks: string[];
}

/**
 * 쓰기 요청의 오류를 사람이 읽을 문장으로 바꾼다. 서버가 준 message(검사 실패 등)가 있으면 그대로 쓴다.
 *
 * 404/405 이면서 message 가 없으면 편집 API 가 아직 없는 옛 서버다 — 프론트는 머지 즉시 뜨고
 * 백엔드는 수동 재시작이라 그 사이에 이 화면이 먼저 열릴 수 있다.
 */
const writeErrorMessage = (error: unknown, fallback: string): string => {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { message?: string } | undefined;
    if (data?.message) {
      return data.message;
    }
    const status = error.response?.status;
    if (status === 404 || status === 405) {
      return '서버에 경력 편집 기능이 아직 반영되지 않았습니다.';
    }
    if (!error.response) {
      return '서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.';
    }
  }
  return fallback;
};

export const createCareer = async (input: CareerEntryInput): Promise<CareerEntry> => {
  try {
    const { data } = await adminApi.post<CareerEntry>(BASE, input);
    return data;
  } catch (error) {
    throw new Error(writeErrorMessage(error, '저장하지 못했습니다.'));
  }
};

export const updateCareer = async (id: number, input: CareerEntryInput): Promise<CareerEntry> => {
  try {
    const { data } = await adminApi.put<CareerEntry>(`${BASE}/${id}`, input);
    return data;
  } catch (error) {
    throw new Error(writeErrorMessage(error, '저장하지 못했습니다.'));
  }
};

export const deleteCareer = async (id: number): Promise<void> => {
  try {
    await adminApi.delete(`${BASE}/${id}`);
  } catch (error) {
    throw new Error(writeErrorMessage(error, '삭제하지 못했습니다.'));
  }
};

/** 종류 선택지. 저장된 값이 이 밖이어도 편집 폼이 그대로 보여준다 */
export const ENTRY_TYPES: Array<{ value: string; label: string }> = [
  { value: 'company', label: '회사' },
  { value: 'project', label: '프로젝트 (경력기술서)' },
  { value: 'education', label: '학력' },
  { value: 'certificate', label: '자격증' },
  { value: 'award', label: '수상' },
  { value: 'etc', label: '기타' },
];

/**
 * 편집 폼의 상태. 입력칸이 전부 문자열이라 목록 칸도 문자열로 들고 있다가 저장할 때 나눈다.
 * 날짜는 <input type="month"> 값(YYYY-MM)이다 — 경력기술서는 월까지만 쓴다.
 */
export interface CareerForm {
  entryType: string;
  company: string;
  title: string;
  team: string;
  role: string;
  startedMonth: string;
  endedMonth: string;
  summary: string;
  description: string;
  /** 한 줄에 하나 */
  achievements: string;
  /** 쉼표 구분 */
  techStack: string;
  /** 쉼표 구분 */
  tags: string;
  /** 한 줄에 하나 */
  referenceLinks: string;
}

export const emptyForm = (over: Partial<CareerForm> = {}): CareerForm => ({
  entryType: 'project',
  company: '',
  title: '',
  team: '',
  role: '',
  startedMonth: '',
  endedMonth: '',
  summary: '',
  description: '',
  achievements: '',
  techStack: '',
  tags: '',
  referenceLinks: '',
  ...over,
});

/** 저장된 항목 → 편집 폼. 참고 링크는 서버가 라벨/주소로 나눠 주므로 다시 한 줄로 붙인다 */
export const entryToForm = (e: CareerEntry): CareerForm => ({
  entryType: e.entryType,
  company: e.company ?? '',
  title: e.title,
  team: e.team ?? '',
  role: e.role ?? '',
  startedMonth: e.startedOn ? e.startedOn.slice(0, 7) : '',
  endedMonth: e.endedOn ? e.endedOn.slice(0, 7) : '',
  summary: e.summary ?? '',
  description: e.description ?? '',
  achievements: e.achievements.join('\n'),
  techStack: e.techStack.join(', '),
  tags: e.tags.join(', '),
  referenceLinks: e.referenceLinks
    .map((l) => (!l.url ? l.label : l.label === l.url ? l.url : `${l.label}: ${l.url}`))
    .join('\n'),
});

const lines = (value: string): string[] =>
  value
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);

const commas = (value: string): string[] =>
  value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

const orNull = (value: string): string | null => (value.trim() ? value.trim() : null);

/** 편집 폼 → 요청 본문. 월은 1일로 채운다(서버는 날짜를 받는다) */
export const formToInput = (f: CareerForm): CareerEntryInput => ({
  entryType: f.entryType,
  company: orNull(f.company),
  title: f.title.trim(),
  team: orNull(f.team),
  role: orNull(f.role),
  startedOn: f.startedMonth ? `${f.startedMonth}-01` : null,
  endedOn: f.endedMonth ? `${f.endedMonth}-01` : null,
  summary: orNull(f.summary),
  description: orNull(f.description),
  achievements: lines(f.achievements),
  techStack: commas(f.techStack),
  tags: commas(f.tags),
  referenceLinks: lines(f.referenceLinks),
});

/** 저장 전에 화면에서 먼저 막는 것. 서버도 같은 검사를 하지만 왕복 없이 알려준다 */
export const validateForm = (f: CareerForm): string | null => {
  if (!f.title.trim()) {
    return '제목을 입력해 주세요.';
  }
  if (f.startedMonth && f.endedMonth && f.endedMonth < f.startedMonth) {
    return '종료가 시작보다 빠릅니다.';
  }
  return null;
};

/**
 * 회사별로 묶는다. 서버가 최근 것부터 주므로 순서는 그대로 둔다 —
 * 회사는 회사 행이 나온 순서, 회사 안의 프로젝트도 나온 순서다.
 *
 * 회사 이름은 글자까지 같아야 묶인다. 회사 행 없이 프로젝트만 있는 회사도
 * 빠뜨리지 않고 머리 없는 묶음으로 만든다.
 */
export const groupCareer = (entries: CareerEntry[]): CareerGroups => {
  const projects = entries.filter((e) => e.entryType === 'project');
  const blocks: CompanyBlock[] = [];
  const byName = new Map<string, CompanyBlock>();

  for (const e of entries) {
    if (e.entryType !== 'company') continue;
    const name = e.company || e.title;
    if (byName.has(name)) continue;
    const block: CompanyBlock = { name, head: e, projects: [] };
    byName.set(name, block);
    blocks.push(block);
  }
  for (const p of projects) {
    if (!p.company) continue;
    let block = byName.get(p.company);
    if (!block) {
      block = { name: p.company, head: null, projects: [] };
      byName.set(p.company, block);
      blocks.push(block);
    }
    block.projects.push(p);
  }

  return {
    companies: blocks,
    personal: projects.filter((p) => !p.company),
    others: entries.filter((e) => e.entryType !== 'company' && e.entryType !== 'project'),
  };
};

const ym = (value: string): string => value.slice(0, 7).replace('-', '.');

/** 'YYYY.MM ~ YYYY.MM' — 끝이 없으면 '현재'. 시작일이 없으면 빈 문자열 */
export const formatPeriod = (entry: Pick<CareerEntry, 'startedOn' | 'endedOn'>): string => {
  if (!entry.startedOn) {
    return entry.endedOn ? ym(entry.endedOn) : '';
  }
  return `${ym(entry.startedOn)} ~ ${entry.endedOn ? ym(entry.endedOn) : '현재'}`;
};

/** 기간을 'n년 m개월' 로. 재직 중이면 오늘까지. 회사 행에만 쓴다 */
export const formatTenure = (
  entry: Pick<CareerEntry, 'startedOn' | 'endedOn'>,
  today: Date = new Date()
): string => {
  if (!entry.startedOn) return '';
  const [sy, sm] = entry.startedOn.split('-').map(Number);
  const [ey, em] = entry.endedOn
    ? entry.endedOn.split('-').map(Number)
    : [today.getFullYear(), today.getMonth() + 1];
  // 입사한 달과 퇴사한 달을 모두 센다(2021.03 ~ 2021.03 은 1개월)
  const months = (ey - sy) * 12 + (em - sm) + 1;
  if (months <= 0) return '';
  const y = Math.floor(months / 12);
  const m = months % 12;
  return [y ? `${y}년` : '', m ? `${m}개월` : ''].filter(Boolean).join(' ');
};

const entryToText = (e: CareerEntry, level: number): string => {
  const h = '#'.repeat(level);
  const lines: string[] = [`${h} ${e.title}`, ''];
  const meta: Array<[string, string]> = [
    ['기간', formatPeriod(e)],
    ['소속', [e.team, e.role].filter(Boolean).join(' / ')],
    ['기술', e.techStack.join(', ')],
  ];
  for (const [label, value] of meta) {
    if (value) lines.push(`- ${label}: ${value}`);
  }
  if (e.summary?.trim()) lines.push('', e.summary.trim());
  if (e.description?.trim()) lines.push('', e.description.trim());
  if (e.achievements.length) {
    lines.push('', '**성과**', '', ...e.achievements.map((a) => `- ${a}`));
  }
  return lines.join('\n');
};

/**
 * 전부를 마크다운 한 문서로. Claude 에게 붙여 넣어 경력기술서·자기소개를 쓰게 하려는 용도라
 * 화면과 같은 묶음(회사 → 프로젝트)을 제목 단계로 드러낸다.
 */
export const careerToText = (entries: CareerEntry[]): string => {
  const { companies, personal, others } = groupCareer(entries);
  const parts: string[] = [`# 경력 기록 ${entries.length}건`];

  for (const c of companies) {
    const period = c.head ? formatPeriod(c.head) : '';
    parts.push(`## ${c.name}${period ? ` (${period})` : ''}`);
    if (c.head) parts.push(entryToText(c.head, 3));
    c.projects.forEach((p) => parts.push(entryToText(p, 3)));
  }
  if (personal.length) {
    parts.push('## 개인 프로젝트');
    personal.forEach((p) => parts.push(entryToText(p, 3)));
  }
  if (others.length) {
    parts.push('## 기타 이력');
    others.forEach((o) => parts.push(entryToText(o, 3)));
  }
  return `${parts.join('\n\n')}\n`;
};
