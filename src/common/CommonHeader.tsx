import React, { useState } from 'react';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonIcon,
  IonItem,
  IonList,
  IonPopover,
} from '@ionic/react';
import { menuOutline } from 'ionicons/icons';
import { useHistory } from 'react-router-dom';
import { useAuth } from '../common/AuthContextType';
import useIsMobile from '../common/useIsMobile';
import LoginModal from '../components/LoginModal';
import './CommonHeader.css';

/** 상단 메뉴. 모바일에선 폭이 모자라 전부 못 넣으므로 햄버거 안으로 접는다. */
const NAV_LINKS = [
  { label: '채용 캘린더', path: '/calendar' },
  { label: '공지사항', path: '/notice' },
  { label: '자유게시판', path: '/board' },
  { label: '문의 및 건의사항', path: '/email' },
];

const CommonHeader: React.FC = () => {
  const history = useHistory();
  const { logout, isLoggedIn } = useAuth();
  const isMobile = useIsMobile();
  const [showLoginModal, setShowLoginModal] = useState(false);
  // 팝오버는 누른 버튼에 붙여야 해서 클릭 이벤트를 그대로 들고 있는다.
  const [menuEvent, setMenuEvent] = useState<MouseEvent | undefined>(undefined);

  const closeMenu = () => setMenuEvent(undefined);

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

  const goFromMenu = (path: string) => {
    closeMenu();
    history.push(path);
  };

  return (
    <>
    <IonHeader>
      <IonToolbar>
        <IonTitle onClick={handleTitleClick} className="common-header__title">네카라쿠배당토야</IonTitle>
        <IonButtons slot='end'>
          {isMobile ? (
            <IonButton
              className="common-header__menu-btn"
              aria-label="메뉴 열기"
              onClick={(e) => setMenuEvent(e.nativeEvent)}
            >
              <IonIcon slot="icon-only" icon={menuOutline} />
            </IonButton>
          ) : (
            <>
              {NAV_LINKS.map((link) => (
                <IonButton key={link.path} routerLink={link.path}>{link.label}</IonButton>
              ))}
              {isLoggedIn ? (
                <>
                  <IonButton routerLink="/mypage">마이페이지</IonButton>
                  <IonButton onClick={logout}>로그아웃</IonButton>
                </>
              ) : (
                // 이메일 로그인/회원가입과 카카오 로그인을 한 화면에서 고르게 한다
                <IonButton onClick={handleLoginClick}>로그인</IonButton>
              )}
            </>
          )}
        </IonButtons>
      </IonToolbar>
    </IonHeader>
    {/* 오버레이는 ion-header 안에 두면 Ionic 이 template 에 가둬 열리지 않는다. 헤더 밖에 둔다. */}
    {isMobile && (
      <IonPopover
        className="common-header__menu"
        isOpen={menuEvent !== undefined}
        event={menuEvent}
        onDidDismiss={closeMenu}
        side="bottom"
        alignment="end"
      >
        <IonList lines="full">
          {NAV_LINKS.map((link) => (
            <IonItem key={link.path} button detail={false} onClick={() => goFromMenu(link.path)}>
              {link.label}
            </IonItem>
          ))}
          {isLoggedIn ? (
            <>
              <IonItem button detail={false} onClick={() => goFromMenu('/mypage')}>마이페이지</IonItem>
              <IonItem
                button
                detail={false}
                lines="none"
                onClick={() => {
                  closeMenu();
                  logout();
                }}
              >
                로그아웃
              </IonItem>
            </>
          ) : (
            <IonItem
              button
              detail={false}
              lines="none"
              onClick={() => {
                closeMenu();
                handleLoginClick();
              }}
            >
              로그인
            </IonItem>
          )}
        </IonList>
      </IonPopover>
    )}
    {!isMobile && (
      <LoginModal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} />
    )}
    </>
  );
};

export default CommonHeader;
