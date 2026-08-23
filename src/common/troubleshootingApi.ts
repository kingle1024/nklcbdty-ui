// 트러블슈팅 기록 열람 API. 백엔드 AdminTroubleshootingController(/api/admin/troubleshooting) 와 짝이다.
//
// 기록을 쓰는 쪽은 이 화면이 아니다 — 로컬의 save-troubleshooting 스킬이 DB 에 직접 넣고,
// 여기서는 읽기만 한다. 그래서 create/update/delete 가 없다.
//
// 기록에 사내·고객사 시스템 이름과 로그 원문이 그대로 들어 있어 관리자 경로에 둔다.
// adminApi 를 쓰므로 토큰이 자동으로 붙고, 401 이면 /admin 으로 되돌아간다.
import axios from 'axios';
import adminApi from './adminApi';

export type Severity = 'critical' | 'high' | 'medium' | 'low';

export interface TroubleshootingSummary {
  id: number;
  slug: string;
  /** 장애 발생일(YYYY-MM-DD). 기록한 날이 아니다 */
  occurredOn: string;
  project: string;
  component: string | null;
  title: string;
  severity: string | null;
  errorCode: string | null;
  /** 한 줄 교훈. 목록에서 미리보기로 쓴다 */
  lesson: string | null;
  tags: string[];
  techStack: string[];
  hasReferences: boolean;
  updatedAt: string | null;
}

/** 참고 링크 한 줄. url 이 없으면 링크가 아니라 메모(커밋 해시 등)다 */
export interface ReferenceLink {
  label: string;
  url: string | null;
}

export interface TroubleshootingDetail {
  id: number;
  slug: string;
  occurredOn: string;
  project: string;
  component: string | null;
  title: string;
  severity: string | null;
  errorCode: string | null;
  symptom: string | null;
  rootCause: string | null;
  resolution: string | null;
  verification: string | null;
  prevention: string | null;
  lesson: string | null;
  techStack: string[];
  tags: string[];
  referenceLinks: ReferenceLink[];
  createdAt: string | null;
  updatedAt: string | null;
}

export interface TroubleshootingPage {
  rows: TroubleshootingSummary[];
  totalElements: number;
  totalPages: number;
  pageNumber: number;
  pageSize: number;
  /** 필터 적용 전 전체 건수 */
  totalNotes: number;
  projects: string[];
  tags: string[];
  severityCounts: Record<string, number>;
}

export interface TroubleshootingQuery {
  keyword?: string;
  project?: string;
  severity?: string;
  tag?: string;
  page?: number;
  size?: number;
}

const BASE = '/api/admin/troubleshooting';

/** 서버가 준 메세지를 꺼낸다. 없으면 기본 문구 (boardApi 와 같은 방식) */
const messageOf = (error: unknown, fallback: string): string => {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { message?: string } | undefined;
    if (data?.message) {
      return data.message;
    }
    if (!error.response) {
      return '서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.';
    }
  }
  return fallback;
};

export const fetchNotes = async (query: TroubleshootingQuery): Promise<TroubleshootingPage> => {
  // 빈 값은 보내지 않는다 — 서버가 빈 문자열을 "조건 없음" 으로 보긴 하지만,
  // 주소가 지저분해지고 캐시 키가 갈라진다
  const params: Record<string, string | number> = {
    page: query.page ?? 0,
    size: query.size ?? 20,
  };
  if (query.keyword) params.keyword = query.keyword;
  if (query.project) params.project = query.project;
  if (query.severity) params.severity = query.severity;
  if (query.tag) params.tag = query.tag;

  try {
    const { data } = await adminApi.get<TroubleshootingPage>(BASE, { params });
    return data;
  } catch (error) {
    throw new Error(messageOf(error, '기록 목록을 가져오지 못했습니다.'));
  }
};

export const fetchNote = async (slug: string): Promise<TroubleshootingDetail> => {
  try {
    const { data } = await adminApi.get<TroubleshootingDetail>(`${BASE}/${encodeURIComponent(slug)}`);
    return data;
  } catch (error) {
    throw new Error(messageOf(error, '기록을 가져오지 못했습니다.'));
  }
};

