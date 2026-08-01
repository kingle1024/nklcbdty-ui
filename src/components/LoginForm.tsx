import React, { useState } from 'react';
import { IonButton, IonInput, IonSpinner } from '@ionic/react';
import { useAuth } from '../common/AuthContextType';
import { login as loginApi, signup as signupApi, emailExists } from '../common/authApi';
import KakaoLoginButton from './KakoLoginButton';
import './LoginForm.css';

type Mode = 'login' | 'signup';

interface LoginFormProps {
  /** 로그인/회원가입 성공 후 처리(모달 닫기, 페이지 이동 등) */
  onSuccess?: () => void;
}

const MIN_PASSWORD_LENGTH = 8; // 백엔드 LocalAuthService 와 같은 기준

/**
 * 이메일+비밀번호 로그인/회원가입 폼. 아래에 기존 카카오 로그인 버튼을 함께 둔다.
 * PC 는 LoginModal, 모바일은 /login 페이지에서 같은 폼을 쓴다.
 */
const LoginForm: React.FC<LoginFormProps> = ({ onSuccess }) => {
  const { login } = useAuth();
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [nickname, setNickname] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const switchMode = (next: Mode) => {
    setMode(next);
    setError(null);
    setPassword('');
    setPasswordConfirm('');
  };

  /** 제출 전 클라이언트 검증. 문제가 없으면 null. */
  const validate = (): string | null => {
    if (!email.trim() || !password) {
      return '이메일과 비밀번호를 입력해 주세요.';
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return '이메일 형식이 올바르지 않습니다.';
    }
    if (mode === 'signup') {
      if (password.length < MIN_PASSWORD_LENGTH) {
        return `비밀번호는 ${MIN_PASSWORD_LENGTH}자 이상으로 입력해 주세요.`;
      }
      if (password !== passwordConfirm) {
        return '비밀번호가 서로 다릅니다.';
      }
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const invalid = validate();
    if (invalid) {
      setError(invalid);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      if (mode === 'signup') {
        // 서버도 중복을 막지만, 먼저 확인해 주면 안내가 더 빠르다.
        if (await emailExists(email.trim())) {
          setError('이미 가입된 이메일입니다. 로그인해 주세요.');
          return;
        }
        const auth = await signupApi(email.trim(), password, nickname.trim());
        login(auth); // 가입 즉시 로그인 상태가 된다
      } else {
        const auth = await loginApi(email.trim(), password);
        login(auth);
      }
      onSuccess?.();
    } catch (err: any) {
      setError(err?.message ?? '잠시 후 다시 시도해 주세요.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-form">
      <div className="login-form__tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'login'}
          className={`login-form__tab${mode === 'login' ? ' login-form__tab--active' : ''}`}
          onClick={() => switchMode('login')}
        >
          로그인
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'signup'}
          className={`login-form__tab${mode === 'signup' ? ' login-form__tab--active' : ''}`}
          onClick={() => switchMode('signup')}
        >
          회원가입
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="login-form__field">
          <IonInput
            type="email"
            value={email}
            placeholder="이메일"
            autocomplete="email"
            onIonInput={(e) => setEmail(e.detail.value ?? '')}
          />
        </div>

        {mode === 'signup' && (
          <div className="login-form__field">
            <IonInput
              value={nickname}
              placeholder="닉네임 (생략하면 이메일 앞부분을 씁니다)"
              autocomplete="nickname"
              onIonInput={(e) => setNickname(e.detail.value ?? '')}
            />
          </div>
        )}

        <div className="login-form__field">
          <IonInput
            type="password"
            value={password}
            placeholder={mode === 'signup' ? `비밀번호 (${MIN_PASSWORD_LENGTH}자 이상)` : '비밀번호'}
            autocomplete={mode === 'signup' ? 'new-password' : 'current-password'}
            onIonInput={(e) => setPassword(e.detail.value ?? '')}
          />
        </div>

        {mode === 'signup' && (
          <div className="login-form__field">
            <IonInput
              type="password"
              value={passwordConfirm}
              placeholder="비밀번호 확인"
              autocomplete="new-password"
              onIonInput={(e) => setPasswordConfirm(e.detail.value ?? '')}
            />
          </div>
        )}

        {error && <p className="login-form__error">{error}</p>}

        <IonButton expand="block" type="submit" disabled={loading} className="login-form__submit">
          {loading ? <IonSpinner name="crescent" /> : mode === 'signup' ? '회원가입' : '로그인'}
        </IonButton>
      </form>

      <div className="login-form__divider">
        <span>또는</span>
      </div>

      <KakaoLoginButton
        label="카카오로 로그인"
        fullWidth
        onSuccess={onSuccess}
        onError={setError}
      />

      <p className="login-form__hint">
        {mode === 'login'
          ? '계정이 없으신가요? 위의 회원가입을 눌러주세요.'
          : '이미 계정이 있으신가요? 위의 로그인을 눌러주세요.'}
      </p>
    </div>
  );
};

export default LoginForm;
