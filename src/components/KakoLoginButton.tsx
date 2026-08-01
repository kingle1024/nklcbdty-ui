import React from 'react';
import KakaoLogin from 'react-kakao-login';
import { FaComment } from 'react-icons/fa';
import API_URL from '../config';
import { useAuth } from '../common/AuthContextType';
import { AuthResponse } from '../common/authApi';
import './KakaoLoginButton.css';

interface KakaoLoginButtonProps {
    /** 버튼 문구. 로그인 화면에서는 "카카오로 로그인" 처럼 길게 쓴다. */
    label?: string;
    /** 로그인 폼 안에서 다른 버튼과 같은 너비로 놓을 때 사용 */
    fullWidth?: boolean;
    /** 로그인 성공 후 화면을 닫거나 이동시킬 때 사용 */
    onSuccess?: () => void;
    /** 로그인 실패를 화면에 보여줄 때 사용 */
    onError?: (message: string) => void;
}

const KakaoLoginButton: React.FC<KakaoLoginButtonProps> = ({
    label = 'Login',
    fullWidth = false,
    onSuccess,
    onError,
}) => {
    const { login } = useAuth();

    const responseKakao = async (response: any) => {

        try {
            const res = await fetch(`${API_URL}/api/kakaoLogin`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    accessToken: response.response.access_token
                })
            });

            if(!res.ok) {
                throw new Error('Network response was not ok');
            }

            const data: AuthResponse = await res.json();
            // 토큰/사용자 정보 저장은 AuthContext 가 자체 로그인과 동일하게 처리한다.
            login(data);
            onSuccess?.();
        } catch (error) {
            console.log('Error: ', error);
            onError?.('카카오 로그인에 실패했습니다. 잠시 후 다시 시도해 주세요.');
        }

    };

    return (
        <KakaoLogin
            token="b3851f460ed49a031b6c35cb808a1514"
            onSuccess={responseKakao}
            onFail={(error: any) => {
                console.error(error);
                onError?.('카카오 로그인이 취소되었거나 실패했습니다.');
            }}
            render={({ onClick }) => (
                <button
                    type="button"
                    onClick={onClick}
                    className={`kakao-login-button${fullWidth ? ' kakao-login-button--block' : ''}`}
                >
                    <FaComment size={18} />
                    {label}
                </button>
            )}
        />
    );
};

export default KakaoLoginButton;
