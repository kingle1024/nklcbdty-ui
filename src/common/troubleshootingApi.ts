// 트러블슈팅 기록 API. 백엔드 AdminTroubleshootingController(/api/admin/troubleshooting) 와 짝이다.
//
// 기록은 두 군데서 들어온다 — 로컬의 save-troubleshooting 스킬이 DB 에 직접 넣고,
// 관리자 화면에서도 추가·수정·삭제한다(아래 createNote/updateNote/deleteNote).
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

/**
 * 조건에 맞는 기록을 본문까지 전부 받아온다. 목록의 '전체 복사' 가 쓴다.
 *
 * 목록 응답에는 본문이 없어서 건마다 상세를 부르면 N+1 이 된다. 서버가 한 번에 준다.
 */
export const fetchNotesForExport = async (
  query: Omit<TroubleshootingQuery, 'page' | 'size'>
): Promise<TroubleshootingDetail[]> => {
  const params: Record<string, string> = {};
  if (query.keyword) params.keyword = query.keyword;
  if (query.project) params.project = query.project;
  if (query.severity) params.severity = query.severity;
  if (query.tag) params.tag = query.tag;

  try {
    const { data } = await adminApi.get<{ notes: TroubleshootingDetail[]; count: number }>(
      `${BASE}/export`,
      { params }
    );
    return data.notes ?? [];
  } catch (error) {
    throw new Error(messageOf(error, '기록을 가져오지 못했습니다.'));
  }
};

/**
 * 여러 건을 하나의 문서로 잇는다.
 *
 * 맨 위에 몇 건인지와 어떤 조건으로 뽑은 것인지를 적는다 — 붙여 넣은 쪽이 "이게 전부인가,
 * 걸러진 것인가" 를 알아야 하기 때문이다. 기록 사이는 `---` 로 끊어 경계를 분명히 한다.
 */
