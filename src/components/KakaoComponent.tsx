import React, { useEffect, useRef, useState } from 'react';

const KakaoComponent: React.FC = () => {
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const [address, setAddress] = useState<string>('');
  const [coordinates, setCoordinates] = useState<{ latitude: number | null; longitude: number | null }>({ latitude: null, longitude: null });

  useEffect(() => {
    const loadKakaoMap = () => {
      const { kakao } = window as any;

      // 지도 초기화
      const mapOptions = {
        center: new kakao.maps.LatLng(37.5665, 126.978), // 초기 위치 (서울)
        level: 3,
      };

      const map = new kakao.maps.Map(mapContainer.current!, mapOptions);

      // 검색 버튼 클릭 이벤트 처리
      const handleSearch = () => {
        console.log('address > ', address);
        if (address) {
          const geocoder = new kakao.maps.services.Geocoder();
          geocoder.addressSearch(address, (result: any, status: any) => {
            console.log(result, status); // 결과와 상태를 콘솔에 출력합니다.

            if (status === kakao.maps.services.Status.OK) {
              const lat = result[0].y;
              const lng = result[0].x;

              // 마커 추가
              new kakao.maps.Marker({
                position: new kakao.maps.LatLng(lat, lng),
                map: map,
              });

              // 지도 중심 이동
              map.setCenter(new kakao.maps.LatLng(lat, lng));
              setCoordinates({ latitude: lat, longitude: lng });
            } else {
              // alert('주소를 찾을 수 없습니다.');
              console.log('주소를 찾을 수 없습니다.');
            }
          });
        } else {
          // alert('주소를 입력하세요.');
          console.log('주소를 입력하세요1');
        }
      };

      // 버튼 클릭 이벤트 리스너 추가
      const button = document.getElementById('searchButton') as HTMLButtonElement;
      button.addEventListener('click', handleSearch);

      return () => {
        button.removeEventListener('click', handleSearch);
      };
    };

    // 카카오 지도 API가 로드되었는지 확인
    const checkKakaoLoaded = () => {
      if (window.kakao && window.kakao.maps) {
        loadKakaoMap();
      } else {
        setTimeout(checkKakaoLoaded, 100); // 100ms 후 다시 확인
      }
    };

    checkKakaoLoaded(); // 카카오 API 로드 확인 시작
  }, []); // 의존성 배열에서 address 제거

  return (
    <div>
      <h2>카카오 지도에서 주소 검색</h2>
      <input
        type="text"
        value={address}
        onChange={(e) => setAddress(e.target.value)}
        placeholder="주소를 입력하세요"
      />
      <button id="searchButton">검색</button>
      <div ref={mapContainer} style={{ width: '100%', height: '400px' }}></div>
      {coordinates.latitude && coordinates.longitude && (
        <div>
          <p>위도: {coordinates.latitude}</p>
          <p>경도: {coordinates.longitude}</p>
        </div>
      )}
    </div>
  );
};

export default KakaoComponent;
