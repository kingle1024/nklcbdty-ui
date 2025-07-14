import React, { useState, useEffect } from 'react';
import axios, { AxiosResponse } from 'axios';
import API_URL from "../config";
import './ListContainer.css';
import { IonButton, IonSearchbar } from '@ionic/react';
import { Filters } from '../pages/Home';

interface Job_mst {
  id: number | null;
  companyCd: string;
  annoId: number;
  classCdNm: string;
  empTypeCdNm: string;
  annoSubject: string;
  subJobCdNm: string;
  sysCompanyCdNm: string | null;
  jobDetailLink: string;
  endDate: string;
  personalHistory: number;
  personalHistoryEnd: number;
}

interface ListContainerProps {
  filters: Filters;
}

const ListContainer: React.FC<ListContainerProps> = ({ filters }) => {
  const [products, setProducts] = useState<Job_mst[]>([]);
  const [company, setCompany] = useState<string>('NAVER');
  const [cache, setCache] = useState<{ [key: string]: Job_mst[] }>({});
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    const fetchData = async () => {
      if (cache[company]) {
        setProducts(cache[company]);
        return;
      }

      try {
        const response: AxiosResponse<Job_mst[]> = await axios.get<Job_mst[]>(`${API_URL}/api/list`, {
          params: { company },
        });

        if (Array.isArray(response.data)) {
          setProducts(response.data);
          setCache((prevCache) => ({
            ...prevCache,
            [company]: response.data,
          }));
        } else {
          console.error('Unexpected response format:', response.data);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };
    fetchData();
  }, [company]);

  const handleCompanyChange = (selectedCompany: string) => {
    setCompany(selectedCompany);
  };

  const companies: { [key: string]: string } = {
    ALL: '전체',
    NAVER: '네이버',
    KAKAO: '카카오',
    LINE: '라인',
    COUPANG: '쿠팡',
    BAEMIN: '배달의민족',
    DAANGN: '당근마켓',
    TOSS: '토스',
    YANOLJA: '야놀자',
  };

  const companyColors: { [key: string]: string } = {
    NAVER: '#1EC800',
    KAKAO: '#FFEB00',
    LINE: '#00B700',
    COUPANG: '',
    BAEMIN: '#48D1CC',
    DAANGN: '#EB8717',
    TOSS: '#3182F7',
    YANOLJA: '#F5A3B8',
    ALL: 'transparent',
  };

  const filteredProducts = products.filter((item) => {
    // 1. 고용 형태 필터링
    const matchesEmploymentType = filters.employmentType ? item.empTypeCdNm === filters.employmentType : true;

    // 2. 직군 카테고리 필터링
    const allCategories = Object.values(filters.categories).flat();
    const matchesCategory = allCategories.length ? allCategories.includes(item.subJobCdNm) : true;

    // 3. 경력 필터링
    const filterMinExp = filters.personalHistory.start; // 슬라이더 시작 연차
    const filterMaxExp = filters.personalHistory.end;   // 슬라이더 끝 연차

    const jobMinExp = item.personalHistory; // 공고의 최소 경력
    let jobMaxExp; // 공고의 최대 경력 (계산 로직 변경)

    // 1) item.personalHistoryEnd가 0이고 jobMinExp가 0이 아닐 경우 (예: 2년차 이상, 최대 경력 0)
    //    -> 최대 경력 제한이 없다고 보고 Infinity로 설정
    if (item.personalHistoryEnd === 0 && jobMinExp > 0) {
        jobMaxExp = Infinity;
    }
    // 2) item.personalHistoryEnd가 정의되어 있고 null이 아닐 경우 (실제 값이 있는 경우)
    else if (item.personalHistoryEnd !== undefined && item.personalHistoryEnd !== null) {
        jobMaxExp = item.personalHistoryEnd;
    }
    // 3) 그 외의 경우 (undefined 또는 null)
    //    -> 최대 경력 제한이 없다고 보고 Infinity로 설정
    else {
        jobMaxExp = Infinity;
    }

    let matchesCareer = false;
    // 경력 필터링 로직: '경력 무관 포함' 체크박스 반영
    if (jobMinExp === 0) { // 현재 공고가 '경력 무관'인 경우 (최소 경력이 0)
      if (filters.includeNoExperience) {
        matchesCareer = true; // '경력 무관 포함'이 체크되어 있으면 무조건 포함
      } else {
        matchesCareer = false; // 체크 해제되어 있으면 포함하지 않음
      }
    } else { // 현재 공고가 '경력'이 있는 경우 (jobMinExp > 0)
      // 공고의 경력 범위 [jobMinExp, jobMaxExp]와
      // 필터의 경력 범위 [filterMinExp, filterMaxExp]가 겹치는지 확인
      matchesCareer = (jobMinExp <= filterMaxExp) && (jobMaxExp >= filterMinExp);
    }

    const searchText = searchQuery.toLowerCase();
    const matchesSearch = searchQuery === '' || 
      item.annoSubject.toLowerCase().includes(searchText) ||
      (item.sysCompanyCdNm && item.sysCompanyCdNm.toLowerCase().includes(searchText)) ||
      item.subJobCdNm.toLowerCase().includes(searchText);

    return matchesEmploymentType && matchesCareer && matchesCategory && matchesSearch;
  });

  const handleClick = async (
    event: React.MouseEvent<HTMLAnchorElement, MouseEvent>, 
    annoId: number | string,
    annoSubject: string,
  ) => {
    
    try {
      const apiUrl = `${API_URL}/api/log/job_history?anno_id=${annoId}&anno_subject=${encodeURIComponent(annoSubject)}`;      
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',          
        },
      });
    } catch (error) {
      // 네트워크 오류 등 예외 발생 시 처리
      console.error('API 호출 중 오류 발생:', error);
    }
  };

  return (
    <div className="container">
      <div className="announcement-section">
        <div className="search-section">
          <IonSearchbar
            value={searchQuery}
            onIonInput={(e) => setSearchQuery(e.detail.value || '')}
            placeholder="채용공고 검색"
            className="custom-searchbar"
          />
        </div>
        <div className="button-section">         
          {Object.keys(companies).map((comp) => (
            <IonButton 
              key={comp}
              expand="full" 
              onClick={() => handleCompanyChange(comp)} 
              color={company === comp ? 'primary' : 'medium'}
            >
              {companies[comp]}
            </IonButton>
          ))}
        </div>

        <div className="card-container">
          {filteredProducts.length > 0 ? (
            filteredProducts.map((item: Job_mst) => {
              const companyKey = Object.keys(companyColors).find(key => 
                item.companyCd && item.companyCd.toUpperCase().includes(key.toUpperCase())
              );
              const backgroundColor = companyKey ? companyColors[companyKey] : 'white';

              return (
                <div className="job-card" key={item.id} style={{ display: 'flex'}}>
                  <div className="left-area" style={{ backgroundColor }}>
                  </div>
                  <div className="right-area">
                    <h3>{item.annoSubject}</h3>
                    <p>{item.sysCompanyCdNm} | {item.subJobCdNm}
                    {item.endDate ? ` | ~${item.endDate}` : ''}
                    {item.personalHistory !== undefined && item.personalHistory !== null
                      ? ` | ${item.personalHistory === 0 ? '경력 무관' : `${item.personalHistory}년 이상`}`
                      : ''
                    }
                    {item.personalHistoryEnd !== undefined && item.personalHistoryEnd !== null
                      ? `${item.personalHistoryEnd === 0 ? '' : ` ${item.personalHistoryEnd}년 이하`}`
                      : ''
                    }
                    </p>
                    <a 
                      href={item.jobDetailLink} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      onClick={(event) => handleClick(event, item.annoId, item.annoSubject)}
                    >
                      자세히 보기
                    </a>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="no-data-message">
              데이터가 없습니다.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ListContainer;
