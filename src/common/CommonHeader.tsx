import React from 'react';
import { IonHeader, IonToolbar, IonTitle, IonButtons, IonButton } from '@ionic/react';
import { useHistory } from 'react-router-dom';
import { useAuth } from '../common/AuthContextType';
import KakaoLoginButton from '../components/KakoLoginButton';

const CommonHeader: React.FC = () => {
  const history = useHistory();
  const { logout, isLoggedIn } = useAuth();

  const handleTitleClick = () => {
    history.push('/');
  };

  return (
    <IonHeader>
      <IonToolbar>
        <IonTitle onClick={handleTitleClick} style={{ cursor: 'pointer' }}>Home</IonTitle>
        <IonButtons slot='end'>
          <IonButton routerLink="/email">이메일 문의</IonButton>
          {isLoggedIn ? (
            <>
              <IonButton routerLink="/mypage">마이페이지</IonButton>
              <IonButton onClick={logout}>로그아웃</IonButton>
            </>
          ) : (
            <KakaoLoginButton /> // 로그인하지 않은 경우 카카오 로그인 버튼 표시
          )}
        </IonButtons>
      </IonToolbar>
    </IonHeader>
  );
};

export default CommonHeader;
