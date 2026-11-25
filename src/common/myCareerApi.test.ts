import { CareerEntry } from './careerApi';
import { myCareerErrorMessage, withListDefaults } from './myCareerApi';

// axios 1.x 는 ESM 이라 CRA jest 가 변환하지 못한다. 여기서 쓰는 건 isAxiosError 뿐이라 그것만 흉내 낸다
// (adminApi 는 불러오는 순간 axios.create 를 부르므로, 토큰 갱신 모듈은 axios 를 쓰므로 같이 막는다).
jest.mock('axios', () => ({ isAxiosError: (e: { isAxiosError?: boolean }) => !!e?.isAxiosError }));
jest.mock('./adminApi', () => ({}));
jest.mock('./UseTokenRefresh', () => ({ refreshOnce: jest.fn() }));

const axiosError = (status: number | null, data?: unknown) => ({
  isAxiosError: true,
  response: status === null ? undefined : { status, data },
});

describe('withListDefaults', () => {
  it('서버가 빠뜨린 목록 칸과 slug 를 채운다', () => {
    const raw = { id: 3, entryType: 'company', title: '회사' } as unknown as CareerEntry;
    const filled = withListDefaults(raw);
    expect(filled.achievements).toEqual([]);
    expect(filled.techStack).toEqual([]);
    expect(filled.tags).toEqual([]);
    expect(filled.referenceLinks).toEqual([]);
    expect(filled.slug).toBe('my-3');
  });

  it('있는 값은 그대로 둔다', () => {
    const raw = { id: 1, slug: null, techStack: ['Java'] } as unknown as CareerEntry;
    expect(withListDefaults(raw).techStack).toEqual(['Java']);
  });
});

describe('myCareerErrorMessage', () => {
  it('서버 메시지를 우선한다', () => {
    expect(myCareerErrorMessage(axiosError(400, { message: '제목을 입력해 주세요.' }), 'x')).toBe(
      '제목을 입력해 주세요.',
    );
  });

  it('메시지 없는 404 는 아직 배포 전인 서버로 본다', () => {
    expect(myCareerErrorMessage(axiosError(404), 'x')).toContain('아직 반영되지 않았습니다');
  });

  it('응답이 없으면 연결 실패', () => {
    expect(myCareerErrorMessage(axiosError(null), 'x')).toContain('연결할 수 없습니다');
  });

  it('axios 오류가 아니면 기본 문구', () => {
    expect(myCareerErrorMessage(new Error('boom'), '저장하지 못했습니다.')).toBe('저장하지 못했습니다.');
  });
});
