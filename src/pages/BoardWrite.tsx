import React, { useCallback, useEffect, useState } from 'react';
import { useHistory, useParams } from 'react-router-dom';
import { IonPage, IonContent, IonButton, IonSpinner, IonAlert } from '@ionic/react';
import { Helmet } from 'react-helmet';
import CommonHeader from '../common/CommonHeader';
import { useAuth } from '../common/AuthContextType';
import { createPost, fetchPost, updatePost } from '../common/boardApi';
import './Board.css';

const MAX_TITLE_LENGTH = 200;
const MAX_CONTENT_LENGTH = 10000;

/**
 * 글 작성(/board/write)과 수정(/board/:id/edit)을 함께 처리한다.
 * :id 가 있으면 수정 모드로 기존 내용을 불러온다.
 */
const BoardWrite: React.FC = () => {
  const history = useHistory();
  const { id } = useParams<{ id?: string }>();
  const isEdit = !!id;
  const postId = Number(id);
  const { isLoggedIn } = useAuth();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isLoading, setIsLoading] = useState(isEdit);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  // 비로그인 상태로 주소를 직접 열었을 때
  useEffect(() => {
    if (!isLoggedIn) {
      history.replace('/login');
    }
  }, [isLoggedIn, history]);

  const load = useCallback(async () => {
    if (!isEdit) {
      return;
    }

    setIsLoading(true);
    try {
      const post = await fetchPost(postId);
      // 남의 글 수정 주소를 직접 열었으면 상세로 되돌린다(서버도 작성자를 다시 확인한다)
      if (!post.mine) {
        history.replace(`/board/${postId}`);
        return;
      }
      setTitle(post.title);
      setContent(post.content);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '글을 가져오지 못했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, [isEdit, postId, history]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSubmit = async () => {
    if (!title.trim()) {
      setMessage('제목을 입력해주세요.');
      return;
    }
    if (!content.trim()) {
      setMessage('내용을 입력해주세요.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (isEdit) {
        await updatePost(postId, title.trim(), content.trim());
        history.replace(`/board/${postId}`);
        return;
      }
      const newId = await createPost(title.trim(), content.trim());
      history.replace(`/board/${newId}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '저장하지 못했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <IonPage>
      <Helmet>
        <title>{isEdit ? '글 수정' : '글쓰기'} | 자유게시판</title>
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
                    onClick={() => (isEdit ? history.replace(`/board/${postId}`) : history.replace('/board'))}
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
