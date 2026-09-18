import React from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { IonIcon } from '@ionic/react';
import { gridOutline, peopleOutline, trashOutline, homeOutline, logOutOutline, bugOutline } from 'ionicons/icons';
import { clearAdminAuth } from './adminToken';
import { useAuth } from './AuthContextType';

// 관리자 페이지 공통 사이드바. 신규 관리자 메뉴는 여기 MENU 에 추가하면 모든 관리자 페이지에 노출됨.
const MENU: Array<{ label: string; path: string; icon: string }> = [
  { label: '관리자 홈', path: '/admin', icon: gridOutline },
  { label: '구독 관리', path: '/admin/subscriptions', icon: peopleOutline },
  { label: '공고 삭제요청', path: '/admin/job-delete-requests', icon: trashOutline },
  { label: '트러블슈팅 기록', path: '/admin/troubleshooting', icon: bugOutline },
];

const AdminSidebar: React.FC = () => {
  const history = useHistory();
  const location = useLocation();
  const { user } = useAuth();
  // 관리자 이메일로 평소 로그인을 해 둔 사람(관리자 전용 로그인 세션이 아니다)
  const emailAdmin = user?.isAdmin === true;

  const handleLogout = () => {
    clearAdminAuth();
    history.replace('/admin');
  };

  return (
    <aside
      style={{
        flex: '0 0 200px',
        width: 200,
        alignSelf: 'stretch',
        borderRight: '1px solid #ececec',
        padding: '16px 10px',
        boxSizing: 'border-box',
      }}
    >
      <div style={{ fontSize: 13, fontWeight: 700, color: '#888', padding: '0 8px 10px' }}>
        관리자 메뉴
      </div>
      <nav style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {MENU.map((m) => {
          // 하위 화면(예: /admin/troubleshooting/<slug>)에서도 그 메뉴가 켜져 있어야 한다.
          // '/admin' 은 모든 관리자 경로의 앞부분이라 정확히 일치할 때만 켠다.
          const active =
            location.pathname === m.path ||
            (m.path !== '/admin' && location.pathname.startsWith(`${m.path}/`));
          return (
            <button
              key={m.path}
              type="button"
              onClick={() => history.push(m.path)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                width: '100%',
                padding: '10px 12px',
                border: 'none',
                borderRadius: 8,
                cursor: 'pointer',
                textAlign: 'left',
                fontSize: 14,
                fontWeight: active ? 700 : 500,
                color: active ? '#3880ff' : '#333',
                background: active ? 'rgba(56,128,255,0.12)' : 'transparent',
              }}
            >
              <IonIcon icon={m.icon} style={{ fontSize: 18 }} />
              {m.label}
            </button>
          );
        })}
      </nav>

      <div style={{ marginTop: 16, borderTop: '1px solid #ececec', paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>
        <button
          type="button"
          onClick={() => history.push('/')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            width: '100%',
            padding: '10px 12px',
            border: 'none',
            borderRadius: 8,
            cursor: 'pointer',
            textAlign: 'left',
            fontSize: 14,
            color: '#666',
            background: 'transparent',
          }}
        >
          <IonIcon icon={homeOutline} style={{ fontSize: 18 }} />
          서비스 홈으로
        </button>
        {/* 관리자 이메일로 로그인한 경우엔 관리자 전용 세션이 따로 없다. 로그아웃은 헤더에서 한다. */}
        {!emailAdmin && (
          <button
            type="button"
            onClick={handleLogout}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              width: '100%',
              padding: '10px 12px',
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer',
              textAlign: 'left',
              fontSize: 14,
              color: '#eb445a',
              background: 'transparent',
            }}
          >
            <IonIcon icon={logOutOutline} style={{ fontSize: 18 }} />
            로그아웃
          </button>
        )}
      </div>
    </aside>
  );
};

export default AdminSidebar;
