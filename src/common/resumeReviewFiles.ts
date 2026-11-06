// 첨삭에 올릴 파일 검사. axios 를 끌어오지 않게 API 모듈과 나눴다(Jest 가 axios ESM 을 못 읽는다).

/** 서버 ResumeReviewService.MAX_FILES 와 같다. */
export const MAX_REVIEW_FILES = 5;
/** 서버 spring.servlet.multipart.max-file-size / max-request-size 와 같다. */
export const MAX_REVIEW_FILE_BYTES = 10 * 1024 * 1024;
export const MAX_REVIEW_TOTAL_BYTES = 25 * 1024 * 1024;

const ACCEPTED_EXTENSIONS = ['.pdf', '.txt', '.md'];
export const ACCEPT_ATTRIBUTE = '.pdf,.txt,.md,application/pdf,text/plain,text/markdown';

const mb = (bytes: number) => (bytes / 1024 / 1024).toFixed(1);

/** 이미 고른 파일에 더할 수 없으면 이유를, 괜찮으면 null 을 준다. */
export const validateReviewFiles = (files: File[]): string | null => {
  if (files.length > MAX_REVIEW_FILES) {
    return `파일은 ${MAX_REVIEW_FILES}개까지 올릴 수 있습니다.`;
  }
  for (const file of files) {
    const lower = file.name.toLowerCase();
    if (!ACCEPTED_EXTENSIONS.some((ext) => lower.endsWith(ext))) {
      return `${file.name}: PDF, TXT, MD 파일만 올릴 수 있습니다. (Word 문서는 PDF 로 저장해서 올려주세요)`;
    }
    if (file.size === 0) {
      return `${file.name}: 빈 파일입니다.`;
    }
    if (file.size > MAX_REVIEW_FILE_BYTES) {
      return `${file.name}: 10MB를 넘습니다. (${mb(file.size)}MB)`;
    }
  }
  const total = files.reduce((sum, f) => sum + f.size, 0);
  if (total > MAX_REVIEW_TOTAL_BYTES) {
    return `파일을 합쳐 25MB까지 올릴 수 있습니다. (지금 ${mb(total)}MB)`;
  }
  return null;
};

