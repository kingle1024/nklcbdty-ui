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
 */
const useInstallPrompt = () => {
  const [mode, setMode] = useState<InstallMode | null>(null);
  const [dismissed, setDismissed] = useState<boolean>(false);

  useEffect(() => {
    if (!isMobile() || isStandalone() || isRecentlyDismissed()) {
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
