import React, { useState } from 'react';
import { IonContent, IonHeader, IonPage, IonTitle, IonToolbar } from '@ionic/react';
import ListContainer from '../components/ListContainer';
import { Helmet } from 'react-helmet';
import './Home.css';

// 카테고리 목록
const categoriesData = [
  {
    title: 'Engineering',
    categories: [
      'Backend',
      'Frontend',
      'Infra',
      'QA',
      'Full Stack',
      'App',
      'Engineering',
      'DBA',
    ],
    visible: true,
  },
  {
    title: 'Support',
    categories: ['Business', 'etc'],
    visible: false,
  },
  {
    title: 'DBA',
    categories: ['Data Engineering', 'Data Analysis'],
    visible: false,
  },
];

// 필터 타입 정의
interface Filters {
  employmentType: string;
  careerPeriod: string;
  engineering: string[];
  support: string[];
  dba: string[];
}

// CategorySection Props 타입 정의
interface CategorySectionProps {
  title: string;
  categories: string[];
  showCategories: boolean;
  toggleCategories: () => void;
  filters: Filters;
  handleFilterChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

const CategorySection: React.FC<CategorySectionProps> = ({
  title,
  categories,
  showCategories,
  toggleCategories,
  filters,
  handleFilterChange,
}) => (
  <div>
    <span
      onClick={toggleCategories}
      style={{ cursor: 'pointer', color: '#007bff', fontWeight: 'bold' }}
    >
      {title}
    </span>
    {showCategories && (
      <div className="category-list">
        {categories.map((category) => (
          <div key={category}>
            <input
              type="checkbox"
              id={category}
              value={category}
              name={title.toLowerCase()} // 필터 이름으로 title 소문자 사용
              checked={filters[title.toLowerCase() as keyof Filters]?.includes(category) || false}
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
    engineering: [], // Engineering 필터 초기화
    support: [],
    dba: [],
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

    setFilters((prevFilters) => {
      const currentCategories = prevFilters[name.toLowerCase() as keyof Filters] as string[];
      const newCategories = checked
        ? [...currentCategories, value] // 체크된 경우 추가
        : currentCategories.filter((category) => category !== value); // 체크 해제된 경우 제거

      return {
        ...prevFilters,
        [name.toLowerCase() as keyof Filters]: newCategories, // 동적으로 업데이트
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
