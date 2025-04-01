import React, { useState, useEffect } from 'react';
import axios, { AxiosResponse } from 'axios';
import API_URL from "../config";
import './ListContainer.css';
import { IonButton } from '@ionic/react';
import { Filters } from '../pages/Home';

interface Job_mst {
  id: number | null;
  companyCd: string;
  annoId: number;
  classCdNm: string;
  empTypeCdNm: string;
  annoSubject: string;
  subJobCdNm: string;
  sysCompanyCdNm: string | null; // null 가능성 추가
  jobDetailLink: string;
}

interface ListContainerProps {
  filters: Filters; // Filters 타입 사용
}

const ListContainer: React.FC<ListContainerProps> = ({ filters }) => {
  const [products, setProducts] = useState<Job_mst[]>([]);
  const [company, setCompany] = useState<string>('NAVER');
  const [cache, setCache] = useState<{ [key: string]: Job_mst[] }>({});

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
    const matchesEmploymentType = filters.employmentType ? item.empTypeCdNm === filters.employmentType : true;
    const matchesCareerPeriod = filters.careerPeriod ? item.subJobCdNm === filters.careerPeriod : true;
  
    // 모든 카테고리를 하나의 배열로 통합
    const allCategories = Object.values(filters.categories).flat();
  
    // 카테고리 일치 여부 확인
    const matchesCategory = allCategories.length ? allCategories.includes(item.subJobCdNm) : true;
  
    return matchesEmploymentType && matchesCareerPeriod && matchesCategory;
  });

  return (
    <div className="container">
      <div className="announcement-section">
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
              const backgroundColor = companyKey ? companyColors[companyKey] : 'white'; // 기본 흰색

              return (
                <div
                  className="job-card"
                  key={item.id}
                  style={{ backgroundColor }} // 회사에 맞는 배경색 설정
                >
                  <h3>{item.annoSubject}</h3>
                  <p>{item.sysCompanyCdNm} | {item.subJobCdNm}</p>
                  <a href={item.jobDetailLink} target="_blank" rel="noopener noreferrer">
                    자세히 보기
                  </a>
                </div>
              );
            })
          ) : (
            <div>데이터가 없습니다.</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ListContainer;
