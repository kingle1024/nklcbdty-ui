import React, { useState } from 'react';
import { IonButton, IonIcon } from '@ionic/react';
import { closeOutline } from 'ionicons/icons';
import useInstallPrompt from '../common/useInstallPrompt';
import './InstallPrompt.css';

/** 브라우저마다 "홈 화면에 추가"까지 가는 길이 달라 각각 적어 준다. */
const STEPS: Record<'ios' | 'android', string[]> = {
  ios: [
    '사파리 하단의 공유 버튼(⬆)을 누르세요.',
    "목록에서 '홈 화면에 추가'를 고르세요.",
    "오른쪽 위 '추가'를 누르면 끝입니다.",
  ],
  android: [
    '브라우저 오른쪽 위 ⋮ 를 누르세요.',
    "'앱 설치' 또는 '홈 화면에 추가'를 고르세요.",
    "'설치'를 누르면 끝입니다.",
  ],
};

/**
 * 모바일 웹에서 홈 화면에 추가하도록 안내하는 하단 배너.
 * 이미 설치했거나 PC 로 보는 중이면 아무것도 그리지 않는다.
 */
const InstallPrompt: React.FC = () => {
  const { visible, mode, install, dismiss } = useInstallPrompt();
  const [showSteps, setShowSteps] = useState<boolean>(false);

  if (!visible) {
    return null;
  }

  // 손으로 추가하는 순서. 설치 프롬프트가 오는 브라우저에서는 필요 없다.
  const steps = mode === 'ios' || mode === 'android' ? STEPS[mode] : null;

  const handleClick = () => {
    if (mode === 'native') {
      install();
    } else {
      // 설치 API 가 없는 브라우저다. 손으로 하는 방법을 펼쳐 준다.
      setShowSteps((prev) => !prev);
    }
  };

  return (
    <div className="install-prompt" role="complementary" aria-label="홈 화면에 앱 추가 안내">
      <div className="install-prompt__row">
        <img className="install-prompt__icon" src="/assets/icon/icon.png" alt="" />

        <div className="install-prompt__text">
          <strong className="install-prompt__title">홈 화면에 앱 추가</strong>
          <span className="install-prompt__desc">
            추가해 두면 앱처럼 바로 열어 공고를 볼 수 있어요.
          </span>
        </div>

        <IonButton size="small" className="install-prompt__cta" onClick={handleClick}>
          {mode === 'native' ? '추가' : showSteps ? '닫기' : '방법'}
        </IonButton>

        <IonButton
          fill="clear"
          size="small"
          className="install-prompt__close"
          aria-label="안내 닫기"
          onClick={dismiss}
        >
          <IonIcon slot="icon-only" icon={closeOutline} />
        </IonButton>
      </div>

      {steps && showSteps && (
        <ol className="install-prompt__steps">
          {steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      )}
    </div>
  );
};

export default InstallPrompt;
