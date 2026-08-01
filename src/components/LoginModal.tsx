import React from 'react';
import { IonModal, IonButton, IonIcon } from '@ionic/react';
import { closeOutline } from 'ionicons/icons';
import LoginForm from './LoginForm';
import './LoginModal.css';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/** PC 에서 헤더의 로그인 버튼을 누르면 열리는 로그인/회원가입 모달. */
const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose }) => (
  <IonModal isOpen={isOpen} onDidDismiss={onClose} className="login-modal">
    <div className="login-modal__body">
      <header className="login-modal__header">
        <h2>네카라쿠배당토야</h2>
        <IonButton fill="clear" size="small" aria-label="닫기" onClick={onClose}>
          <IonIcon slot="icon-only" icon={closeOutline} />
        </IonButton>
      </header>
      <p className="login-modal__lead">로그인하면 관심 공고와 알림 설정을 저장할 수 있어요.</p>
      <LoginForm onSuccess={onClose} />
    </div>
  </IonModal>
);

export default LoginModal;
