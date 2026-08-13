import React, { useCallback, useEffect, useState } from 'react';
import { useHistory, useParams } from 'react-router-dom';
import { IonPage, IonContent, IonButton, IonSpinner, IonAlert } from '@ionic/react';
import { Helmet } from 'react-helmet';
import CommonHeader from '../common/CommonHeader';
import { useAuth } from '../common/AuthContextType';
import { BoardType, boardLabel, createPost, fetchPost, updatePost } from '../common/boardApi';
import './Board.css';

// 서버(BoardService)의 제한과 같은 값. 넘기면 서버가 400 을 주므로 입력에서 먼저 막는다.
const MAX_TITLE_LENGTH = 300;
const MAX_CONTENT_LENGTH = 20000;
const MAX_AUTHOR_NAME_LENGTH = 50;
const MIN_PASSWORD_LENGTH = 4;
const MAX_PASSWORD_LENGTH = 20;

/**
 * 글 작성(/board/write)과 수정(/board/:id/edit)을 함께 처리한다.
 * :id 가 있으면 수정 모드로 기존 내용을 불러온다.
 *
 * 로그인 없이도 쓸 수 있고(익명), 그 경우 닉네임과 비밀번호를 받아 두었다가
 * 나중에 수정·삭제할 때 그 비밀번호로 본인을 확인한다.
 */
const BoardWrite: React.FC<{ boardType?: BoardType }> = ({ boardType = 'free' }) => {
  const history = useHistory();
  const { id } = useParams<{ id?: string }>();
  const isEdit = !!id;
  const postId = Number(id);
  const { isLoggedIn } = useAuth();
  const label = boardLabel(boardType);
  const basePath = boardType === 'notice' ? '/notice' : '/board';

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [guestName, setGuestName] = useState('');
  const [password, setPassword] = useState('');
  /** 수정 모드에서 비밀번호가 필요한 글인지(익명 글을 남이 열었을 때) */
  const [needsPassword, setNeedsPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(isEdit);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    if (!isEdit) {
      return;
    }

    setIsLoading(true);
    try {
      const post = await fetchPost(boardType, postId);
      // 내 글도 아니고 비밀번호 글도 아니면(= 관리자 글) 손댈 수 없다. 서버도 다시 확인한다.
      if (!post.mine && !post.passwordProtected) {
        history.replace(`${basePath}/${postId}`);
        return;
      }
      setNeedsPassword(!post.mine && post.passwordProtected);
      setTitle(post.title);
      setContent(post.content);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '글을 가져오지 못했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, [boardType, isEdit, postId, history, basePath]);

  useEffect(() => {
    load();
  }, [load]);

  /** 익명으로 새 글을 쓰는 중인지 — 닉네임/비밀번호 입력이 필요하다 */
  const isGuestCreate = !isEdit && !isLoggedIn;

  const validationError = (): string | null => {
    if (!title.trim()) {
      return '제목을 입력해주세요.';
    }
    if (!content.trim()) {
      return '내용을 입력해주세요.';
    }
    if (isGuestCreate && !guestName.trim()) {
      return '닉네임을 입력해주세요.';
    }
    if ((isGuestCreate || needsPassword) && !password) {
      return '비밀번호를 입력해주세요.';
    }
    if (
      (isGuestCreate || needsPassword) &&
      (password.length < MIN_PASSWORD_LENGTH || password.length > MAX_PASSWORD_LENGTH)
    ) {
      return `비밀번호는 ${MIN_PASSWORD_LENGTH}~${MAX_PASSWORD_LENGTH}자로 입력해주세요.`;
    }
    return null;
  };

  const handleSubmit = async () => {
    const invalid = validationError();
    if (invalid) {
      setMessage(invalid);
      return;
    }

    setIsSubmitting(true);
    try {
      if (isEdit) {
        await updatePost(
          boardType,
          postId,
          title.trim(),
          content.trim(),
          needsPassword ? password : undefined
        );
        history.replace(`${basePath}/${postId}`);
        return;
      }
      const newId = await createPost(
        boardType,
        title.trim(),
        content.trim(),
        isGuestCreate ? { authorName: guestName.trim(), password } : {}
      );
      history.replace(`${basePath}/${newId}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '저장하지 못했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <IonPage>
      <Helmet>
        <title>{isEdit ? '글 수정' : '글쓰기'} | {label}</title>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Helmet>
      <CommonHeader />
      <IonContent>
        <div className="board-container">
          <div className="board-card">
            <div className="board-head">
              <h2>{isEdit ? '글 수정' : '글쓰기'}</h2>
            </div>

            {isLoading ? (
              <div className="board-empty"><IonSpinner name="crescent" /></div>
            ) : (
              <>
                {isGuestCreate && (
                  <p className="board-subtitle">
                    로그인 없이 쓸 수 있습니다. 나중에 수정·삭제하려면 닉네임과 비밀번호가 필요합니다.
                  </p>
                )}

                {isGuestCreate && (
                  <div className="board-guest-fields">
                    <input
                      value={guestName}
                      maxLength={MAX_AUTHOR_NAME_LENGTH}
                      onChange={(e) => setGuestName(e.target.value)}
                      placeholder="닉네임"
                    />
                    <input
                      type="password"
                      value={password}
                      maxLength={MAX_PASSWORD_LENGTH}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={`비밀번호 (${MIN_PASSWORD_LENGTH}~${MAX_PASSWORD_LENGTH}자)`}
                    />
                  </div>
                )}

                {needsPassword && (
                  <div className="board-guest-fields">
                    <input
                      type="password"
                      value={password}
                      maxLength={MAX_PASSWORD_LENGTH}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="글을 쓸 때 쓴 비밀번호"
                    />
                  </div>
                )}

                <div className="board-field">
                  <label htmlFor="board-title">제목</label>
                  <input
                    id="board-title"
                    value={title}
                    maxLength={MAX_TITLE_LENGTH}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="제목을 입력하세요"
                  />
                  <div className="board-field-count">{title.length} / {MAX_TITLE_LENGTH}</div>
                </div>

                <div className="board-field">
                  <label htmlFor="board-content">내용</label>
                  <textarea
                    id="board-content"
                    value={content}
                    maxLength={MAX_CONTENT_LENGTH}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="내용을 입력하세요"
                    rows={14}
                  />
                  <div className="board-field-count">{content.length} / {MAX_CONTENT_LENGTH}</div>
                </div>

                <div className="board-form-actions">
                  <IonButton
                    size="small"
                    fill="outline"
                    onClick={() => (isEdit
                      ? history.replace(`${basePath}/${postId}`)
                      : history.replace(basePath))}
                  >
                    취소
                  </IonButton>
                  <IonButton size="small" onClick={handleSubmit} disabled={isSubmitting}>
                    {isSubmitting ? '저장 중...' : '저장'}
                  </IonButton>
                </div>
              </>
            )}
          </div>
        </div>

        <IonAlert
          isOpen={!!message}
          onDidDismiss={() => setMessage('')}
          header="알림"
          message={message}
          buttons={['확인']}
        />
      </IonContent>
    </IonPage>
  );
};

export default BoardWrite;
