import React, { useState } from 'react';
import { IonContent, IonHeader, IonPage, IonTitle, IonToolbar } from '@ionic/react';
import ListContainer from '../components/ListContainer';
import { Helmet } from 'react-helmet';
import './Home.css';

// 직군 목록
const techCategories = [
  'Backend',
  'Frontend',
  'Infra',
  'QA',
  'Full Stack',
  'App',
  'Engineering'
];

// Support 목록
const supportCategories = [
  'Business',
  'etc'
];

const Home: React.FC = () => {
  // State to store filter criteria
  const [filters, setFilters] = useState({
    employmentType: '',
    careerPeriod: '',
    categories: [] as string[], // 기본적으로 모든 Tech 카테고리 체크 해제
    supportCategories: [] as string[], // Support 섹션 추가
  });

  // State to manage the visibility of categories
  const [showTechCategories, setShowTechCategories] = useState(true); // 기본적으로 펼쳐진 상태
  const [showSupportCategories, setShowSupportCategories] = useState(false);

  // Function to handle filter change
  const handleFilterChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { value, checked, name } = event.target;

    setFilters(prevFilters => {
      const categories = Array.isArray(prevFilters.categories) ? prevFilters.categories : [];
      const supportCategories = Array.isArray(prevFilters.supportCategories) ? prevFilters.supportCategories : [];

      const newCategories = name === "categories"
        ? checked
          ? [...categories, value] // 체크된 경우 추가
          : categories.filter(category => category !== value) // 체크 해제된 경우 제거
        : categories; // Categories 유지

      const newSupportCategories = name === "supportCategories"
        ? checked
          ? [...supportCategories, value] // 체크된 경우 추가
          : supportCategories.filter(category => category !== value) // 체크 해제된 경우 제거
        : supportCategories; // Support 카테고리 유지

      return {
        ...prevFilters,
        categories: newCategories,
        supportCategories: newSupportCategories,
      };
    });
  };

  // Toggle function for category visibility
  const toggleTechCategories = () => {
    setShowTechCategories(prev => !prev);
  };

  const toggleSupportCategories = () => {
    setShowSupportCategories(prev => !prev);
  };

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
            <h2>필터</h2>
            <form>
              <div>
                <span onClick={toggleTechCategories} style={{ cursor: 'pointer', color: '#007bff', fontWeight: 'bold' }}>
                  Tech
                </span>
                {showTechCategories && (
                  <div className="category-list">
                    {techCategories.map(category => (
                      <div key={category}>
                        <input
                          type="checkbox"
                          id={category}
                          value={category}
                          name="categories" // 필터 이름 지정
                          checked={filters.categories.includes(category)} // 체크 상태
                          onChange={handleFilterChange}
                        />
                        <label htmlFor={category}>{category}</label>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <span onClick={toggleSupportCategories} style={{ cursor: 'pointer', color: '#007bff', fontWeight: 'bold' }}>
                  Support
                </span>
                {showSupportCategories && (
                  <div className="category-list">
                    {supportCategories.map(category => (
                      <div key={category}>
                        <input
                          type="checkbox"
                          id={category}
                          value={category}
                          name="supportCategories" // 필터 이름 지정
                          onChange={handleFilterChange}
                        />
                        <label htmlFor={category}>{category}</label>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </form>
          </aside>
          <main className="content">
            <ListContainer filters={filters} />
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
