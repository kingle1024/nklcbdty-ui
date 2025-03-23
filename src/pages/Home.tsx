import React, { useState, useEffect } from 'react';
import axios from 'axios';
import API_URL from "../config";
import { IonContent, IonFooter, IonHeader, IonPage, IonText, IonTitle, IonToolbar } from '@ionic/react';
import ListContainer from '../components/ListContainer';
import { Helmet } from 'react-helmet';
import './Home.css';

// 필터 타입 정의
export interface Filters {
  employmentType: string;
  careerPeriod: string;
  categories: {
    [key: string]: string[];
  };
}

interface CategoryDtl {
  id: number;
  name: string;
}

interface CategoryMst {
  id: number;
  name: string;
  categoryDtls: CategoryDtl[];
  visible: boolean;
}

const Home: React.FC = () => {
  const [categoriesData, setCategoriesData] = useState<CategoryMst[]>([]);
  const [filters, setFilters] = useState<Filters>({
    employmentType: '',
    careerPeriod: '',
    categories: {},
  });

  // 카테고리 데이터 로드
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await axios.get(`${API_URL}/api/category/list`); // API 엔드포인트 수정
        setCategoriesData(response.data);

        // 필터 초기화
        const initialFilters = {
          employmentType: '',
          careerPeriod: '',
          categories: response.data.reduce((acc: Record<string, string[]>, category: CategoryMst) => {
            acc[category.name.toLowerCase()] = []; // 초기 카테고리 배열을 빈 배열로 설정
            return acc;
          }, {}),
        };
        
        setFilters(initialFilters);
        
      } catch (error) {
        console.error('Error fetching categories:', error);
      }
    };

    fetchCategories();
  }, []);

  // State to manage the visibility of categories
  const [visibleCategories, setVisibleCategories] = useState<Record<string, boolean>>({});

  // Function to handle filter change
  const handleFilterChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { value, checked, name } = event.target;

    setFilters((prevFilters) => {
      const currentCategories = prevFilters.categories[name.toLowerCase() as keyof Filters['categories']];
      const newCategories = checked
        ? [...currentCategories, value] // 체크된 경우 추가
        : currentCategories.filter((category) => category !== value); // 체크 해제된 경우 제거

      return {
        ...prevFilters,
        categories: {
          ...prevFilters.categories,
          [name.toLowerCase() as keyof Filters['categories']]: newCategories, // 동적으로 업데이트
        },
      };
    });
  };

  // Toggle function for category visibility
  const toggleCategories = (title: string) => {
    setVisibleCategories((prev) => ({
      ...prev,
      [title]: !prev[title], // 현재 상태를 반전
    }));
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
              {categoriesData.map((categoryData) => {
                // visible 상태 초기화
                const isVisible = visibleCategories[categoryData.name] !== undefined
                  ? visibleCategories[categoryData.name]
                  : categoryData.visible; // 기본값을 categoryData.visible로 설정

                return (
                  <div key={categoryData.id}>
                    <span
                      onClick={() => toggleCategories(categoryData.name)}
                      style={{ cursor: 'pointer', color: '#007bff', fontWeight: 'bold' }}
                    >
                      {categoryData.name}
                    </span>
                    {isVisible && ( // visible이 true일 때만 하위 카테고리 표시
                      <div className="category-list">
                        {categoryData.categoryDtls.map((categoryDtl) => (
                          <div key={categoryDtl.id}>
                            <input
                              type="checkbox"
                              id={categoryDtl.name}
                              value={categoryDtl.name}
                              name={categoryData.name.toLowerCase()} // 필터 이름으로 title 소문자 사용
                              checked={filters.categories[categoryData.name.toLowerCase() as keyof Filters['categories']]?.includes(categoryDtl.name) || false}
                              onChange={handleFilterChange}
                            />
                            <label htmlFor={categoryDtl.name}>{categoryDtl.name}</label>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
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
      <IonFooter>
        <IonToolbar>
          <IonText className="footer-text">
            &copy; 2025 네카라쿠배당토야.
          </IonText>
        </IonToolbar>
      </IonFooter>
    </IonPage>
  );
};

export default Home;
