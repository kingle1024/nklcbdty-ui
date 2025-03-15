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
    engineering: string[];
    support: string[];
    dba: string[];
  };
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

  const filteredProducts = products.filter((item) => {
    const matchesEmploymentType = filters.employmentType ? item.empTypeCdNm === filters.employmentType : true;
    const matchesCareerPeriod = filters.careerPeriod ? item.subJobCdNm === filters.careerPeriod : true;

    const matchesCategory = filters.engineering.includes(item.subJobCdNm) || 
                            filters.support.includes(item.subJobCdNm) || 
                            filters.dba.includes(item.subJobCdNm);

    return matchesEmploymentType && matchesCareerPeriod && (filters.engineering.length || filters.support.length || filters.dba.length ? matchesCategory : true);
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
              {companies[comp]}
            </IonButton>
          ))}
        </div>

        <div className="card-container"> {/* 카드 컨테이너 추가 */}
          {filteredProducts.length > 0 ? (
            filteredProducts.map((item: Job_mst) => (
              <div className="job-card" key={item.annoId}>
                <h3>{item.annoSubject}</h3>
                <p>{item.sysCompanyCdNm} | {item.subJobCdNm}</p>
                <a href={item.jobDetailLink} target="_blank" rel="noopener noreferrer">
                  자세히 보기
                </a>
              </div>
            ))
          ) : (
            <div>데이터가 없습니다.</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ListContainer;
