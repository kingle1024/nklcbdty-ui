import React, { useEffect, useState } from "react";
import { useHistory, useParams } from "react-router-dom";
import { IonContent, IonHeader, IonPage, IonTitle, IonToolbar, IonButton } from "@ionic/react";
import axios from 'axios';
import KakaoMap from '../components/KakaoMap';
import CommentList from "../components/CommentList";
import { CommentDetail, ProductDetail, RegionDetail } from "../common/Types";
import API_URL from "../config";
import CommentForm from "../components/CommentForm";
import './Detail.css';
import { Helmet } from "react-helmet";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faThumbsUp } from '@fortawesome/free-solid-svg-icons';
import { useAuth } from "../common/AuthContextType";

const Detail: React.FC = () => {
  const { user, logout } = useAuth();
  const { id } = useParams<{ id: string }>();
  const history = useHistory();
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [regions, setRegions] = useState<RegionDetail[]>([]);
  const [comments, setComments] = useState<CommentDetail[]>([]);
  const [like, setLike] = useState<boolean>(false);

  useEffect(() => {
    const fetchProductDetail = async () => {
      try {
        const token = localStorage.getItem('jwtToken');
        const rqConfig:any = {
          headers: {}
        };
        if(token) {
          rqConfig.headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await axios.get<{ 
          product: ProductDetail; 
          regions: RegionDetail[]; 
          comments: CommentDetail[];
          like: boolean;
        }>(`${API_URL}/detail/${id}`, rqConfig);

        setProduct(response.data.product);
        setRegions(response.data.regions);
        setComments(response.data.comments);
        setLike(response.data.like);
      } catch (error) {
        console.error('Error fetching product detail:', error);
      }
    };

    fetchProductDetail();
  }, [id]);

  const addComment = (newComment: CommentDetail) => {
    setComments((prevComments) => [newComment, ...prevComments]);
  }
  
  const handleTitleClick = () => {
    history.push('/');
  }

  const handleLikeClick = async () => {
    try {
      const token = localStorage.getItem('jwtToken');
      if(!token) {
        alert('로그인 후에 좋아요를 누를 수 있습니다.');
        return;
      }

      const rqConfig: any = {
        headers: {}
      };
      if (token) {
        rqConfig.headers['Authorization'] = `Bearer ${token}`;
      }
  
      const url = `${API_URL}/likes/${id}`;
      if (like) {
        // 좋아요 취소
        await axios.delete(url, rqConfig);
      } else {
        // 좋아요
        await axios.post(url, {}, rqConfig);
      }
  
      // 좋아요 상태 토글
      setLike((prevLiked) => !prevLiked);
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        if (error.response.status === 401) {
            alert('로그인 정보가 없어 메인 페이지로 이동합니다.');
            logout();
        } else {
            console.error('Error fetching product detail:', error);
        }
    } else {
        console.error('Unexpected error:', error);
    }
    }
  }

  return (
    <IonPage>
      <Helmet>
        <title>데이트 코스 상세</title>
        <meta name="google-adsense-account" content="ca-pub-9366813459634197" />      
        <meta charSet="utf-8" />        
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="description" content="데이트 코스 상세 페이지" />
        
      </Helmet>
      <IonHeader>
        <IonToolbar>
          <IonTitle onClick={handleTitleClick} style={{ cursor: 'pointer' }}>Home</IonTitle>
        </IonToolbar>        
      </IonHeader>
      <IonContent fullscreen>      
        <div className="detail-container">
          {product ? (
            <>
              <div className="d-flex">
                <h1>{product.title}</h1> 
                <IonButton 
                  className="small-button"
                  href={product.url} 
                  target="_blank" 
                  rel="noopener noreferrer"                  
                >
                  방문하기
                </IonButton>                
              </div>
              
              <div className='detail-content'> 
                <div className='post-content'>
                  <button 
                    onClick={handleLikeClick} 
                    style={{
                      border: 'none',
                      cursor: 'pointer',
                      padding: '10px',
                      borderRadius: '5px',
                    }}
                  >
                    <FontAwesomeIcon 
                      icon={faThumbsUp} 
                      style={{ color: like ? 'blue' : 'black' }} // 상태에 따라 아이콘 색상 변경
                    />
                    좋아요
                  </button>
                </div>
                <h3>이동순서</h3>
                {regions.map((region, index) => (
                  <div key={region.regionCd}>
                    <h3>{`${index +1}. ${region.title}`}</h3>
                  </div>
                ))}
              </div>

              <div className="map-container">
                <KakaoMap regions={regions} />
              </div>
              
              <div className="comment-section">
                <CommentForm productCd={id} addComment={addComment} />
                
              </div>

              <div className="comment-list">
                <CommentList comments={comments} />
              </div>
            </>
          ) : (
            <p>Loading...</p>
          )}
        </div>
        
      </IonContent>
    </IonPage>
  )
}

export default Detail;
