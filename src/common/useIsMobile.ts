import { useEffect, useState } from 'react';

/** 이 폭 이하를 모바일로 본다. Ionic 의 md breakpoint(768px)와 맞췄다. */
const MOBILE_MAX_WIDTH = 768;

const query = `(max-width: ${MOBILE_MAX_WIDTH}px)`;

/**
 * 모바일 폭인지 알려준다. 로그인은 PC 에서 모달, 모바일에서 /login 페이지로 열리므로
 * 창 크기를 바꿔도 따라오도록 matchMedia 를 구독한다.
 */
const useIsMobile = (): boolean => {
  const [isMobile, setIsMobile] = useState<boolean>(() => window.matchMedia(query).matches);

  useEffect(() => {
    const mediaQuery = window.matchMedia(query);
    const handleChange = (e: MediaQueryListEvent) => setIsMobile(e.matches);

    // Safari 13 이하는 addEventListener 를 지원하지 않아 addListener 로 대체한다.
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
    mediaQuery.addListener(handleChange);
    return () => mediaQuery.removeListener(handleChange);
  }, []);

  return isMobile;
};

export default useIsMobile;