export const notesToText = (
  notes: TroubleshootingDetail[],
  filter: Omit<TroubleshootingQuery, 'page' | 'size'> = {}
): string => {
  const conditions: string[] = [];
  if (filter.keyword) conditions.push(`검색 '${filter.keyword}'`);
  if (filter.project) conditions.push(`프로젝트 ${filter.project}`);
  if (filter.severity) conditions.push(`심각도 ${filter.severity}`);
  if (filter.tag) conditions.push(`태그 #${filter.tag}`);

  const head = [
    `# 트러블슈팅 기록 ${notes.length}건`,
    '',
    conditions.length ? `조건: ${conditions.join(' · ')}` : '조건: 전체',
    '',
  ].join('\n');

  // noteToText 가 기록마다 '# 제목' 으로 시작하므로, 문서 제목과 섞이지 않게 한 단계 내린다
  const body = notes.map((n) => noteToText(n).replace(/^#/gm, '##').trim()).join('\n\n---\n\n');

  return `${head}\n${body}\n`;
};

/** 추가·수정 요청 본문. 백엔드 TroubleshootingNoteRequest 와 짝이다 */
export interface TroubleshootingInput {
  /** 추가할 때만. 비우면 서버가 만든다 */
  slug: string | null;
  occurredOn: string;
  project: string;
  component: string | null;
  title: string;
  severity: string | null;
  errorCode: string | null;
  symptom: string;
  rootCause: string;
  resolution: string;
  verification: string | null;
  prevention: string | null;
  lesson: string | null;
  techStack: string[];
  tags: string[];
  /** 한 줄에 하나. "라벨: https://..." 또는 주소만 */
  referenceLinks: string[];
}

/**
 * 쓰기 요청의 오류 문장. 서버가 준 message(검사 실패 등)가 있으면 그대로 쓴다.
 * 404/405 인데 message 가 없으면 편집 API 가 아직 없는 옛 서버다 — 프론트는 머지 즉시 뜨고
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
      return '서버에 트러블슈팅 편집 기능이 아직 반영되지 않았습니다.';
    }
    if (!error.response) {
      return '서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.';
    }
  }
  return fallback;
};

export const createNote = async (input: TroubleshootingInput): Promise<TroubleshootingDetail> => {
  try {
    const { data } = await adminApi.post<TroubleshootingDetail>(BASE, input);
    return data;
  } catch (error) {
    throw new Error(writeErrorMessage(error, '저장하지 못했습니다.'));
  }
};

export const updateNote = async (
  slug: string,
  input: TroubleshootingInput
): Promise<TroubleshootingDetail> => {
  try {
    const { data } = await adminApi.put<TroubleshootingDetail>(
      `${BASE}/${encodeURIComponent(slug)}`,
      input
    );
    return data;
  } catch (error) {
    throw new Error(writeErrorMessage(error, '저장하지 못했습니다.'));
  }
};

export const deleteNote = async (slug: string): Promise<void> => {
  try {
    await adminApi.delete(`${BASE}/${encodeURIComponent(slug)}`);
  } catch (error) {
    throw new Error(writeErrorMessage(error, '삭제하지 못했습니다.'));
  }
};

/** 편집 폼 상태. 입력칸이 전부 문자열이라 목록 칸도 문자열로 들고 있다가 저장할 때 나눈다 */
export interface NoteForm {
  slug: string;
  /** YYYY-MM-DD (<input type="date">) */
  occurredOn: string;
  project: string;
  component: string;
  title: string;
  severity: string;
  errorCode: string;
  symptom: string;
  rootCause: string;
  resolution: string;
  verification: string;
  prevention: string;
  lesson: string;
  /** 쉼표 구분 */
  techStack: string;
  /** 쉼표 구분 */
  tags: string;
  /** 한 줄에 하나 */
  referenceLinks: string;
}

/** 오늘 날짜(로컬 기준 YYYY-MM-DD). toISOString 은 UTC 라 새벽에 하루 전으로 나온다 */
const today = (): string => {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export const emptyNoteForm = (over: Partial<NoteForm> = {}): NoteForm => ({
  slug: '',
  occurredOn: today(),
  project: '',
  component: '',
  title: '',
  severity: 'medium',
  errorCode: '',
  symptom: '',
  rootCause: '',
  resolution: '',
  verification: '',
  prevention: '',
  lesson: '',
  techStack: '',
  tags: '',
  referenceLinks: '',
  ...over,
});

/** 참고 링크를 저장할 때의 한 줄 모양으로 되돌린다. 라벨 없이 주소만 있던 줄이 '주소: 주소' 로 불지 않게 */
export const linkToLine = (link: ReferenceLink): string =>
  !link.url ? link.label : link.label === link.url ? link.url : `${link.label}: ${link.url}`;

/** 저장된 기록 → 편집 폼 */
export const noteToForm = (n: TroubleshootingDetail): NoteForm => ({
  slug: n.slug,
  occurredOn: n.occurredOn,
  project: n.project,
  component: n.component ?? '',
  title: n.title,
  severity: n.severity ?? '',
  errorCode: n.errorCode ?? '',
  symptom: n.symptom ?? '',
  rootCause: n.rootCause ?? '',
  resolution: n.resolution ?? '',
  verification: n.verification ?? '',
  prevention: n.prevention ?? '',
  lesson: n.lesson ?? '',
  techStack: n.techStack.join(', '),
  tags: n.tags.join(', '),
  referenceLinks: n.referenceLinks.map(linkToLine).join('\n'),
});

const splitLines = (value: string): string[] =>
  value
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);

const splitCommas = (value: string): string[] =>
  value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

const orNull = (value: string): string | null => (value.trim() ? value.trim() : null);

/** 편집 폼 → 요청 본문. 본문 칸은 앞뒤 공백만 걷는다(에러 메시지 원문을 다듬지 않는다) */
export const noteFormToInput = (f: NoteForm): TroubleshootingInput => ({
  slug: orNull(f.slug),
  occurredOn: f.occurredOn,
  project: f.project.trim(),
  component: orNull(f.component),
  title: f.title.trim(),
  severity: orNull(f.severity),
  errorCode: orNull(f.errorCode),
  symptom: f.symptom.trim(),
  rootCause: f.rootCause.trim(),
  resolution: f.resolution.trim(),
  verification: orNull(f.verification),
  prevention: orNull(f.prevention),
  lesson: orNull(f.lesson),
  techStack: splitCommas(f.techStack),
  tags: splitCommas(f.tags),
  referenceLinks: splitLines(f.referenceLinks),
});

/** 저장 전에 화면에서 먼저 막는 것. 필수 칸은 서버·스킬과 같다 */
export const validateNoteForm = (f: NoteForm): string | null => {
  const required: Array<[keyof NoteForm, string]> = [
    ['occurredOn', '발생일'],
    ['project', '프로젝트'],
    ['title', '제목'],
    ['symptom', '증상'],
    ['rootCause', '원인'],
    ['resolution', '해결'],
  ];
  for (const [key, label] of required) {
    if (!f[key].trim()) {
      return `${label}을(를) 입력해 주세요.`;
    }
  }
  return null;
};
