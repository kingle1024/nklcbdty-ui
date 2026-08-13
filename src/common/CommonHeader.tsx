import React, { useState } from 'react';
import { IonHeader, IonToolbar, IonTitle, IonButtons, IonButton } from '@ionic/react';
import { useHistory } from 'react-router-dom';
import { useAuth } from '../common/AuthContextType';
import useIsMobile from '../common/useIsMobile';
import LoginModal from '../components/LoginModal';

const CommonHeader: React.FC = () => {
  const history = useHistory();
  const { logout, isLoggedIn } = useAuth();
  const isMobile = useIsMobile();
  const [showLoginModal, setShowLoginModal] = useState(false);

  const handleTitleClick = () => {
    history.push('/');
  };

  // PC 는 모달로 띄우고, 모바일은 화면이 좁아 별도 로그인 페이지로 이동한다.
  const handleLoginClick = () => {
    if (isMobile) {
      history.push('/login');
    } else {
      setShowLoginModal(true);
    }
  };

  return (
    <>
    <IonHeader>
      <IonToolbar>
        <IonTitle onClick={handleTitleClick} style={{ cursor: 'pointer' }}>네카라쿠배당토야</IonTitle>
        <IonButtons slot='end'>
          <IonButton routerLink="/notice">공지사항</IonButton>
          <IonButton routerLink="/board">자유게시판</IonButton>
          <IonButton routerLink="/email">문의 및 건의사항</IonButton>
          {isLoggedIn ? (
            <>
              <IonButton routerLink="/mypage">마이페이지</IonButton>
              <IonButton onClick={logout}>로그아웃</IonButton>
            </>
          ) : (
            // 이메일 로그인/회원가입과 카카오 로그인을 한 화면에서 고르게 한다
            <IonButton onClick={handleLoginClick}>로그인</IonButton>
          )}
        </IonButtons>
      </IonToolbar>
    </IonHeader>
    {/* 오버레이는 ion-header 안에 두면 Ionic 이 template 에 가둬 열리지 않는다. 헤더 밖에 둔다. */}
    {!isMobile && (
      <LoginModal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} />
    )}
    </>
  );
};

export default CommonHeader;
