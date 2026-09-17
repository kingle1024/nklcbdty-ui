// 이력서 PDF → 나에게 맞는 공고 찾기 (POST /api/jobs/match).
//
// 다른 API 모듈과 달리 UseTokenRefresh 의 fetchWithToken 을 태우지 않는다. 이유 두 개:
//   1. fetchWithToken 은 POST 본문이 있으면 Content-Type: application/json 을 강제한다.
//      FormData 에 그 헤더가 붙으면 multipart 경계(boundary)가 사라져 서버가 파일을 못 읽는다.
//      브라우저가 스스로 채우게 두어야 한다.
//   2. fetchWithToken 은 jwtToken 이 없으면 logout() 을 부른다. /api/jobs/** 는 서버
//      AllowedPaths 에서 인증 없이 열려 있으므로, 토큰이 없다는 이유로 로그아웃시킬 이유가 없다.
//
// 서버는 업로드한 PDF 를 저장하지 않는다 — 텍스트를 추출해 임베딩한 뒤 바로 버린다.
import axios from 'axios';
import API_URL from '../config';

/** 서버 JobSearchController.JobSearchHit 와 같은 모양. */
export interface JobMatchHit {
  id: number | null;
  companyCd: string;
  annoSubject: string;
  classCdNm: string | null;
  subJobCdNm: string | null;
  sysCompanyCdNm: string | null;
  workplace: string | null;
  jobDetailLink: string;
  personalHistory: number;
  personalHistoryEnd: number;
  /** 코사인 유사도(-1~1). 실제로는 0.2~0.6 구간에 몰린다. */
  score: number;
}

/** 서버 spring.servlet.multipart.max-file-size 와 같은 값이어야 한다. */
export const MAX_RESUME_BYTES = 10 * 1024 * 1024;

/**
 * 성공/실패를 값으로 돌려준다. 커스텀 Error 클래스를 두지 않는 이유:
 * tsconfig 의 target 이 es5 라서 `class X extends Error` 는 프로토타입 사슬이 끊기고
 * `instanceof X` 가 조용히 false 가 된다 — 실패 문구를 만들어 놓고 못 쓰게 된다.
 */
export type ResumeMatchResult =
  | { ok: true; hits: JobMatchHit[] }
  | { ok: false; message: string };

/** 올릴 수 없는 파일이면 사용자에게 보여줄 이유를, 괜찮으면 null 을 준다. */
export const validateResumeFile = (file: File): string | null => {
  // 브라우저에 따라 type 이 비어 오기도 해서 확장자도 같이 본다.
  const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
  if (!isPdf) {
    return 'PDF 파일만 올릴 수 있습니다.';
  }
  if (file.size === 0) {
    return '빈 파일입니다. 다른 파일을 골라주세요.';
  }
  if (file.size > MAX_RESUME_BYTES) {
    const mb = (file.size / 1024 / 1024).toFixed(1);
    return `파일이 10MB를 넘습니다. (${mb}MB)`;
  }
  return null;
};

// 서버는 ResponseStatusException 의 사유를 응답 본문에 담아주지 않는다
// (server.error.include-message 기본값이 never라 message 가 빈 문자열로 온다).
// 그래서 상태 코드로 문구를 만들고, 혹시 본문에 message 가 실려 오면 그걸 우선한다.
const messageFor = (status?: number, serverMessage?: string): string => {
  if (serverMessage) {
    return serverMessage;
  }
  switch (status) {
    case 400:
      return 'PDF에서 텍스트를 읽지 못했습니다. 암호가 걸려 있거나 스캔 이미지로 만든 PDF는 처리할 수 없습니다.';
    case 413:
      return '파일이 너무 큽니다. 10MB 이하 PDF로 올려주세요.';
    case 503:
      return '공고 매칭을 준비하는 중입니다. 잠시 후 다시 시도해주세요.';
    default:
      return '공고를 찾는 중 문제가 생겼습니다. 잠시 후 다시 시도해주세요.';
  }
};

export const matchJobsByResume = async (file: File, k: number): Promise<ResumeMatchResult> => {
  const form = new FormData();
  // Content-Type 은 지정하지 않는다 — 브라우저가 boundary 까지 넣어 채운다.
  form.append('file', file);

  try {
    const response = await axios.post<JobMatchHit[]>(`${API_URL}/api/jobs/match`, form, {
      params: { k },
      // 이력서 임베딩 + 공고 전체 비교에 외부 임베딩 API 왕복까지 붙어 목록 API 보다 느리다.
      timeout: 60_000,
    });
    return { ok: true, hits: Array.isArray(response.data) ? response.data : [] };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const raw = (error.response?.data as { message?: string } | undefined)?.message;
      const serverMessage = raw && raw.trim() ? raw.trim() : undefined;
      return { ok: false, message: messageFor(error.response?.status, serverMessage) };
    }
    return { ok: false, message: messageFor() };
  }
};
