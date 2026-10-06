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
