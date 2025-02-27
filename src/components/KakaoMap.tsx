import React, { useEffect } from 'react';
import './KakaoMap.css';
import { KakaoMapProps } from '../common/Types';

declare global {
  interface Window {
    kakao: any;
  }
}

const KakaoMap: React.FC<KakaoMapProps> = ({regions}) => {

  useEffect(() => {
    const script = document.createElement('script');
    script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=b3851f460ed49a031b6c35cb808a1514&autoload=false`;
    script.async = true;
    document.head.appendChild(script);

    script.onload = () => {
      window.kakao.maps.load(() => {
        const container = document.getElementById('map');
        const options = {
          center: new window.kakao.maps.LatLng(regions[0].lat, regions[0].lng), // 기본 좌표 (서울)
          level: 6
        };

        const map = new window.kakao.maps.Map(container, options);
        const imageSrc = 'https://t1.daumcdn.net/localimg/localimages/07/mapapidoc/marker_red.png'; // 마커이미지의 주소입니다    
        const imageOption = {offset: new window.kakao.maps.Point(13, 39)}; // 마커이미지의 옵션입니다. 마커의 좌표와 일치시킬 이미지 안에서의 좌표를 설정합니다.
        const markerImage = new window.kakao.maps.MarkerImage(imageSrc, new window.kakao.maps.Size(34, 39), imageOption);
        const linePath: any[] = []; // PolyLine에 사용할 좌표 배열

        // 마커 추가
        // 마커를 표시할 위치와 title 객체 배열입니다 
        
        regions.forEach(region => {
          const markerPosition = new window.kakao.maps.LatLng(region.lat, region.lng);
          const marker = new window.kakao.maps.Marker({
            position: markerPosition,
            image: markerImage
          });
          marker.setMap(map);
          linePath.push(markerPosition); // PolyLine 좌표 배열에 추가

          const content = `<div class="customoverlay">
            <a href="https://map.kakao.com/link/map/11394059" target="_blank">
              <span class="title">${region.title}</span>
            </a>
          </div>`;
          new window.kakao.maps.CustomOverlay({
            map: map,
            position: markerPosition,
            content: content,    
            yAnchor: 0.2,
          }); 

          // PolyLine을 생성하고 지도에 추가
          const polyline = new window.kakao.maps.Polyline({
            path: linePath, // 선을 구성하는 좌표 배열
            strokeWeight: 5, // 선의 두께
            strokeColor: '#FF0000', // 선의 색깔
            strokeOpacity: 0.7, // 선의 불투명도
            strokeStyle: 'solid' // 선의 스타일
          });
          polyline.setMap(map);
        });

      });
    };

    return () => {
      document.head.removeChild(script);
    }
  }, [regions]);

  return (
    <div style={{ width: '100%', height: '500px' }}>
      <div id="map" style={{ width: '100%', height: '100%' }}></div>
    </div>
  );
}

export default KakaoMap;
