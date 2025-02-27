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

const ListContainer: React.FC = () => {
  const [products, setProducts] = useState<Job_mst[]>([]);
  const [company, setCompany] = useState<string>('NAVER');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response: AxiosResponse<Job_mst[]> = await axios.get<Job_mst[]>(`${API_URL}/api/list`, {
          params: { company },
        });
        if (Array.isArray(response.data)) {
          setProducts(response.data);
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

  const companies:any = {
    NAVER: '네이버',
    KAKAO: '카카오',
    LINE: '라인',
    COUPANG: '쿠팡',
    BAEMIN: '배달의민족', 
    DAANGN: '당근마켓',
    TOSS: '토스',
    YANOLJA: '야놀자',
  };

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
          {products.length > 0 ? (
            products.map((item: Job_mst) => (
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