/** 화면에 쓰는 심각도 표기. 저장된 값이 넷 중 하나가 아니어도 그대로 보여준다 */
export const severityMeta = (
  severity: string | null
): { label: string; className: string } => {
  switch ((severity ?? '').toLowerCase()) {
    case 'critical':
      return { label: 'critical', className: 'ts-sev critical' };
    case 'high':
      return { label: 'high', className: 'ts-sev high' };
    case 'medium':
      return { label: 'medium', className: 'ts-sev medium' };
    case 'low':
      return { label: 'low', className: 'ts-sev low' };
    default:
      return { label: severity || '미지정', className: 'ts-sev unknown' };
  }
};

/** 발생일(YYYY-MM-DD)을 'YYYY.MM.DD' 로. 서버가 날짜만 주므로 시간대 변환을 하지 않는다 */
export const formatOccurredOn = (value: string | null): string => {
  if (!value) {
    return '-';
  }
  const parts = value.split('-');
  return parts.length === 3 ? `${parts[0]}.${parts[1]}.${parts[2]}` : value;
};

/** 저장 시각 표기(연월일 + 시:분) */
export const formatStamp = (value: string | null): string => {
  if (!value) {
    return '-';
  }
  const date = new Date(value);
  if (isNaN(date.getTime())) {
    return value;
  }
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}.${pad(date.getMonth() + 1)}.${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

/**
 * 기록 한 건을 텍스트로 만든다. Claude 에게 붙여 넣어 참고시키려는 용도라,
 * 화면 모양이 아니라 **읽는 쪽이 구조를 알아볼 수 있는 형태**(마크다운)로 뽑는다.
 *
 * 비어 있는 절은 빈 제목만 남기지 않고 뺀다. 본문은 저장된 원문을 그대로 둔다 —
 * 증상에 든 에러 메시지를 다듬으면 붙여 넣는 의미가 없어진다.
 */
export const noteToText = (note: TroubleshootingDetail): string => {
  const lines: string[] = [`# ${note.title}`, ''];

  const meta: Array<[string, string | null]> = [
    ['발생일', formatOccurredOn(note.occurredOn)],
    ['프로젝트', note.project],
    ['구성요소', note.component],
    ['심각도', note.severity],
    ['에러 코드', note.errorCode],
    ['기술', note.techStack.length ? note.techStack.join(', ') : null],
    ['태그', note.tags.length ? note.tags.map((t) => `#${t}`).join(' ') : null],
    ['slug', note.slug],
  ];
  for (const [label, value] of meta) {
    if (value) {
      lines.push(`- ${label}: ${value}`);
    }
  }

  const sections: Array<[string, string | null]> = [
    ['교훈', note.lesson],
    ['증상', note.symptom],
    ['원인', note.rootCause],
    ['해결', note.resolution],
    ['검증', note.verification],
    ['재발 방지', note.prevention],
  ];
  for (const [title, body] of sections) {
    if (body && body.trim()) {
      lines.push('', `## ${title}`, '', body.trim());
    }
  }

  if (note.referenceLinks.length) {
    lines.push('', '## 참고', '');
    for (const link of note.referenceLinks) {
      if (!link.url) {
        // 주소가 없는 줄(커밋 해시 등)은 그대로
        lines.push(`- ${link.label}`);
      } else if (link.label === link.url) {
        // 라벨 없이 주소만 적힌 줄. 서버가 label 을 url 로 채워 주므로 그대로 쓰면 주소가 두 번 나온다
        lines.push(`- ${link.url}`);
      } else {
        lines.push(`- ${link.label}: ${link.url}`);
      }
    }
  }

  return `${lines.join('\n')}\n`;
};

/**
 * 클립보드에 넣는다. navigator.clipboard 는 보안 컨텍스트(https/localhost)에서만 있으므로,
 * 없거나 거부되면 textarea + execCommand 로 떨어진다. 성공 여부를 boolean 으로 준다 —
 * 실패했는데 "복사됨" 이 뜨면 사용자가 빈 클립보드를 붙여 넣게 된다.
 */
export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* 아래 예비 경로로 간다 */
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    // 화면 밖에 두되 focus 가 가능해야 한다. display:none 이면 선택이 안 된다.
    ta.style.position = 'fixed';
    ta.style.top = '-1000px';
    ta.setAttribute('readonly', 'true');
    document.body.appendChild(ta);
    ta.select();
    ta.setSelectionRange(0, text.length);
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
};
