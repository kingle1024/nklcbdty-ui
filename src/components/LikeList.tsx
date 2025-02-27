import React, { useState, useEffect } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import { Link, useHistory } from 'react-router-dom';
import API_URL from "../config";
import './ListContainer.css';
import { IonPage, IonContent } from '@ionic/react';
import { Helmet } from 'react-helmet';
import UseTokenRefresh from '../common/UseTokenRefresh';
import { Product_mst } from '../response/LikesResponse';
import CommonHeader from '../common/CommonHeader';
import Sidebar from '../common/Sidebar';

const LikeList: React.FC = () => {
  const { fetchWithToken } = UseTokenRefresh();
  const [likedProducts, setLikedProducts] = useState<Product_mst[]>([]); // 좋아요 목록을 저장할 상태 변수
  const [activeTab, setActiveTab] = useState('profile'); // 기본 활성화된 탭 설정

  useEffect(() => {
    const fetchLikedProducts = async () => {
      const data = await fetchWithToken(`${API_URL}/api/mypage/likes`);
      if (data) {
        setLikedProducts(data.product);
      }
    };

    fetchLikedProducts();
  }, []);

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
          <div className='content'>
            <h2>좋아요 목록</h2>
            <ul>
              {/* 좋아요 목록을 매핑하여 각 요소를 표시 */}
              {likedProducts.map((item: Product_mst) => (
                <li key={item.id}>
                  <Link to={`/detail/${item.id}`}>{item.title}</Link>
                  <div>
                    {item.regionTitle.split(',').map((region: string, index: number) => (
                      <span key={index} className="badge badge-secondary" style={{ marginRight: '5px' }}>
                        {region}
                      </span>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>

      </IonContent>
    </IonPage>
  );
};

export default LikeList;
