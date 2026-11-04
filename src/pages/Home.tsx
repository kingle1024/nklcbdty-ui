import React, { useState, useEffect } from 'react';
import API_URL from "../config";
import { cachedGet } from '../common/kvCache';
import { IonButton, IonContent, IonFooter, IonIcon, IonModal, IonPage, IonText, IonToolbar } from '@ionic/react';
import { closeOutline } from 'ionicons/icons';
import ListContainer from '../components/ListContainer';
import JobFilterPanel, { CategoryMst } from '../components/JobFilterPanel';
import useIsMobile from '../common/useIsMobile';
import { Helmet } from 'react-helmet';
import { Swiper, SwiperSlide } from 'swiper/react'; // Swiper와 SwiperSlide만 가져오기
import { Autoplay, Navigation, Pagination } from 'swiper/modules'; // 필요한 모듈 import
import 'swiper/swiper-bundle.css'; // Swiper CSS import
import './Home.css';
import CommonHeader from '../common/CommonHeader';
import {
  WelfareCategory,
  WelfareMatch,
  WorkStyleCompany,
  fetchActiveWelfareCategories,
  fetchFeatureCompanies,
} from '../common/companyFeatureApi';

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
  /** 공고에서 재택근무가 확인된 회사만 */
  remoteOnly: boolean;
  /** 복지 카테고리 코드. 재택과 따로 고를 수 있고, 재택도 켜면 재택 회사 중에서 거른다 */
  welfare: string[];
  /** 복지를 여러 개 골랐을 때 모두(ALL) / 하나라도(ANY) */
  welfareMatch: WelfareMatch;
}

const DEFAULT_EXPERIENCE = { start: 0, end: 10 };

/** 지금은 재택만. 유연근무제(FLEXIBLE) 등이 생기면 근무형태 코드만 바꿔 쓴다. */
const WORK_STYLE = 'REMOTE';

/** 기본값과 다른 필터 항목 수. 모바일 필터 버튼의 배지에 쓴다. */
export const countActiveFilters = (filters: Filters): number => {
  const selectedCategories = Object.values(filters.categories).flat().length;
  const experienceChanged =
    filters.personalHistory.start !== DEFAULT_EXPERIENCE.start ||
    filters.personalHistory.end !== DEFAULT_EXPERIENCE.end;
  return selectedCategories + (experienceChanged ? 1 : 0) + (filters.includeNoExperience ? 0 : 1)
    + (filters.remoteOnly ? 1 : 0) + filters.welfare.length;
};

