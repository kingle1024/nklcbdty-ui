// 공고 대비 이력서·포트폴리오 첨삭 (POST /api/resume-review). 서버 ResumeReviewController 와 짝이다.
//
// 로그인이 필요하다 — 서버 AllowedPaths 에 없어서 토큰이 없으면 401 이다.
// FormData 를 보내므로 Content-Type 은 직접 넣지 않는다(브라우저가 boundary 까지 채운다).
//
// 서버는 올린 파일·공고를 저장하지 않는다. 본문만 꺼내 AI 에 한 번 보내고 버린다.
import axios from 'axios';
import API_URL from '../config';
import { refreshOnce } from './UseTokenRefresh';

export type FitStatus = 'MATCHED' | 'PARTIAL' | 'MISSING';
export type ChangeType = 'REPLACE' | 'INSERT';

export interface ReviewFit {
  requirement: string;
  status: FitStatus;
  evidence: string;
}

export interface ReviewChange {
  type: ChangeType;
  section: string;
  before: string;
  after: string;
  reason: string;
  /** 원문에서 찾아 실제로 고친 글에 반영했는지. false 면 제안으로만 보여 준다. */
  applied: boolean;
}

export interface ReviewDocument {
  fileName: string;
  summary: string;
  originalText: string;
  revisedText: string;
  changes: ReviewChange[];
}

export interface ResumeReview {
  jobTitle: string;
  company: string;
  requirements: string[];
  fit: ReviewFit[];
  documents: ReviewDocument[];
  suggestions: string[];
  model: string;
}

export type ResumeReviewResult =
  | { ok: true; review: ResumeReview }
  | { ok: false; message: string };

const authHeaders = (): Record<string, string> => {
  const token = localStorage.getItem('jwtToken');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const messageFor = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    const message = (error.response?.data as { message?: string } | undefined)?.message;
    if (message && message.trim()) {
      return message.trim();
    }
    if (error.code === 'ECONNABORTED') {
      return 'AI 답이 너무 늦어 중단했습니다. 잠시 후 다시 시도해주세요.';
    }
    switch (error.response?.status) {
      case 401:
        return '로그인이 필요합니다. 다시 로그인해 주세요.';
      case 413:
        return '파일이 너무 큽니다. 파일 하나는 10MB, 합쳐서 25MB까지 올릴 수 있습니다.';
      case undefined:
        return '서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.';
      default:
        break;
    }
  }
  return '첨삭 중 문제가 생겼습니다. 잠시 후 다시 시도해주세요.';
};

export interface ResumeReviewInput {
  files: File[];
  jobUrl: string;
  jobText: string;
}

export const requestResumeReview = async (input: ResumeReviewInput): Promise<ResumeReviewResult> => {
  const send = () => {
    const form = new FormData();
    input.files.forEach((file) => form.append('files', file));
    if (input.jobText.trim()) {
      form.append('jobText', input.jobText.trim());
    } else if (input.jobUrl.trim()) {
      form.append('jobUrl', input.jobUrl.trim());
    }
    return axios.post<ResumeReview>(`${API_URL}/api/resume-review`, form, {
      headers: authHeaders(),
      // 서버가 AI 를 최대 80초 기다리고, 공고 페이지 읽기가 앞에 붙는다.
      timeout: 120_000,
    });
  };

  try {
    let response;
    try {
      response = await send();
    } catch (error) {
      // 액세스 토큰이 낡았으면 한 번 갱신해서 다시 보낸다.
      if (axios.isAxiosError(error) && error.response?.status === 401 && (await refreshOnce()) === 'ok') {
        response = await send();
      } else {
        throw error;
      }
    }
    return { ok: true, review: normalize(response.data) };
  } catch (error) {
    return { ok: false, message: messageFor(error) };
  }
};

/** 빠진 배열을 채워 화면이 undefined 로 죽지 않게 한다. */
const normalize = (raw: Partial<ResumeReview>): ResumeReview => ({
  jobTitle: raw.jobTitle ?? '',
  company: raw.company ?? '',
  requirements: raw.requirements ?? [],
  fit: raw.fit ?? [],
  documents: (raw.documents ?? []).map((d) => ({ ...d, changes: d.changes ?? [] })),
  suggestions: raw.suggestions ?? [],
  model: raw.model ?? '',
});
