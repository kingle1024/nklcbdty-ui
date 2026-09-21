import React, { useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import { IonContent, IonPage } from '@ionic/react';
import { Helmet } from 'react-helmet';
import CommonHeader from '../common/CommonHeader';
import Sidebar from '../common/Sidebar';
import { useAuth } from '../common/AuthContextType';
import ResumeMatch from '../components/ResumeMatch';
// 레이아웃(.mypage-container / .content / .sidebar)은 마이페이지와 공유한다.
import './Mypage.css';

/**
 * 마이페이지 &gt; 이력서 매칭.
 *
 * <p>매칭 자체는 로그인 없이도 되는 기능이지만(서버 AllowedPaths 에서 /api/jobs/** 는 공개),
 * 마이페이지 하위 메뉴라 형제 화면들과 같은 로그인 가드를 둔다.</p>
 */
const ResumeMatchPage: React.FC = () => {
  const history = useHistory();
  const { isLoggedIn } = useAuth();

  useEffect(() => {
    if (!isLoggedIn) {
      history.replace('/');
    }
  }, [isLoggedIn, history]);

  return (
    <IonPage>
      <Helmet>
        <title>이력서 매칭 | 네카라쿠배당토야</title>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="description" content="이력서 PDF를 올려 내용과 가장 가까운 채용 공고를 찾는다" />
      </Helmet>
      <CommonHeader />
      <IonContent>
        <div className="mypage-container">
          <Sidebar activeTab="resume" />
          <div className="content">
            <h2>이력서 매칭</h2>

            {/* 비로그인은 위 useEffect 가 메인으로 보낸다. 옮겨가는 동안 빈 화면만 둔다. */}
            {isLoggedIn && <ResumeMatch />}
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default ResumeMatchPage;
