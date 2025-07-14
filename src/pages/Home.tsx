import React, { useState, useEffect } from 'react';
import axios from 'axios';
import API_URL from "../config";
import { IonButton, IonButtons, IonContent, IonFooter, IonHeader, IonPage, IonText, IonTitle, IonToolbar } from '@ionic/react';
import ListContainer from '../components/ListContainer';
import { Helmet } from 'react-helmet';
import { Swiper, SwiperSlide } from 'swiper/react'; // Swiper와 SwiperSlide만 가져오기
import { Autoplay, Navigation, Pagination } from 'swiper/modules'; // 필요한 모듈 import
import 'swiper/swiper-bundle.css'; // Swiper CSS import
import './Home.css';
import CommonHeader from '../common/CommonHeader';
import Slider from 'rc-slider';
import 'rc-slider/assets/index.css';

// 필터 타입 정의
export interface Filters {
  employmentType: string;
  careerPeriod: string;
  categories: {
    [key: string]: string[];
  };
  personalHistory: {
    start: number;
    end: number;
  };
  includeNoExperience: boolean;
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
    personalHistory: { start: 0, end: 10 },
    includeNoExperience: true,
  });

  // 카테고리 데이터 로드
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await axios.get(`${API_URL}/api/category/list`); // API 엔드포인트 수정
        setCategoriesData(response.data);

        // 필터 초기화
        const initialCategoriesFilter = response.data.reduce((acc: Record<string, string[]>, category: CategoryMst) => {
          acc[category.name.toLowerCase()] = [];
          return acc;
        }, {});
        
        setFilters(prevFilters => ({
          ...prevFilters,
          personalHistory: { start: 0, end: 10 }, // 경력 필터도 초기화
          categories: initialCategoriesFilter,
        }));
        
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

  const handleExperienceSliderChange = (range: number | number[]) => {
    if (Array.isArray(range)) {
      setFilters(prevFilters => ({
        ...prevFilters,
        personalHistory: {
          start: range[0],
          end: range[1],
        },
      }));
    }
  };

  const handleIncludeNoExperienceChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { checked } = event.target;
    setFilters(prevFilters => ({
      ...prevFilters,
      includeNoExperience: checked,
    }));
  };

  const handleExperienceInputChange = (e: React.ChangeEvent<HTMLInputElement>, field: 'start' | 'end') => {
    const value = e.target.value;
    let numValue = parseInt(value, 10);

    // 입력값이 비어있거나 숫자가 아니면 0으로 처리 (혹은 다른 기본값으로)
    if (isNaN(numValue) || value === '') {
      numValue = 0; // 또는 원하는 기본값
    }

    setFilters(prevFilters => {
      let newStart = prevFilters.personalHistory.start;
      let newEnd = prevFilters.personalHistory.end;

      if (field === 'start') {
        newStart = numValue;
        // 시작 값이 끝 값보다 커지지 않도록 조정 (선택 사항)
        if (newStart > newEnd) newEnd = newStart;
      } else {
        newEnd = numValue;
        // 끝 값이 시작 값보다 작아지지 않도록 조정 (선택 사항)
        if (newEnd < newStart) newStart = newEnd;
      }

      // 최소/최대 범위도 고려하여 조정 (선택 사항)
      if (newStart < 0) newStart = 0;
      if (newEnd > 10) newEnd = 10; // max 값과 일치시켜야 함

      return {
        ...prevFilters,
        personalHistory: {
          start: newStart,
          end: newEnd,
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
        <title>네카라쿠배 채용</title>
        <meta name="description" content="네카라쿠배 채용, 네이버 채용, 카카오 채용, 라인 채용, 쿠팡 채용, 우아한형제들 채용, 당근 채용,토스 채용, 
  프론트엔드 채용, 백엔드 채용, 풀스택 개발자 채용, 모바일 개발자 채용" />
        <meta name="keywords" content="네카라쿠배 채용, 네이버 채용, 카카오 채용, 라인 채용, 쿠팡 채용, 우아한형제들 채용, 당근 채용,토스 채용, 
  프론트엔드 채용, 백엔드 채용, 풀스택 개발자 채용, 모바일 개발자 채용, UI/UX 디자이너 채용,
  그래픽 디자이너 채용, 데이터 분석가 채용, AI 엔지니어 채용, 머신러닝 엔지니어 채용, 서비스 기획 채용,
  프로덕트 매니저 채용, 프로젝트 매니저 채용, 신입 공개 채용, 경력직 공개 채용, 네카라쿠배 수시 채용, IT 기업 수시 채용,
  네카라쿠배 인턴 채용, IT 기업 인턴십, 원격 근무 채용, 재택 근무 가능 채용, 2025 개발자 채용, IT 채용 트렌드, 네카라쿠배 채용 공고,
  네카라쿠배 공고, 블록체인 개발자 채용, AI 스타트업 채용, IT 대기업 채용" />
        <meta name="author" content="네카라쿠배당토야 팀" />

        <meta property="og:title" content="네카라쿠배당토야 공고" />
        <meta property="og:description" content="네카라쿠배 공고를 확인하고 구독하세요!!" />
        <meta property="og:image" content="https://nklcb.co.kr/images/my-og-image.jpg" />
        <meta property="og:url" content="https://nklcb.co.kr" />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="네카라쿠배당토야" />
        <meta property="og:locale" content="ko_KR" />    
      </Helmet>
      <CommonHeader />
      <IonContent fullscreen>
      {/* <Swiper
          modules={[Navigation, Pagination, Autoplay]} // 모듈 추가
          spaceBetween={30}
          pagination={{
            clickable: true,
          }}
          navigation={true}
          autoplay={{
            delay: 3000,
            disableOnInteraction: false,
          }}
          className="mySwiper"
      >
        <SwiperSlide>
          <a href="https://toss.im/career/jobs?company=%ED%86%A0%EC%8A%A4%EC%A6%9D%EA%B6%8C" target="_blank" rel="noopener noreferrer">
            <img src="https://static.toss.im/career-resource/2025_Securities.png" alt="Slide 1" />
          </a>
        </SwiperSlide>
        <SwiperSlide>
          <a href="https://toss.im/career/jobs?company=%ED%86%A0%EC%8A%A4%ED%94%8C%EB%A0%88%EC%9D%B4%EC%8A%A4" target="_blank" rel="noopener noreferrer">
            <img src="https://static.toss.im/career-resource/0321__786_160_place.png" alt="Slide 2" />
          </a>
        </SwiperSlide>
      </Swiper> */}
        <div className="container">
          <aside className="left-aside">
            <h2>직군</h2>
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

            <div style={{ marginTop: '30px', padding: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
                <h2 style={{ margin: 0, marginRight: '10px' }}>경력</h2>
                
                <input
                  type="checkbox"
                  id="includeNoExperience"
                  checked={filters.includeNoExperience}
                  onChange={handleIncludeNoExperienceChange}
                  style={{ verticalAlign: 'middle' }}
                />
                <label htmlFor="includeNoExperience" style={{ marginLeft: '1px', display: 'inline-block', verticalAlign: 'middle' }}>
                  경력 무관 포함
                </label>
              </div>

              <div>
                <input
                  type="number"
                  min={0} // 최소값 설정
                  max={filters.personalHistory.end}
                  value={filters.personalHistory.start}
                  onChange={(e) => handleExperienceInputChange(e, 'start')}
                  className="experience-input"
                  style={{ marginRight: '2px' }}
                />
                년 ~
                <input
                  type="number"
                  min={filters.personalHistory.start} 
                  max={10}
                  value={filters.personalHistory.end}
                  onChange={(e) => handleExperienceInputChange(e, 'end')}
                  className="experience-input"
                  style={{ marginLeft: '2px', marginRight: '5px' }}
                />
                년

                <Slider
                  range
                  min={0}
                  max={10}
                  defaultValue={[filters.personalHistory.start, filters.personalHistory.end]}
                  value={[filters.personalHistory.start, filters.personalHistory.end]}
                  onChange={handleExperienceSliderChange}
                  marks={{ 0: '0년', 3: '3년', 5: '5년', 7: '7년', 10: '10년+' }} // 눈금 표시
                  step={1} 
                  style={{ marginTop: '5px' }}
                />
              </div>
            </div>
          </aside>
          <main className="content">
            <ListContainer filters={filters} />
          </main>
          {/* <aside className="right-aside">
            <h2>광고</h2>
            <p>여기에 광고 내용이 들어갑니다.</p>
          </aside> */}
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
