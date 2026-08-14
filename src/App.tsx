import React, { useEffect } from 'react';
import { Route } from 'react-router-dom';
import { IonApp, IonRouterOutlet, setupIonicReact } from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import Home from './pages/Home';
import { AuthProvider } from './common/AuthContextType';
import { QueryClient, QueryClientProvider } from 'react-query';
import axios from 'axios';
import API_URL from './config';

/* Core CSS required for Ionic components to work properly */
import '@ionic/react/css/core.css';

/* Basic CSS for apps built with Ionic */
import '@ionic/react/css/normalize.css';
import '@ionic/react/css/structure.css';
import '@ionic/react/css/typography.css';

/* Optional CSS utils that can be commented out */
import '@ionic/react/css/padding.css';
import '@ionic/react/css/float-elements.css';
import '@ionic/react/css/text-alignment.css';
import '@ionic/react/css/text-transformation.css';
import '@ionic/react/css/flex-utils.css';
import '@ionic/react/css/display.css';

/* Theme variables */
import './theme.css';
import Mypage from './pages/Mypage';
import MyCalendar from './pages/MyCalendar';
import Calendar from './pages/Calendar';
import Login from './pages/Login';
import Email from './pages/EmailInquiry';
import AdminHome from './pages/AdminHome';
import AdminSubscriptions from './pages/AdminSubscriptions';
import AdminJobDeleteRequests from './pages/AdminJobDeleteRequests';
import Board from './pages/Board';
import BoardDetail from './pages/BoardDetail';
import BoardWrite from './pages/BoardWrite';

setupIonicReact();
const queryClient = new QueryClient();
const App: React.FC = () => {

  useEffect(() => {
    // cloudtype 서버 워밍업 — 목록/카테고리는 dodrambio KV 캐시가 응답하므로
    // 원본 서버가 잠들어 있기 쉽다. 방문자가 캐시된 목록을 보는 동안 미리 깨워두면
    // 로그인 등 캐싱 불가능한 실시간 API가 콜드스타트 없이 바로 응답한다.
    axios.get(`${API_URL}/api/job-delete-requests/pending-ids`).catch(() => undefined);
  }, []);

  return (
    <IonApp>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <IonReactRouter>
            <IonRouterOutlet>
              <Route path='/' component={Home} exact={true} />
              <Route path='/calendar' component={Calendar} exact={true} />
              <Route path='/mypage' component={Mypage} exact={true} />
              {/* 마이페이지 안의 나의 채용 캘린더. 로그인해야 쓸 수 있다. */}
              <Route path='/mypage/calendar' component={MyCalendar} exact={true} />
              <Route path='/login' component={Login} exact={true} />
              <Route path='/email' component={Email} exact={true} />
              <Route path='/admin' component={AdminHome} exact={true} />
              <Route path='/admin/subscriptions' component={AdminSubscriptions} exact={true} />
              <Route path='/admin/job-delete-requests' component={AdminJobDeleteRequests} exact={true} />

              {/* 자유게시판. :id 를 숫자로 못박아 /board/write 가 글 id 로 잡히지 않게 한다
                  (IonRouterOutlet 은 Switch 처럼 첫 매치만 쓰지 않아서 순서만으로는 부족하다) */}
              <Route path='/board' component={Board} exact={true} />
              <Route path='/board/write' component={BoardWrite} exact={true} />
              <Route path='/board/:id(\d+)/edit' component={BoardWrite} exact={true} />
              <Route path='/board/:id(\d+)' component={BoardDetail} exact={true} />

              {/* 공지사항. 작성은 관리자 API 로만 하므로 읽기 경로만 둔다 */}
              <Route path='/notice' exact={true} render={() => <Board boardType='notice' />} />
              <Route
                path='/notice/:id(\d+)'
                exact={true}
                render={() => <BoardDetail boardType='notice' />}
              />
            </IonRouterOutlet>
          </IonReactRouter>
        </AuthProvider>
      </QueryClientProvider>
    </IonApp>
  );
};


export default App;
