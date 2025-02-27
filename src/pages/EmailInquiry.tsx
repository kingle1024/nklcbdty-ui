import React, { useState } from 'react';
import { IonPage, IonContent, IonList, IonItem, IonButton, IonAlert, IonInput, IonTextarea, IonLabel, IonLoading } from '@ionic/react';
import { Helmet } from 'react-helmet';
import './Mypage.css';
import axios from 'axios';
import API_URL from '../config';
import CommonHeader from '../common/CommonHeader';

const EmailInquiry: React.FC = () => {  
  const [recipientEmail, setRecipientEmail] = useState(''); // 수신자 이메일 상태
  const [title, setTitle] = useState(''); // 제목 상태
  const [content, setContent] = useState(''); // 내용 상태
  const [showAlert, setShowAlert] = useState(false); // 알림 상태
  const [alertMessage, setAlertMessage] = useState(''); // 알림 메시지
  const [loading, setLoading] = useState(false); // 로딩 상태

  const isValidEmail = (email: string) => {
    // 이메일 유효성 검사 정규표현식
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  }

  const handleSubmit = async () => {
    if (!isValidEmail(recipientEmail)) {
      setAlertMessage('유효한 이메일 주소를 입력하세요.');
      setShowAlert(true);
      return;
    }

    setLoading(true); // 로딩 시작

    try {
      const emailRequest = {
        to: recipientEmail,
        subject: title,
        body: content,
      };
      
      const response = await axios.post(`${API_URL}/email/send`, emailRequest, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.data.result === 'ok') {
        setAlertMessage('이메일이 성공적으로 전송되었습니다.');
      } else {
        setAlertMessage('이메일 전송에 실패했습니다.');
      }
    } catch (error: any) {
      if (axios.isAxiosError(error)) {
        setAlertMessage('오류가 발생했습니다: ' + (error.response?.data?.message || error.message));
      } else {
        setAlertMessage('예기치 않은 오류가 발생했습니다.');
      }
    } finally {
      setLoading(false); // 로딩 종료
      setShowAlert(true); // 알림 표시
    }
  }

  return (
    <IonPage>
      <Helmet>
        <title>이메일 문의</title>
        <meta name="google-adsense-account" content="ca-pub-9366813459634197" />      
        <meta charSet="utf-8" />        
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="description" content="이메일" />
      </Helmet>
      <CommonHeader />
      <IonContent>
      <div className="mypage-container">
          <div className="content">
            <h2>이메일 문의</h2>
            <IonList>
              <IonItem>
                <IonLabel position="stacked">답변 받을 이메일</IonLabel>
                <IonInput 
                  value={recipientEmail} 
                  onIonChange={e => setRecipientEmail(e.detail.value!)} 
                  placeholder="답변 받을 이메일을 입력하세요"
                  type="email"
                />
              </IonItem>
              <IonItem>
                <IonLabel position="stacked">내용</IonLabel>
                <IonTextarea 
                  value={content} 
                  onIonChange={e => setContent(e.detail.value!)} 
                  placeholder="내용을 입력하세요"
                  rows={6}
                />
              </IonItem>
            </IonList>
            <IonButton expand="full" onClick={handleSubmit}>전송</IonButton>
            <IonAlert
              isOpen={showAlert}
              onDidDismiss={() => setShowAlert(false)}
              header={'알림'}
              message={alertMessage}
              buttons={['확인']}
            />
            <IonLoading
              isOpen={loading}
              message={'전송 중...'}
              spinner="crescent"
            />
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default EmailInquiry;
