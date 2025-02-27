import React from 'react';
import { IonList, IonItem } from '@ionic/react';

interface SidebarProps {
  activeTab: string;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab }) => {
  const handleTabClick = (tab: string) => {
    if (tab === 'profile') {
      window.location.href = '/mypage'; // 프로필 탭 클릭 시
    } else if (tab === 'likes') {
      window.location.href = '/mypage/likes'; // 좋아요 목록 탭 클릭 시
    } else if (tab === 'addCourse') {
      window.location.href = '/mypage/course/add'; // 데이트 코스 등록 클릭 시
    }
  };


  return (
    <div className="sidebar">
      <IonList>
        <IonItem
          button
          onClick={() => handleTabClick('profile')}
          className={activeTab === 'profile' ? 'active' : ''}
        >
          내 정보
        </IonItem>
        <IonItem
          button
          onClick={() => handleTabClick('likes')}
          className={activeTab === 'likes' ? 'active' : ''}
        >
          좋아요 목록
        </IonItem>
        <IonItem
          button
          onClick={() => handleTabClick('addCourse')}
          className={activeTab === 'addCourse' ? 'active' : ''}
        >
          데이트 코스 등록
        </IonItem>
      </IonList>
    </div>
  );
};

export default Sidebar;
