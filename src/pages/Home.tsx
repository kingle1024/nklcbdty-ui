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

interface Category {
  title: string;
  categories: string[];
  visible: boolean;
}

const Home: React.FC = () => {
  const [categoriesData, setCategoriesData] = useState<Category[]>([]);
  const [filters, setFilters] = useState<Filters>({
    employmentType: '',
    careerPeriod: '',
    categories: {},
  });

  // 카테고리 데이터 로드
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await axios.get(`${API_URL}/api/categories`); // API 엔드포인트 수정
        setCategoriesData(response.data);

        // 필터 초기화
        const initialFilters = {
          employmentType: '',
          careerPeriod: '',
          categories: response.data.reduce((acc: Record<string, string[]>, category: Category) => {
            acc[category.title.toLowerCase()] = []; // 초기 카테고리 배열을 빈 배열로 설정
            return acc;
          }, {}),
        };
        
        setFilters(initialFilters);

        // visibleCategories 초기화
        const initialVisibleCategories = response.data.reduce((acc: Record<string, boolean>, category: Category) => {
          acc[category.title] = category.visible; // visible 속성에 따라 초기화
          return acc;
        }, {});
        setVisibleCategories(initialVisibleCategories);
        
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
      [title]: !prev[title],
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
              {categoriesData.map((categoryData) => (
                <div key={categoryData.title}>
                  <span
                    onClick={() => toggleCategories(categoryData.title)}
                    style={{ cursor: 'pointer', color: '#007bff', fontWeight: 'bold' }}
                  >
                    {categoryData.title}
                  </span>
                  {visibleCategories[categoryData.title] && (
                    <div className="category-list">
                      {categoryData.categories.map((category) => (
                        <div key={category}>
                          <input
                            type="checkbox"
                            id={category}
                            value={category}
                            name={categoryData.title.toLowerCase()} // 필터 이름으로 title 소문자 사용
                            checked={filters.categories[categoryData.title.toLowerCase() as keyof Filters['categories']]?.includes(category) || false}
                            onChange={handleFilterChange}
                          />
                          <label htmlFor={category}>{category}</label>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
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