const Home: React.FC = () => {
  const [categoriesData, setCategoriesData] = useState<CategoryMst[]>([]);
  const isMobile = useIsMobile();
  // 모바일 필터 바텀 시트 열림 여부
  const [isFilterOpen, setIsFilterOpen] = useState<boolean>(false);
  const [filters, setFilters] = useState<Filters>({
    employmentType: '',
    careerPeriod: '',
    categories: {},
    personalHistory: { start: 0, end: 10 },
    includeNoExperience: true,
    remoteOnly: false,
    welfare: [],
    welfareMatch: 'ALL',
  });
  const [welfareCategories, setWelfareCategories] = useState<WelfareCategory[]>([]);
  // 재택·복지 필터에 맞는 회사(근거 포함). 둘 다 꺼져 있으면 null
  const [featureCompanies, setFeatureCompanies] = useState<WorkStyleCompany[] | null>(null);
  const [featureLoading, setFeatureLoading] = useState<boolean>(false);

  useEffect(() => {
    fetchActiveWelfareCategories()
      .then(setWelfareCategories)
      .catch((e) => console.error('복지 카테고리 조회 실패:', e));
  }, []);

  const welfareKey = filters.welfare.join(',');
  useEffect(() => {
    if (!filters.remoteOnly && !welfareKey) {
      setFeatureCompanies(null);
      setFeatureLoading(false);
      return;
    }
    // 체크를 빠르게 바꾸면 늦게 온 이전 응답이 덮지 않게
    let cancelled = false;
    setFeatureLoading(true);
    fetchFeatureCompanies({
      workStyle: filters.remoteOnly ? WORK_STYLE : null,
      welfare: welfareKey ? welfareKey.split(',') : [],
      match: filters.welfareMatch,
    })
      .then((list) => {
        if (!cancelled) setFeatureCompanies(list);
      })
      .catch((e) => {
        if (cancelled) return;
        console.error('재택·복지 회사 조회 실패:', e);
        setFeatureCompanies([]);
      })
      .finally(() => {
        if (!cancelled) setFeatureLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [filters.remoteOnly, welfareKey, filters.welfareMatch]);

  // 카테고리 데이터 로드
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const data = await cachedGet<CategoryMst[]>('nklcb:category:list', `${API_URL}/api/category/list`);
        setCategoriesData(data);

        // 필터 초기화
        const initialCategoriesFilter = data.reduce((acc: Record<string, string[]>, category: CategoryMst) => {
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


  // 재택과 복지는 따로 고른다. 재택을 꺼도 복지 선택은 남는다
  const handleRemoteOnlyChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { checked } = event.target;
    setFilters(prevFilters => ({
      ...prevFilters,
      remoteOnly: checked,
    }));
  };

  const handleWelfareMatchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const match = event.target.value as WelfareMatch;
    setFilters(prevFilters => ({
      ...prevFilters,
      welfareMatch: match,
    }));
  };

  const handleWelfareChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { value, checked } = event.target;
    setFilters(prevFilters => ({
      ...prevFilters,
      welfare: checked
        ? [...prevFilters.welfare, value]
        : prevFilters.welfare.filter((code) => code !== value),
    }));
  };

  // 모든 필터를 기본값으로 되돌린다 (직군 선택 해제, 경력 0~10년, 경력 무관 포함, 재택·복지 해제)
  const resetFilters = () => {
    setFilters(prevFilters => ({
      ...prevFilters,
      categories: Object.keys(prevFilters.categories).reduce((acc: Record<string, string[]>, key) => {
        acc[key] = [];
        return acc;
      }, {}),
      personalHistory: { ...DEFAULT_EXPERIENCE },
      includeNoExperience: true,
      remoteOnly: false,
      welfare: [],
      welfareMatch: 'ALL',
    }));
  };

  const activeFilterCount = countActiveFilters(filters);

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
            <JobFilterPanel
              categoriesData={categoriesData}
              filters={filters}
              visibleCategories={visibleCategories}
              onToggleCategory={toggleCategories}
              onCategoryChange={handleFilterChange}
              onIncludeNoExperienceChange={handleIncludeNoExperienceChange}
              onExperienceInputChange={handleExperienceInputChange}
              onExperienceSliderChange={handleExperienceSliderChange}
              welfareCategories={welfareCategories}
              onRemoteOnlyChange={handleRemoteOnlyChange}
              onWelfareChange={handleWelfareChange}
              onWelfareMatchChange={handleWelfareMatchChange}
            />
          </aside>
          <main className="content">
            <ListContainer
              filters={filters}
              onOpenFilter={isMobile ? () => setIsFilterOpen(true) : undefined}
              activeFilterCount={activeFilterCount}
              featureCompanies={featureCompanies}
              featureLoading={featureLoading}
            />
          </main>
          {/* <aside className="right-aside">
            <h2>광고</h2>
            <p>여기에 광고 내용이 들어갑니다.</p>
          </aside> */}
        </div>
      </IonContent>

      {/* 모바일 전용 필터 바텀 시트. PC 사이드바와 같은 패널을 그린다. 체크하면 목록에 바로 반영된다. */}
      <IonModal
        isOpen={isMobile && isFilterOpen}
        onDidDismiss={() => setIsFilterOpen(false)}
        className="job-filter-modal"
        initialBreakpoint={1}
        breakpoints={[0, 1]}
      >
        <div className="job-filter-modal__body">
          <header className="job-filter-modal__header">
            <h2>필터</h2>
            <IonButton fill="clear" size="small" aria-label="닫기" onClick={() => setIsFilterOpen(false)}>
              <IonIcon slot="icon-only" icon={closeOutline} />
            </IonButton>
          </header>
          <div className="job-filter-modal__content">
            <JobFilterPanel
              categoriesData={categoriesData}
              filters={filters}
              visibleCategories={visibleCategories}
              onToggleCategory={toggleCategories}
              onCategoryChange={handleFilterChange}
              onIncludeNoExperienceChange={handleIncludeNoExperienceChange}
              onExperienceInputChange={handleExperienceInputChange}
              onExperienceSliderChange={handleExperienceSliderChange}
              welfareCategories={welfareCategories}
              onRemoteOnlyChange={handleRemoteOnlyChange}
              onWelfareChange={handleWelfareChange}
              onWelfareMatchChange={handleWelfareMatchChange}
              idPrefix="m-"
            />
          </div>
          <footer className="job-filter-modal__footer">
            <IonButton
              fill="outline"
              color="medium"
              className="job-filter-modal__reset"
              disabled={activeFilterCount === 0}
              onClick={resetFilters}
            >
              초기화
            </IonButton>
            <IonButton expand="block" className="job-filter-modal__apply" onClick={() => setIsFilterOpen(false)}>
              적용하기
            </IonButton>
          </footer>
        </div>
      </IonModal>

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
