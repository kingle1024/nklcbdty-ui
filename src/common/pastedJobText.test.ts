import { parsePastedJobText } from './pastedJobText';

describe('parsePastedJobText', () => {
  it('잡코리아 모바일 공유 글을 회사명·공고명·주소로 나눈다', () => {
    const pasted = [
      '[신세계디에프(면세점)] 시스템 경력채용(주)신세계디에프',
      'https://m.jobkorea.co.kr/info/app_down.asp?Gno=49822214',
    ].join('\n');

    expect(parsePastedJobText(pasted)).toEqual({
      url: 'https://m.jobkorea.co.kr/info/app_down.asp?Gno=49822214',
      companyName: '(주)신세계디에프',
      title: '[신세계디에프(면세점)] 시스템 경력채용',
    });
  });

  it('법인격 표기가 없으면 맨 앞 대괄호의 이름으로 회사명을 찾는다', () => {
    const pasted = '[신세계디에프(면세점)] 시스템 경력채용신세계디에프\nhttps://m.jobkorea.co.kr/info/app_down.asp?Gno=1';

    expect(parsePastedJobText(pasted)).toMatchObject({
      companyName: '신세계디에프',
      title: '[신세계디에프(면세점)] 시스템 경력채용',
    });
  });

  it('제목과 주소가 한 줄에 붙어 있어도 나눈다', () => {
    expect(parsePastedJobText('[토스] 서버 개발자 채용 주식회사비바리퍼블리카 https://toss.im/career/job-detail?id=1'))
      .toEqual({
        url: 'https://toss.im/career/job-detail?id=1',
        companyName: '주식회사비바리퍼블리카',
        title: '[토스] 서버 개발자 채용',
      });
  });

  it('회사명을 짐작할 수 없으면 제목만 주고 회사명은 비워 둔다', () => {
    expect(parsePastedJobText('시스템 경력직 채용\nhttps://example.com/jobs/1')).toEqual({
      url: 'https://example.com/jobs/1',
      companyName: '',
      title: '시스템 경력직 채용',
    });
  });

  it('회사명이 제목 중간에 나오면 제목의 일부로 둔다', () => {
    expect(parsePastedJobText('[카카오] 카카오 플랫폼 서버 개발\nhttps://careers.kakao.com/jobs/1')).toMatchObject({
      companyName: '',
      title: '[카카오] 카카오 플랫폼 서버 개발',
    });
  });

  it('주소만 붙여넣으면 주소만 준다', () => {
    expect(parsePastedJobText('https://careers.kakao.com/jobs/1')).toEqual({
      url: 'https://careers.kakao.com/jobs/1',
      companyName: '',
      title: '',
    });
  });

  it('주소 끝에 딸려 온 마침표는 떼어낸다', () => {
    expect(parsePastedJobText('공고 주소는 https://example.com/jobs/1 입니다.')?.url)
      .toBe('https://example.com/jobs/1');
  });

  it('주소가 없으면 null — 평소대로 붙여넣게 둔다', () => {
    expect(parsePastedJobText('(주)신세계디에프')).toBeNull();
    expect(parsePastedJobText('')).toBeNull();
  });

  it('셋째 줄부터는 버리지 않고 제목 뒤에 남긴다', () => {
    expect(parsePastedJobText('[토스] 서버 개발(주)비바리퍼블리카\nhttps://toss.im/career/1\n마감 9/30')?.title)
      .toBe('[토스] 서버 개발\n마감 9/30');
  });
});
