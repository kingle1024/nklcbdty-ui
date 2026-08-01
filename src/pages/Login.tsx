import React, { useEffect } from 'react';
import { IonPage, IonContent } from '@ionic/react';
import { useHistory } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import CommonHeader from '../common/CommonHeader';
import { useAuth } from '../common/AuthContextType';
import LoginForm from '../components/LoginForm';
import './Login.css';

/**
 * 모바일 로그인 화면. PC 는 헤더에서 모달로 열고, 모바일은 이 페이지로 이동한다.
 * 로그인에 성공하면 이전 화면(없으면 홈)으로 돌아간다.
 */
const Login: React.FC = () => {
  const history = useHistory();
  const { isLoggedIn } = useAuth();

  // 이미 로그인한 상태로 들어오면(뒤로가기 등) 머무를 이유가 없다.
  useEffect(() => {
    if (isLoggedIn) {
      history.replace('/');
    }
  }, [isLoggedIn, history]);

  const handleSuccess = () => {
    history.replace('/');
  };

  return (
    <IonPage>
      <Helmet>
        <title>로그인</title>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="description" content="네카라쿠배당토야 로그인 및 회원가입" />
      </Helmet>
      <CommonHeader />
      <IonContent>
        <div className="login-page">
          <h1 className="login-page__title">로그인</h1>
          <p className="login-page__lead">로그인하면 관심 공고와 알림 설정을 저장할 수 있어요.</p>
          <LoginForm onSuccess={handleSuccess} />
        </div>
      </IonContent>
    </IonPage>
  );
};

export default Login;
