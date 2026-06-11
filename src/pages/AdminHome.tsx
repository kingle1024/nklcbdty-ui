import React, { useState } from 'react';
import { useHistory } from 'react-router-dom';
import {
  IonPage,
  IonContent,
  IonButton,
  IonInput,
  IonSpinner,
  IonIcon,
} from '@ionic/react';
import { lockClosedOutline, peopleOutline, trashOutline, logOutOutline } from 'ionicons/icons';
import { Helmet } from 'react-helmet';
import CommonHeader from '../common/CommonHeader';
import AdminSidebar from '../common/AdminSidebar';
import adminApi, { setAdminAuth, clearAdminAuth, isAdminLoggedIn, getAdminDisplayName } from '../common/adminApi';

const AdminHome: React.FC = () => {
  const history = useHistory();
  const [loggedIn, setLoggedIn] = useState<boolean>(isAdminLoggedIn());
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!username || !password) {
      setError('아이디와 비밀번호를 입력하세요.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data } = await adminApi.post('/api/admin/login', { username, password });
      setAdminAuth(data.token, data.displayName);
      setLoggedIn(true);
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? '로그인에 실패했습니다.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    clearAdminAuth();
    setLoggedIn(false);
    setUsername('');
    setPassword('');
  };

  // 로그인 화면
  if (!loggedIn) {
    return (
      <IonPage>
        <Helmet>
          <title>관리자 로그인</title>
          <meta charSet="utf-8" />
        </Helmet>
        <CommonHeader />
        <IonContent>
          <div style={{ maxWidth: 360, margin: '60px auto', padding: 24, border: '1px solid #ececec', borderRadius: 12 }}>
            <div style={{ textAlign: 'center', marginBottom: 18 }}>
              <IonIcon icon={lockClosedOutline} style={{ fontSize: 36, color: '#3880ff' }} />
              <h2 style={{ margin: '8px 0 0' }}>관리자 로그인</h2>
            </div>
            <form onSubmit={handleLogin}>
              <div style={{ border: '1px solid #ddd', borderRadius: 8, padding: '2px 10px', marginBottom: 10 }}>
                <IonInput
                  value={username}
                  placeholder="아이디"
                  autocomplete="username"
                  onIonInput={(e) => setUsername(e.detail.value ?? '')}
                />
              </div>
              <div style={{ border: '1px solid #ddd', borderRadius: 8, padding: '2px 10px', marginBottom: 10 }}>
                <IonInput
                  type="password"
                  value={password}
                  placeholder="비밀번호"
                  autocomplete="current-password"
                  onIonInput={(e) => setPassword(e.detail.value ?? '')}
                />
              </div>
              {error && <div style={{ color: '#eb445a', fontSize: 13, marginBottom: 10 }}>{error}</div>}
              <IonButton expand="block" type="submit" disabled={loading}>
                {loading ? <IonSpinner name="crescent" /> : '로그인'}
              </IonButton>
            </form>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  // 대시보드 (로그인 후)
  const cardStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: 18,
    border: '1px solid #ececec',
    borderRadius: 12,
    cursor: 'pointer',
    background: '#fff',
  };

  return (
    <IonPage>
      <Helmet>
        <title>관리자</title>
        <meta charSet="utf-8" />
      </Helmet>
      <CommonHeader />
      <IonContent>
        <div style={{ display: 'flex', alignItems: 'flex-start' }}>
          <AdminSidebar />
          <div style={{ flex: 1, minWidth: 0, maxWidth: 800, margin: '0 auto', padding: 16 }}>
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <h1 style={{ margin: 0, fontSize: 22 }}>관리자 홈</h1>
                <p style={{ margin: '4px 0 0', color: '#888', fontSize: 13 }}>
                  {getAdminDisplayName() ?? '관리자'}님, 환영합니다.
                </p>
              </div>
              <IonButton fill="outline" color="medium" size="default" onClick={handleLogout}>
                <IonIcon slot="start" icon={logOutOutline} />
                로그아웃
              </IonButton>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
              <div style={cardStyle} onClick={() => history.push('/admin/subscriptions')}>
                <IonIcon icon={peopleOutline} style={{ fontSize: 28, color: '#3880ff' }} />
                <div>
                  <div style={{ fontWeight: 700 }}>구독 관리</div>
                  <div style={{ fontSize: 13, color: '#888' }}>구독자 현황 조회·관리</div>
                </div>
              </div>
              <div style={cardStyle} onClick={() => history.push('/admin/job-delete-requests')}>
                <IonIcon icon={trashOutline} style={{ fontSize: 28, color: '#eb445a' }} />
                <div>
                  <div style={{ fontWeight: 700 }}>공고 삭제요청</div>
                  <div style={{ fontSize: 13, color: '#888' }}>삭제요청 검토(승인/반려)</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default AdminHome;
