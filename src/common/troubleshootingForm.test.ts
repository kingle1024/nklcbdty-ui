import { TroubleshootingDetail, emptyNoteForm, noteFormToInput, noteToForm, validateNoteForm } from './troubleshootingApi';

// 순수 함수만 본다. axios 1.x 는 ESM 이라 CRA jest 가 변환하지 못하므로 막아 둔다(careerApi.test 와 같은 이유)
jest.mock('axios', () => ({}));
jest.mock('./adminApi', () => ({}));

const note = (over: Partial<TroubleshootingDetail> = {}): TroubleshootingDetail => ({
  id: 1,
  slug: 'a-note',
  occurredOn: '2026-10-07',
  project: 'nklcbdty-service',
  component: null,
  title: '제목',
  severity: 'high',
  errorCode: null,
  symptom: '  ERROR 1062\n    at Foo.bar(Foo.java:10)',
  rootCause: '원인',
  resolution: '해결',
  verification: null,
  prevention: null,
  lesson: null,
  techStack: ['Java'],
  tags: ['race-condition', 'batch'],
  referenceLinks: [
    { label: 'PR', url: 'https://example.com/1' },
    { label: 'https://example.com/2', url: 'https://example.com/2' },
    { label: '머지 커밋: abc1234', url: null },
  ],
  createdAt: null,
  updatedAt: null,
  ...over,
});

it('저장된 기록을 폼으로 열었다 그대로 저장하면 값이 바뀌지 않는다', () => {
  const input = noteFormToInput(noteToForm(note()));

  expect(input.occurredOn).toBe('2026-10-07');
  expect(input.severity).toBe('high');
  expect(input.component).toBeNull();
  expect(input.tags).toEqual(['race-condition', 'batch']);
  expect(input.referenceLinks).toEqual(['PR: https://example.com/1', 'https://example.com/2', '머지 커밋: abc1234']);
  // 로그 안쪽 들여쓰기는 남고 앞뒤 공백만 걷힌다
  expect(input.symptom).toBe('ERROR 1062\n    at Foo.bar(Foo.java:10)');
});

it('새 기록은 slug 를 비우면 null 로 보내 서버가 만들게 한다', () => {
  const input = noteFormToInput(
    emptyNoteForm({ project: 'p', title: 't', symptom: 's', rootCause: 'r', resolution: 'x', severity: '' })
  );

  expect(input.slug).toBeNull();
  expect(input.severity).toBeNull();
});

it('필수 칸이 비면 그 칸 이름으로 막는다', () => {
  const ok = emptyNoteForm({ project: 'p', title: 't', symptom: 's', rootCause: 'r', resolution: 'x' });

  expect(validateNoteForm(ok)).toBeNull();
  expect(validateNoteForm({ ...ok, rootCause: '  ' })).toContain('원인');
  expect(validateNoteForm({ ...ok, occurredOn: '' })).toContain('발생일');
});
