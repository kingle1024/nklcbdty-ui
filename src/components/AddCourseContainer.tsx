import React, { useState, useEffect } from "react";
import { useHistory } from "react-router-dom";
import { IonContent, IonHeader, IonPage, IonTitle, IonToolbar, IonButton, IonButtons, IonInput, IonList, IonItem, IonLabel } from "@ionic/react";
import axios from 'axios';
import API_URL from "../config";
import { Helmet } from "react-helmet";
import { useAuth } from "../common/AuthContextType";
import AddressSearch from "./AddressSearch";

const AddCourseContainer: React.FC = () => {
  const history = useHistory();
  const { logout } = useAuth();
  const [productTitle, setProductTitle] = useState<string>("");
  const [productUrl, setProductUrl] = useState<string>("");
  const [visitDt, setVisitDt] = useState<string>("");
  const [regions, setRegions] = useState<{ 
    level1: string; 
    level2: string; 
    level3: string; 
    level4: string; 
    title: string; 
    lat: number; 
    lng: number; 
    rank: number 
  }[]>([{ level1: "", level2: "", level3: "", level4: "", title: "", lat: 0, lng: 0, rank: 0 }]);

  useEffect(() => {
    // 오늘 날짜를 YYYY-MM-DD 형식으로 설정
    const today = new Date();
    const formattedDate = today.toISOString().split('T')[0];
    setVisitDt(formattedDate);
  }, []);

  const handleAddRegion = () => {
    setRegions([...regions, { level1: "", level2: "", level3: "", level4: "", title: "", lat: 0, lng: 0, rank: 0 }]);
  };

  const handleRemoveRegion = (index: number) => {
    const newRegions = regions.filter((_, i) => i !== index);
    setRegions(newRegions);
  };

  const handleRegionChange = (index: number, updatedRegion: { level1?: string; level2?: string; level3?: string; level4?: string; title?: string; lat?: number; lng?: number; }) => {
    const newRegions = [...regions];
    newRegions[index] = { ...newRegions[index], ...updatedRegion }; // 객체로 업데이트
    setRegions(newRegions);
  };

  const handleSubmit = async () => {
    const requestData = {
      productMst: { 
        title: productTitle, 
        url: productUrl, 
        visitDt: visitDt.replaceAll("-", "") 
      },
      regionMst: regions,
    };

    try {
      const token = localStorage.getItem('jwtToken');
      const rqConfig: any = {
        headers: {}
      };
      if (token) {
        rqConfig.headers['Authorization'] = `Bearer ${token}`;
      }

      await axios.post(`${API_URL}/product/save`, requestData, rqConfig);
      alert('저장했습니다.');
      history.push("/mypage");      
    } catch (error) {
      alert(error);
      console.error("Error saving product:", error);
    }
  };

  const handleTitleClick = () => {
    history.push('/');
  };

  return (
    <IonPage>
      <Helmet>
        <title>데이트 코스 등록</title>
      </Helmet>
      <IonHeader>
        <IonToolbar>
          <IonTitle onClick={handleTitleClick} style={{ cursor: 'pointer' }}>Home</IonTitle>
          <IonButtons slot='end'>
            <IonButton onClick={logout}>로그아웃</IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <div className="mypage-container">
          <div className="sidebar">
            <IonList>
              <IonItem button onClick={() => history.push('/mypage')}><span>내 정보</span></IonItem>              
              <IonItem button onClick={() => history.push('/mypage/likes')}><span>좋아요 목록</span></IonItem>
              <IonItem button onClick={() => history.push('/mypage/course/add')}><span>데이트 코스 등록</span></IonItem>
            </IonList>
          </div>
          <div className="content">
            <h2>데이트 코스 추가</h2>

            {/* ProductMst Section */}
            <IonList style={{ border: '1px solid #ccc', borderRadius: '8px', padding: '20px', marginBottom: '20px' }}>
              <h3>제품 정보</h3>
              <IonItem>
                <IonLabel position="floating">코스 제목</IonLabel>
                <IonInput
                  value={productTitle}
                  onIonChange={e => setProductTitle(e.detail.value!)}
                />
              </IonItem>
              <IonItem>
                <IonLabel position="floating">코스 관련 URL(선택)</IonLabel>
                <IonInput
                  value={productUrl}
                  onIonChange={e => setProductUrl(e.detail.value!)}
                />
              </IonItem>
              <IonItem>
                <IonLabel position="floating">방문 날짜 (YYYY-MM-DD)</IonLabel>
                <IonInput
                  value={visitDt}
                  onIonChange={e => setVisitDt(e.detail.value!)}
                />
              </IonItem>
            </IonList>
            
            {/* RegionMst Section */}
            {regions.map((region, index) => (
              <IonList key={index} style={{ border: '1px solid #ccc', borderRadius: '8px', padding: '20px', marginBottom: '20px' }}>
                <h3>지역 정보 {index + 1}</h3>
                <AddressSearch onAddressSelect={(data) => handleRegionChange(index, {
                  level1: data.level1, // a를 level1에 설정
                  level2: data.level2, // b를 level2에 설정
                  level3: data.level3, // c를 level3에 설정
                  lat: data.lat,   // lat을 설정
                  lng: data.lng   // lng을 설정
                })} />

                <IonItem>
                  <IonLabel position="floating">장소 키워드(Ex 홍대, 한강)</IonLabel>
                  <IonInput
                    value={region.level4}
                    onIonChange={e => handleRegionChange(index, { level4: e.detail.value! })}
                  />
                </IonItem>
                <IonItem>
                  <IonLabel position="floating">장소 명칭(Ex 하늘공원, 음식점 이름)</IonLabel>
                  <IonInput
                    value={region.title}
                    onIonChange={e => handleRegionChange(index, { title: e.detail.value! })}
                  />
                </IonItem>
                <IonButton onClick={() => handleRemoveRegion(index)} color="danger">
                  지역 제거
                </IonButton>
              </IonList>
            ))}
            
            {/* 지역 추가 버튼 섹션 */}
            <IonButton expand="full" onClick={handleAddRegion} style={{ marginBottom: '20px' }}>
              지역 추가
            </IonButton>

            {/* 저장 버튼 섹션 */}
            <IonButton expand="full" onClick={handleSubmit}>
              저장
            </IonButton>
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default AddCourseContainer;
