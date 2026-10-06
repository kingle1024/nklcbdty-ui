import { CareerEntry, careerToText, formatPeriod, formatTenure, groupCareer } from './careerApi';

// 여기서 보는 건 순수 함수뿐이다. axios 1.x 는 ESM 이라 CRA jest 가 변환하지 못하고
// 불러오는 순간 'Cannot use import statement' 로 죽으므로 통째로 막아 둔다.
jest.mock('axios', () => ({}));
jest.mock('./adminApi', () => ({}));

const entry = (over: Partial<CareerEntry>): CareerEntry => ({
  id: 1,
  slug: 's',
  entryType: 'project',
  company: null,
  title: '제목',
  team: null,
  role: null,
  startedOn: null,
  endedOn: null,
  summary: null,
  description: null,
  achievements: [],
  techStack: [],
  tags: [],
  referenceLinks: [],
  updatedAt: null,
  ...over,
});

describe('groupCareer', () => {
  it('프로젝트를 같은 이름의 회사 아래로 묶고 나머지는 따로 둔다', () => {
    const groups = groupCareer([
      entry({ slug: 'co-b', entryType: 'company', company: 'B사', title: '백엔드' }),
      entry({ slug: 'b-1', company: 'B사' }),
      entry({ slug: 'mine' }),
      entry({ slug: 'co-a', entryType: 'company', company: 'A사', title: '개발' }),
      entry({ slug: 'cert', entryType: 'certificate' }),
      entry({ slug: 'b-2', company: 'B사' }),
    ]);

    expect(groups.companies.map((c) => c.name)).toEqual(['B사', 'A사']);
    expect(groups.companies[0].projects.map((p) => p.slug)).toEqual(['b-1', 'b-2']);
    expect(groups.personal.map((p) => p.slug)).toEqual(['mine']);
    expect(groups.others.map((p) => p.slug)).toEqual(['cert']);
  });

  it('회사 행 없이 프로젝트만 있는 회사도 빠뜨리지 않는다', () => {
    const groups = groupCareer([entry({ slug: 'c-1', company: 'C사' })]);

    expect(groups.companies).toHaveLength(1);
    expect(groups.companies[0].head).toBeNull();
    expect(groups.companies[0].projects[0].slug).toBe('c-1');
  });
});

describe('기간 표기', () => {
  it('끝이 없으면 현재', () => {
    expect(formatPeriod({ startedOn: '2021-03-02', endedOn: null })).toBe('2021.03 ~ 현재');
    expect(formatPeriod({ startedOn: '2018-03-01', endedOn: '2021-02-28' })).toBe('2018.03 ~ 2021.02');
    expect(formatPeriod({ startedOn: null, endedOn: null })).toBe('');
  });

  it('근속은 입사한 달과 퇴사한 달을 모두 센다', () => {
    expect(formatTenure({ startedOn: '2018-03-01', endedOn: '2021-02-28' })).toBe('3년');
    expect(formatTenure({ startedOn: '2021-03-01', endedOn: '2021-03-31' })).toBe('1개월');
    expect(formatTenure({ startedOn: '2021-03-01', endedOn: null }, new Date(2026, 9, 6))).toBe('5년 8개월');
  });
});

it('복사 문서는 회사 → 프로젝트 순서로 제목 단계를 나눈다', () => {
  const text = careerToText([
    entry({ slug: 'co', entryType: 'company', company: 'B사', title: '백엔드', startedOn: '2021-03-01' }),
    entry({ slug: 'p', company: 'B사', title: '정산 개편', achievements: ['배치 50% 단축'] }),
  ]);

  expect(text).toContain('## B사 (2021.03 ~ 현재)');
  expect(text.indexOf('### 백엔드')).toBeLessThan(text.indexOf('### 정산 개편'));
  expect(text).toContain('- 배치 50% 단축');
});
