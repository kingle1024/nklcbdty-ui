import React, { useEffect, useRef, useState } from 'react';

interface AddressSearchProps {
    onAddressSelect: (data: any) => void;
}

const AddressSearch: React.FC<AddressSearchProps> = ({ onAddressSelect }) => {
    const [address, setAddress] = useState<string>('');
    const mapContainer = useRef<HTMLDivElement | null>(null);
    const [map, setMap] = useState<any>(null);
    const [marker, setMarker] = useState<any>(null);

    useEffect(() => {
        if (mapContainer.current) {
            const mapOption = {
                center: new (window as any).daum.maps.LatLng(37.537187, 127.005476), // 초기 중심 좌표
                level: 5, // 초기 확대 레벨
            };

            const newMap = new (window as any).daum.maps.Map(mapContainer.current, mapOption);
            setMap(newMap);

            // 마커 초기화
            const initialMarker = new (window as any).daum.maps.Marker({
                position: new (window as any).daum.maps.LatLng(37.537187, 127.005476),
                map: newMap, // 초기 마커를 지도에 추가
            });
            setMarker(initialMarker);
        }
    }, []);

    const openPostcode = () => {
        new (window as any).daum.Postcode({
            oncomplete: (data: any) => {
                let fullAddress = data.address; // 도로명 주소
                let extraAddress = ''; // 추가 주소

                if (data.addressType === 'R') {
                    if (data.bname) {
                        extraAddress += data.bname;
                    }
                    if (data.buildingName) {
                        extraAddress += extraAddress ? `, ${data.buildingName}` : data.buildingName;
                    }
                    fullAddress += extraAddress ? ` (${extraAddress})` : '';
                }

                setAddress(fullAddress); // 상태 업데이트
                moveMap(fullAddress); // moveMap 함수 호출 시 전체 주소 전달
            },
        }).open();
    };

    const moveMap = (address: string) => {
        const geocoder = new (window as any).daum.maps.services.Geocoder();
        geocoder.addressSearch(address, (results: any, status: any) => {
            if (status === (window as any).daum.maps.services.Status.OK) {
                const result = results[0];
                
                const response = {
                  level1: result.road_address.region_1depth_name || '',
                  level2: result.road_address.region_2depth_name || '',
                  level3: result.road_address.road_name + ' ' + result.road_address.main_building_no || '',
                  lat: result.y || 0,
                  lng: result.x || 0,                  
                }
                onAddressSelect(response);

                const coords = new (window as any).daum.maps.LatLng(result.y, result.x);

                // 지도 중심 변경
                map.setCenter(coords);

                // 마커 위치 설정
                if (marker) {
                    marker.setPosition(coords); // 기존 마커 위치 업데이트
                } else {
                    const newMarker = new (window as any).daum.maps.Marker({
                        position: coords,
                        map: map, // 새 마커를 지도에 추가
                    });
                    setMarker(newMarker);
                }
            } else {
                console.error('주소 검색 실패:', status);
            }
        });
    };

    return (
        <div style={{ textAlign: 'left' }}>
            <h1>주소 검색</h1>
            <div style={{ display: 'flex', justifyContent: 'left', marginBottom: '10px' }}>
                <input
                    type="text"
                    value={address}
                    readOnly
                    placeholder="주소를 입력하세요"
                    style={{ width: '300px', padding: '10px', marginRight: '10px' }}
                />
                <button onClick={openPostcode} style={{ padding: '10px 20px' }}>
                    우편번호 검색
                </button>
            </div>
            <div
                ref={mapContainer}
                style={{ width: '500px', height: '400px', marginTop: '10px', display: 'block' }}
            />
        </div>
    );
};

export default AddressSearch;
