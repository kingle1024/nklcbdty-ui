import React, { useState, useEffect } from 'react';
import axios, { AxiosResponse } from 'axios';
import API_URL from "../config";
import './ListContainer.css';
import { IonButton } from '@ionic/react';

interface Job_mst {
  id: number | null;
  annoId: number;
  classCdNm: string;
  empTypeCdNm: string;
  annoSubject: string;
  subJobCdNm: string;
  sysCompanyCdNm: string;
  jobDetailLink: string;
}

interface ListContainerProps {
  filters: {
    employmentType: string;
    careerPeriod: string;
    categories: string[]; // 배열로 수정
  };
}

const ListContainer: React.FC<ListContainerProps> = ({ filters }) => {
  const [products, setProducts] = useState<Job_mst[]>([]);
  const [company, setCompany] = useState<string>('NAVER');
  const [cache, setCache] = useState<{ [key: string]: Job_mst[] }>({});

  useEffect(() => {
    const fetchData = async () => {
      if (cache[company]) {
        setProducts(cache[company]); // 캐시에서 데이터 가져오기
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
            [company]: response.data, // 캐시에 저장
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
    NAVER: '네이버',
    KAKAO: '카카오',
    LINE: '라인',
    COUPANG: '쿠팡',
    BAEMIN: '배달의민족',
    DAANGN: '당근마켓',
    TOSS: '토스',
    YANOLJA: '야놀자',
  };

  // 필터링 로직
  const filteredProducts = products.filter((item) => {
    const matchesEmploymentType = filters.employmentType ? item.empTypeCdNm === filters.employmentType : true;
    const matchesCareerPeriod = filters.careerPeriod ? item.subJobCdNm === filters.careerPeriod : true;
    const matchesCategory = filters.categories.length > 0 ? filters.categories.includes(item.classCdNm) : true; // 배열로 수정
    return matchesEmploymentType && matchesCareerPeriod && matchesCategory;
  });

  return (
    <div className="container">
      <div className="announcement-section">
        <h1>공고 목록</h1>
        
        <div className="button-section">         
          {Object.keys(companies).map((comp) => (
            <IonButton 
              key={comp}
              expand="full" 
              onClick={() => handleCompanyChange(comp)} 
              color={company === comp ? 'primary' : 'medium'}
            >
              {companies[comp]} {/* 매핑된 회사 이름 사용 */}
            </IonButton>
          ))}
        </div>

        <ul>
          {filteredProducts.length > 0 ? (
            filteredProducts.map((item: Job_mst) => (
              <li key={item.annoId}>
                <a href={item.jobDetailLink} target="_blank" rel="noopener noreferrer">{item.annoSubject}</a>
              </li>
            ))
          ) : (
            <li>데이터가 없습니다.</li>
          )}
        </ul>
      </div>
    </div>
  );
};

export default ListContainer;
