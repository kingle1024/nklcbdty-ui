import React, { useState } from 'react';
import { IonContent, IonHeader, IonPage, IonTitle, IonToolbar } from '@ionic/react';
import ListContainer from '../components/ListContainer';
import { Helmet } from 'react-helmet';
import './Home.css';

// 카테고리 목록
const categoriesData = [
  {
    title: 'Engineering', // 사용자에게 표시될 제목
    categories: [
      'Backend',
      'Frontend',
      'Infra',
      'QA',
      'Full Stack',
      'App',
      'Engineering',
      'DBA', // DBA 추가
    ],
    visible: true // 기본적으로 펼쳐짐
  },
  {
    title: 'Support',
    categories: [
      'Business',
      'etc'
    ],
    visible: false // 기본적으로 접힘
  },
  {
    title: 'DBA', // DBA 카테고리 추가
    categories: [
      'Data Engineering',
      'Data Analysis'
    ],
    visible: false // 기본적으로 접힘
  },
];

// 필터 타입 정의
interface Filters {
  employmentType: string;
  careerPeriod: string;
  categories: string[]; // 모든 카테고리를 포함하는 필드 추가
  engineering: string[]; // Engineering 카테고리 필드
  support: string[];
  dba: string[];
}

// CategorySection Props 타입 정의
interface CategorySectionProps {
  title: string; // title을 string으로 변경
  categories: string[];
  showCategories: boolean;
  toggleCategories: () => void;
  filters: Filters; // 필터 타입으로 변경
  handleFilterChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

const CategorySection: React.FC<CategorySectionProps> = ({
  title,
  categories,
  showCategories,
  toggleCategories,
  filters,
  handleFilterChange
}) => (
  <div>
    <span onClick={toggleCategories} style={{ cursor: 'pointer', color: '#007bff', fontWeight: 'bold' }}>
      {title} {/* title을 그대로 표시 */}
    </span>
    {showCategories && (
      <div className="category-list">
        {categories.map(category => (
          <div key={category}>
            <input
              type="checkbox"
              id={category}
              value={category}
              name={title} // 필터 이름으로 title 사용
              checked={filters[title.toLowerCase() as keyof Filters]?.includes(category) || false} // 체크 상태
              onChange={handleFilterChange}
            />
            <label htmlFor={category}>{category}</label>
          </div>
        ))}
      </div>
    )}
  </div>
);

const Home: React.FC = () => {
  // State to store filter criteria
  const [filters, setFilters] = useState<Filters>({
    employmentType: '',
    careerPeriod: '',
    categories: [], // 기본적으로 모든 카테고리 체크 해제
    engineering: [], // Engineering 필터 초기화
    support: [],
    dba: [] // DBA 카테고리 초기화
  });

  // State to manage the visibility of categories
  const [visibleCategories, setVisibleCategories] = useState(
    categoriesData.reduce((acc, category) => {
      acc[category.title] = category.visible; // visible 속성에 따라 초기화
      return acc;
    }, {} as Record<string, boolean>)
  );

  // Function to handle filter change
  const handleFilterChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { value, checked, name } = event.target;

    setFilters(prevFilters => {
      const currentCategories = prevFilters[name.toLowerCase() as keyof Filters] as string[]; // currentCategories를 string[]로 강제 변환
      const newCategories = checked
        ? [...currentCategories, value] // 체크된 경우 추가
        : currentCategories.filter(category => category !== value); // 체크 해제된 경우 제거

      return {
        ...prevFilters,
        [name.toLowerCase() as keyof Filters]: newCategories // 동적으로 업데이트
      };
    });
  };

  // Toggle function for category visibility
  const toggleCategories = (title: string) => {
    setVisibleCategories(prev => ({
      ...prev,
      [title]: !prev[title]
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
              {categoriesData.map(categoryData => (
                <CategorySection
                  key={categoryData.title}
                  title={categoryData.title} // 필터 제목으로 사용
                  categories={categoryData.categories}
                  showCategories={visibleCategories[categoryData.title]} // title로 가시성 확인
                  toggleCategories={() => toggleCategories(categoryData.title)} // toggleCategories에 title 전달
                  filters={filters}
                  handleFilterChange={handleFilterChange}
                />
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
    </IonPage>
  );
};

export default Home;
