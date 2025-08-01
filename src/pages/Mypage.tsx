import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { 
  IonPage, 
  IonContent, 
  IonItem, 
  IonLabel, 
  IonCheckbox, 
  IonButton, 
  IonList, 
  IonSpinner,
  IonGrid,
  IonRow,
  IonCol,
  IonInput,
  IonRadio,
  IonRadioGroup
} from '@ionic/react';
import { Helmet } from 'react-helmet';
import './Mypage.css';
import { useAuth } from '../common/AuthContextType';
import CommonHeader from '../common/CommonHeader';
import Sidebar from '../common/Sidebar';
import API_URL from "../config";
import UseTokenRefresh from '../common/UseTokenRefresh';

const Mypage: React.FC = () => {  
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [emailAddress, setEmailAddress] = useState<string>('');
  const [selectedCompanys, setSelectedCompanys] = useState<string[]>([]);
  const [selectedJobRoles, setSelectedJobRoles] = useState<string[]>([]);
  const [selectedCareerYears, setSelectedCareerYears] = useState<number | null>(null);
  const [availableJobRoles, setAvailableJobRoles] = useState<any>([]); // 객체 배열로 변경
  const [isLoading, setIsLoading] = useState(true);
  const { fetchWithToken } = UseTokenRefresh();
  const validateEmail = (email: string): boolean => {
    // 간단한 이메일 정규 표현식
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };
  const emailInputRef = useRef<HTMLIonInputElement | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true); // 로딩 시작

      try {

        const userSettings:any = await fetchWithToken(`${API_URL}/api/user/settings`);

        if (userSettings) {
          setEmailAddress(userSettings.userInfo.email);
          if (Array.isArray(userSettings.subscribedServices)) {
            setSelectedCompanys(userSettings.subscribedServices);
          }
          
          if (Array.isArray(userSettings.selectedJobRoles)) {
            setSelectedJobRoles(userSettings.selectedJobRoles);
          }

          if (userSettings.careerYear !== undefined && userSettings.careerYear !== null) {
            setSelectedCareerYears(userSettings.careerYear);
          }
        }
        
        const allJobRolesData = await axios.get(`${API_URL}/api/category/list`);

        if (allJobRolesData.data) {
          setAvailableJobRoles(allJobRolesData.data);
        }
        

      } catch (error) {
        console.error('데이터를 가져오는데 실패했습니다:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();

  }, []); 

  const handleCompanySubscribeChange = (companyValue: string, isChecked: boolean | undefined) => {
    setSelectedCompanys(prevSelectedCompanys => {
      if (isChecked) {
        if (!prevSelectedCompanys.includes(companyValue)) {
          return [...prevSelectedCompanys, companyValue];
        }
      } else {
        return prevSelectedCompanys.filter(company => company !== companyValue);
      }
      return prevSelectedCompanys;
    });
  };

  const handleEmailChange = (event: CustomEvent) => {
      setEmailAddress(event.detail.value || ''); 
  };

  const handleJobRoleChange = (jobRoleValue: string, isChecked: boolean | undefined) => {
    setSelectedJobRoles(prevRoles => {
      if (isChecked) {
        if (!prevRoles.includes(jobRoleValue)) {
          return [...prevRoles, jobRoleValue];
        }
      } else {
        return prevRoles.filter(role => role !== jobRoleValue);
      }
      return prevRoles;
    });
  };

  // 저장 버튼 클릭 핸들러 (기존과 동일)
  const handleSave = async () => {
    console.log('구독 설정 및 직무 저장:', {
      email: emailAddress,
      selectedCompanys,
      selectedJobRoles,
      selectedCareerYears
    });

    if (!validateEmail(emailAddress)) {
      alert('유효한 이메일 주소를 입력해주세요.');
      if (emailInputRef.current) {
        emailInputRef.current.setFocus(); // Ionic Input의 setFocus() 메서드 사용
      }
      return; // 유효성 검사 실패 시 함수 종료
    }

    try {
        const savePayload = {
          email: emailAddress,
          subscribedServices: selectedCompanys,
          selectedJobRoles: selectedJobRoles,
          selectedCareerYears: selectedCareerYears
        };

        const result = await fetchWithToken(
          `${API_URL}/api/user/settings`, 
          'POST', 
          JSON.stringify(savePayload)
        );
        
        if (result) {
          alert('설정이 저장되었습니다.');
        } else {
          alert('설정 저장에 실패했습니다.');  
        }
    } catch (error) {
        console.error('설정 저장 실패:', error);
        alert('설정 저장에 실패했습니다.');
    }
  };

  const chunkArray = (arr: any[], chunkSize: number) => {
    const chunkedArr:any = [];
    if (!Array.isArray(arr) || arr.length === 0) {
        return chunkedArr;
    }
    for (let i = 0; i < arr.length; i += chunkSize) {
      chunkedArr.push(arr.slice(i, i + chunkSize));
    }
    return chunkedArr;
  };

  const subscriptionOptions = [
    { label: '네이버', value: 'naver' },
    { label: '카카오', value: 'kakao' },
    { label: '라인', value: 'line' },
    { label: '쿠팡', value: 'coupang' },
    { label: '배달의민족', value: 'baemin' },
    { label: '당근마켓', value: 'karrot' },
    { label: '토스', value: 'toss' },
    { label: '야놀자', value: 'yanolja' },
  ];

  const chunkedSubscriptionOptions = chunkArray(subscriptionOptions, 3);

  return (
    <IonPage>
      <Helmet>
        <title>마이페이지</title>
        <meta name="google-adsense-account" content="ca-pub-9366813459634197" />      
        <meta charSet="utf-8" />        
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="description" content="마이페이지" />
      </Helmet>
      <CommonHeader />
      <IonContent>
        <div className="mypage-container">
          <Sidebar activeTab={activeTab} />
          <div className="content">
            <h2>내 정보</h2>
            {user ? (
              <p>안녕하세요, {user.name}님!</p> 
            ) : (
              <p>사용자 정보를 불러오는 중입니다...</p>
            )}

            <h1 style={{ fontSize: '2em', margin: '16px 0' }}>이메일 구독 설정</h1>
            <h2 style={{ fontSize: '1.5em', margin: '32px 0 16px 0' }}>이메일 주소</h2>
            <IonList> 
              <IonItem>
                <IonLabel position="stacked">수신할 이메일 주소</IonLabel> {/* stacked position으로 레이블 위로 */}
                <IonInput
                    type="email"
                    value={emailAddress}
                    onIonChange={handleEmailChange} 
                    placeholder="이메일 주소를 입력해주세요" 
                ></IonInput>
              </IonItem>
            </IonList>

            <h2 style={{ fontSize: '1.5em', margin: '32px 0 16px 0' }}>본인 경력 선택</h2>
            <IonGrid>
              <IonRow className="ion-justify-content-start ion-align-items-center"> {/* 버튼들이 보기 좋게 정렬되도록 */}
                {[0, 1, 2, 3, 4, 5, 6, 7, 8].map(year => (
                  <IonCol size="auto" key={year} className="ion-no-padding"> {/* 각 버튼이 적절한 공간을 갖도록 */}
                    <IonButton
                      expand="block" // 가로로 꽉 채움 (필요시 'full'이나 'block' 사용)
                      fill={selectedCareerYears === year ? "solid" : "outline"} // 선택된 버튼은 꽉 채우고, 나머지는 테두리만
                      color={selectedCareerYears === year ? "primary" : "medium"} // 선택된 버튼은 강조색, 나머지는 일반색
                      onClick={() => setSelectedCareerYears(year)} // 클릭 시 해당 년도로 상태 업데이트
                      className="career-button" // 추가적인 스타일링을 위한 클래스
                    >
                      {year}년
                    </IonButton>
                  </IonCol>
                ))}                
              </IonRow>
            </IonGrid>

            <h2 style={{ fontSize: '1.5em', margin: '32px 0 16px 0' }}>기업 선택</h2>
            <IonList>
              {chunkedSubscriptionOptions.length > 0 ? (
                <IonGrid> 
                  {chunkedSubscriptionOptions.map((row:any, rowIndex:any) => (
                    <IonRow key={rowIndex}>
                      {row.map((option:any, colIndex:any) => (
                        <IonCol size="4" key={option.value}>
                           <div style={{ display: 'flex', alignItems: 'center', padding: '4px' }}>
                              <IonCheckbox
                                checked={selectedCompanys.includes(option.value)}
                                onIonChange={e => handleCompanySubscribeChange(option.value, e.detail.checked)}
                                style={{ marginRight: '8px' }}
                              />
                              <IonLabel className="ion-text-wrap" style={{ flex: '1' }}>{option.label}</IonLabel>
                           </div>
                        </IonCol>
                      ))}
                    </IonRow>
                  ))}
                </IonGrid>
              ) : (
                !isLoading && <IonItem><IonLabel>구독 옵션 목록을 불러오지 못했습니다.</IonLabel></IonItem>
              )}
            </IonList>

            <h2 style={{ fontSize: '1.5em', margin: '32px 0 16px 0' }}>관심 직무 선택</h2>
            <IonList>
              {isLoading ? (
                <IonItem><IonSpinner name="crescent" /> <IonLabel className="ion-padding-start">직무 목록 불러오는 중...</IonLabel></IonItem>
              ) : (
                availableJobRoles && Array.isArray(availableJobRoles) && availableJobRoles.length > 0 ? (
                  availableJobRoles.map((categoryMst: any) => (
                    <React.Fragment key={categoryMst.value}>
                      <IonItem style={{ borderBottom: '1px solid #e0e0e0' }}>
                        <IonLabel><h3>{categoryMst.name}</h3></IonLabel>
                      </IonItem>

                      {categoryMst.categoryDtls && Array.isArray(categoryMst.categoryDtls) && categoryMst.categoryDtls.length > 0 ? (
                        <IonGrid>
                          {chunkArray(categoryMst.categoryDtls, 4).map((dtlRow:any, rowIndex:any) => (
                            <IonRow key={rowIndex}>
                              {dtlRow.map((dtl: any) => (
                                <IonCol size="3" key={dtl.name}>
                                   <div style={{ display: 'flex', alignItems: 'center', padding: '4px' }}>
                                      <IonCheckbox
                                        checked={selectedJobRoles.includes(dtl.name)}
                                        onIonChange={e => handleJobRoleChange(dtl.name, e.detail.checked)}
                                        style={{ marginRight: '8px' }}
                                      />
                                      <IonLabel className="ion-text-wrap" style={{ flex: '1' }}>{dtl.name}</IonLabel>
                                   </div>
                                </IonCol>
                              ))}
                            </IonRow>
                          ))}
                        </IonGrid>
                      ) : (
                        <IonItem>
                          <IonLabel>이 카테고리에는 직무 항목이 없습니다.</IonLabel>
                        </IonItem>
                      )}
                    </React.Fragment>
                  ))
                ) : (
                  !isLoading && <IonItem><IonLabel>직무 목록을 불러오지 못했습니다.</IonLabel></IonItem>
                )
              )}
            </IonList>

            {!isLoading && (
              <IonButton expand="block" onClick={handleSave} style={{ margin: '24px 0' }}>
                저장
              </IonButton>
            )}

          </div>          
        </div>
      </IonContent>
    </IonPage>
  );
};

export default Mypage;