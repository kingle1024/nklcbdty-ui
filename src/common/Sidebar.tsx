import React from 'react';
import { IonList, IonItem } from '@ionic/react';
import { useHistory } from 'react-router-dom';

/** 마이페이지 안의 메뉴. activeTab 은 각 페이지가 자기 값을 넘긴다. */
const TABS = [
  { key: 'profile', label: '내 정보', path: '/mypage' },
  { key: 'calendar', label: '나의 캘린더', path: '/mypage/calendar' },
];

interface SidebarProps {
  activeTab: string;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab }) => {
  const history = useHistory();

  return (
    <div className="sidebar">
      <IonList>
        {TABS.map((tab) => (
          <IonItem
            key={tab.key}
            button
            onClick={() => history.push(tab.path)}
            className={activeTab === tab.key ? 'active' : ''}
          >
            {tab.label}
          </IonItem>
        ))}
      </IonList>
    </div>
  );
};

export default Sidebar;
