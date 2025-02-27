import React from 'react';
import { IonContent, IonHeader, IonPage, IonTitle, IonToolbar } from '@ionic/react';
import ListContainer from '../components/ListContainer'
import { Helmet } from 'react-helmet';
import './Home.css';
import CommonHeader from '../common/CommonHeader';

const Home: React.FC = () => {

  return (
    <IonPage>
      <Helmet>
        <title>네카라쿠배당토야 공고</title>                
      </Helmet>
      <IonHeader>
        <IonToolbar>
          <IonTitle>네카라쿠배당토야</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen>
        <div className="container">
          <aside className="left-aside">
            <h2>메뉴</h2>
            <ul>
              <li><a href="#" onClick={() => { /* 메뉴 클릭 핸들러 */ }}>네이버</a></li>
              <li><a href="#" onClick={() => { /* 메뉴 클릭 핸들러 */ }}>라인</a></li>
            </ul>
          </aside>
          <main className="content">
            <ListContainer />
          </main>
          <aside className="right-aside">
            <h2>광고</h2>
            <p>여기에 광고 내용이 들어갑니다.</p>
          </aside>
        </div>
      </IonContent>
    </IonPage>
  );

};

export default Home;
