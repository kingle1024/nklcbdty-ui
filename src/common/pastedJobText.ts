// 채용 공고를 "공유" 해서 복사한 글 한 덩어리를 회사명·공고명·주소로 나눈다.
//
// 잡코리아 모바일 공유가 주는 글이 이 모양이다:
//
//   [신세계디에프(면세점)] 시스템 경력채용(주)신세계디에프
//   https://m.jobkorea.co.kr/info/app_down.asp?Gno=49822214
//
// 제목과 회사명이 구분자 없이 붙어 있어서 회사명이 어디서 시작하는지는 짐작해야 한다.
// 짐작이 안 되면 회사명을 비워 두고 제목만 준다 — 억지로 자르면 엉뚱한 값이 들어가고,
// 회사명은 사용자가 직접 고치면 되지만 잘린 제목은 되돌릴 수 없다.

export interface ParsedJobText {
  /** 붙여넣은 글에서 찾은 첫 주소 */
  url: string;
  /** 알아내지 못하면 빈 문자열 */
  companyName: string;
  /** 회사명을 떼어낸 공고 제목. 뒤에 다른 줄이 더 있으면 함께 붙는다. */
  title: string;
}

const URL_PATTERN = /https?:\/\/[^\s<>"']+/i;

/** 주소 끝에 딸려 온 문장부호. 괄호는 주소에도 쓰이므로 건드리지 않는다. */
const TRAILING_PUNCTUATION = /[.,;]+$/;

/**
 * 회사명 앞에 붙는 법인격 표기. 뒤에 글자가 이어지면 거기서부터 끝까지를 회사명으로 본다.
 *
 * "신세계디에프(주)" 처럼 뒤에 붙는 표기는 회사명이 어디서 <b>시작</b>하는지를 알려주지 않아
 * 여기에 넣지 않는다. 그런 글은 아래 대괄호 규칙이 받는다.
 */
const ENTITY_PREFIXES = [
  '주식회사', '유한회사', '유한책임회사',
  '재단법인', '사단법인', '의료법인', '학교법인',
  '(주)', '㈜', '(유)', '(재)', '(사)',
];

/** 제목 맨 앞의 대괄호. 잡코리아는 여기에 회사 이름을 넣어 준다. */
const BRACKET_HEAD = /^\s*[[【]([^\]】]+)[\]】]/;

/** 법인격 표기가 시작하는 자리. 없으면 -1. */
const byEntityPrefix = (line: string): number => {
  let found = -1;
  for (const marker of ENTITY_PREFIXES) {
    const index = line.lastIndexOf(marker);
    // 맨 앞이면 제목이 통째로 회사명이 되고, 맨 뒤면 회사명이 표기만 남는다.
    if (index > 0 && index + marker.length < line.length && index > found) {
      found = index;
    }
  }
  return found;
};

/**
 * 맨 앞 대괄호에 적힌 이름이 글 끝에 한 번 더 나오면, 그 자리가 회사명의 시작이다.
 * 예) "[신세계디에프(면세점)] 시스템 경력채용신세계디에프"
 */
const byLeadingBracket = (line: string): number => {
  const head = BRACKET_HEAD.exec(line);
  if (!head) {
    return -1;
  }
  // "신세계디에프(면세점)" 처럼 괄호로 덧붙인 설명은 떼고 이름만 남긴다.
  const name = head[1].replace(/[(（][^)）]*[)）]/g, '').trim();
  if (name.length < 2) {
    return -1;
  }
  const rest = line.slice(head[0].length);
  const index = rest.lastIndexOf(name);
  // 회사명은 글 맨 끝에 붙는다. 중간에 있으면 제목의 일부다.
  if (index < 0 || index + name.length !== rest.trimEnd().length) {
    return -1;
  }
  return head[0].length + index;
};

const splitCompany = (line: string): { title: string; companyName: string } => {
  const index = [byEntityPrefix(line), byLeadingBracket(line)].find((found) => found > 0) ?? -1;
  if (index <= 0) {
    return { title: line.trim(), companyName: '' };
  }
  return { title: line.slice(0, index).trim(), companyName: line.slice(index).trim() };
};

/**
 * @param raw 붙여넣은 글 그대로
 * @return 나눈 결과. 주소가 없으면 우리가 손댈 글이 아니므로 null — 호출부는 평소대로 붙여넣으면 된다.
 */
export const parsePastedJobText = (raw: string): ParsedJobText | null => {
  if (!raw) {
    return null;
  }
  const match = URL_PATTERN.exec(raw);
  if (!match) {
    return null;
  }

  const url = match[0].replace(TRAILING_PUNCTUATION, '');
  // 주소를 덜어낸 나머지가 제목·회사명이다. 주소가 제목과 한 줄에 붙어 있어도 갈라지도록 줄바꿈을 남긴다.
  const lines = raw.replace(match[0], '\n')
                   .split(/\r?\n/)
                   .map((line) => line.trim())
                   .filter(Boolean);

  if (lines.length === 0) {
    return { url, companyName: '', title: '' };
  }

  const { title, companyName } = splitCompany(lines[0]);
  // 셋째 줄부터는 무엇인지 모른다. 버리지 말고 제목 뒤에 붙여 메모로 남긴다.
  return { url, companyName, title: [title, ...lines.slice(1)].filter(Boolean).join('\n') };
};
