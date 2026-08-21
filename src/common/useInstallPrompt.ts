import { useCallback, useEffect, useState } from 'react';

/** 크롬(안드로이드)이 설치 가능하다고 알려줄 때 오는 이벤트. 표준 타입에 아직 없다. */
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

/**
 * 'native' = 브라우저 설치 프롬프트를 띄울 수 있다.
 * 'ios' / 'android' = 설치 API 가 없어 손으로 하는 방법을 알려 준다.
 */
export type InstallMode = 'native' | 'ios' | 'android';

const DISMISSED_KEY = 'installPromptDismissedAt';
/** 닫기를 누르면 이 기간 동안 다시 띄우지 않는다. */
const DISMISS_DURATION = 7 * 24 * 60 * 60 * 1000;
/** useIsMobile 과 같은 기준(Ionic md breakpoint). */
const MOBILE_MAX_WIDTH = 768;

const getDeferredPrompt = () =>
  (window as unknown as { __deferredInstallPrompt?: BeforeInstallPromptEvent })
    .__deferredInstallPrompt;

const clearDeferredPrompt = () => {
  (window as unknown as { __deferredInstallPrompt?: BeforeInstallPromptEvent })
    .__deferredInstallPrompt = undefined;
};

/** 이미 홈 화면에서(앱처럼) 실행 중이면 안내할 필요가 없다. */
const isStandalone = () =>
  window.matchMedia?.('(display-mode: standalone)').matches === true ||
  (window.navigator as unknown as { standalone?: boolean }).standalone === true;

const isIos = () => {
  const ua = window.navigator.userAgent;
  // iPadOS 13+ 는 데스크톱 사파리로 위장하므로 터치 지원까지 함께 본다.
  return (
    /iPhone|iPad|iPod/.test(ua) ||
    (/Macintosh/.test(ua) && window.navigator.maxTouchPoints > 1)
  );
};

const isMobile = () =>
  /Android|iPhone|iPad|iPod|Mobile/i.test(window.navigator.userAgent) ||
  (window.navigator.maxTouchPoints > 0 && window.innerWidth <= MOBILE_MAX_WIDTH);

/**
 * 삼성 인터넷인가. **여기서는 설치를 권하지 않는다.**
 *
 * 삼성 인터넷은 PWA 를 설치할 때 WebAPK 를 기기 안에서 직접 만들어 서명한다
 * (크롬은 구글 서버가 만들어 서명한 것을 받아 온다). 그렇게 만든 APK 의
 * targetSdkVersion 이 낮아서, 안드로이드 14 이상은 설치를 막고 겁주는 창을 띄운다 —
 * "안전하지 않은 앱 차단됨 / 이 앱은 Android 이전 버전에 맞게 개발되었으며 최신
 * 개인 정보 보호 기능을 포함하지 않습니다" (2026-08-21 갤럭시에서 확인).
 *
 * 우리가 고칠 수 있는 값이 아니다 — targetSdkVersion 은 브라우저가 만드는 APK 안에
 * 있고 매니페스트에는 없다. 안내 문구를 어떻게 고쳐도 그 창은 그대로 뜬다. 그래서
 * 이 브라우저에서는 배너를 아예 띄우지 않는다. 겁주는 창으로 끝나는 길을 권하는
 * 것보다 없는 편이 낫다.
 *
 * 브라우저가 스스로 띄우는 설치 안내는 index.html 의 beforeinstallprompt 처리에서
 * 이미 preventDefault() 로 막혀 있어 여기서 더 할 일이 없다. 그래도 홈 화면에 두고
 * 싶은 사람은 브라우저 메뉴로 직접 추가할 수 있다 — 그 길까지 막을 수는 없다.
 */
const isSamsungInternet = () => /SamsungBrowser/.test(window.navigator.userAgent);

const isRecentlyDismissed = () => {
  try {
    const dismissedAt = Number(window.localStorage.getItem(DISMISSED_KEY));
    return !!dismissedAt && Date.now() - dismissedAt < DISMISS_DURATION;
  } catch {
    // 사파리 시크릿 모드 등에서 localStorage 접근이 막힐 수 있다.
    return false;
  }
};

/**
 * 모바일 웹에서 "홈 화면에 앱 추가" 안내를 띄울지 판단한다.
 *
 * - 안드로이드 크롬: beforeinstallprompt 가 오면 설치 프롬프트를 직접 띄운다.
 * - iOS 사파리·프롬프트가 오지 않는 브라우저: 손으로 추가하는 방법을 알려 준다.
 * - 삼성 인터넷: 아무것도 띄우지 않는다. 이유는 isSamsungInternet() 에 적어 두었다.
 */
const useInstallPrompt = () => {
  const [mode, setMode] = useState<InstallMode | null>(null);
  const [dismissed, setDismissed] = useState<boolean>(false);

  useEffect(() => {
    if (!isMobile() || isStandalone() || isRecentlyDismissed() || isSamsungInternet()) {
      return;
    }

    const syncMode = () => {
      if (getDeferredPrompt()) {
        setMode('native');
      } else {
        setMode(isIos() ? 'ios' : 'android');
      }
    };

    syncMode();

    const handleInstalled = () => {
      clearDeferredPrompt();
      setMode(null);
    };

    // index.html 이 먼저 받아 뒀을 수도, 마운트 이후에 올 수도 있다.
    window.addEventListener('deferredinstallpromptchange', syncMode);
    window.addEventListener('appinstalled', handleInstalled);

    return () => {
      window.removeEventListener('deferredinstallpromptchange', syncMode);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, []);

  const dismiss = useCallback(() => {
    try {
      window.localStorage.setItem(DISMISSED_KEY, String(Date.now()));
    } catch {
      // 저장에 실패해도 이번 방문에서는 닫아 둔다.
    }
    setDismissed(true);
  }, []);

  /** 브라우저 설치 프롬프트를 띄운다. 거절하면 배너는 닫아 둔다. */
  const install = useCallback(async () => {
    const deferredPrompt = getDeferredPrompt();
    if (!deferredPrompt) {
      return;
    }
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    clearDeferredPrompt();

    if (outcome === 'accepted') {
      setMode(null);
    } else {
      dismiss();
    }
  }, [dismiss]);

  return { visible: mode !== null && !dismissed, mode, install, dismiss };
};

export default useInstallPrompt;
