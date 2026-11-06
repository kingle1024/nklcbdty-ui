import { validateReviewFiles } from './resumeReviewFiles';

const fileOf = (name: string, size: number) => {
  const file = new File(['x'], name);
  Object.defineProperty(file, 'size', { value: size });
  return file;
};

describe('validateReviewFiles', () => {
  it('PDF·TXT·MD 는 받는다', () => {
    expect(validateReviewFiles([fileOf('이력서.PDF', 10), fileOf('포트폴리오.md', 10), fileOf('a.txt', 1)])).toBeNull();
  });

  it('Word 문서는 PDF 로 저장하라고 안내한다', () => {
    expect(validateReviewFiles([fileOf('이력서.docx', 10)])).toContain('PDF 로 저장');
  });

  it('5개를 넘기면 거절한다', () => {
    const six = Array.from({ length: 6 }, (_, i) => fileOf(`${i}.pdf`, 10));
    expect(validateReviewFiles(six)).toContain('5개까지');
  });

  it('파일 하나 10MB, 합쳐서 25MB 를 넘기면 거절한다', () => {
    expect(validateReviewFiles([fileOf('big.pdf', 11 * 1024 * 1024)])).toContain('10MB');
    const three = [1, 2, 3].map((i) => fileOf(`${i}.pdf`, 9 * 1024 * 1024));
    expect(validateReviewFiles(three)).toContain('25MB');
  });

  it('빈 파일은 거절한다', () => {
    expect(validateReviewFiles([fileOf('empty.pdf', 0)])).toContain('빈 파일');
  });
});
