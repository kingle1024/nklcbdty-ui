import React, { useState } from 'react';
import { IonPage, IonContent } from '@ionic/react';
import { Helmet } from 'react-helmet';
import './Mypage.css';
import { useAuth } from '../common/AuthContextType';
import CommonHeader from '../common/CommonHeader';
import Sidebar from '../common/Sidebar';

const Mypage: React.FC = () => {  
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('profile'); // 기본 활성화된 탭 설정

  return (
    <IonPage>
      <Helmet>
        <title>마이페이지</title>
        <meta name="google-adsense-account" content="ca-pub-9366813459634197" />      
        <meta charSet="utf-8" />        
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="description" content="마이페이지" />
      </Helmet>
      <CommonHeader />
      <IonContent>
        <div className="mypage-container">
          <Sidebar activeTab={activeTab} />
          <div className="content">
            <h2>내 정보</h2>
            {user ? (
              <p>안녕하세요, {user.name}님!</p> // 사용자 이름 표시
            ) : (
              <p>사용자 정보를 불러오는 중입니다...</p>
            )}
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default Mypage;
