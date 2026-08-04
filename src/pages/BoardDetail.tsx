import React, { useCallback, useEffect, useState } from 'react';
import { useHistory, useParams } from 'react-router-dom';
import { IonPage, IonContent, IonButton, IonSpinner, IonAlert } from '@ionic/react';
import { Helmet } from 'react-helmet';
import CommonHeader from '../common/CommonHeader';
import { useAuth } from '../common/AuthContextType';
import {
  BoardPostDetail,
  addComment,
  deleteComment,
  deletePost,
  fetchPost,
  formatBoardDate,
} from '../common/boardApi';
import './Board.css';

const MAX_COMMENT_LENGTH = 1000;

const BoardDetail: React.FC = () => {
  const history = useHistory();
  const { id } = useParams<{ id: string }>();
  const postId = Number(id);
  const { isLoggedIn } = useAuth();

  const [post, setPost] = useState<BoardPostDetail | null>(null);
  const [comment, setComment] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  // 삭제는 되돌릴 수 없으므로 한 번 더 묻는다. 값이 있으면 확인창이 열린다.
  const [pendingDelete, setPendingDelete] = useState<{ type: 'post' | 'comment'; id: number } | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      setPost(await fetchPost(postId));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '글을 가져오지 못했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleAddComment = async () => {
    const content = comment.trim();
    if (!content) {
      setMessage('댓글 내용을 입력해주세요.');
      return;
    }

    setIsSubmitting(true);
    try {
      await addComment(postId, content);
      setComment('');
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '댓글을 등록하지 못했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!pendingDelete) {
      return;
    }
    const target = pendingDelete;
    setPendingDelete(null);

    try {
      if (target.type === 'post') {
        await deletePost(target.id);
        history.replace('/board');
        return;
      }
      await deleteComment(target.id);
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '삭제하지 못했습니다.');
    }
  };

  if (isLoading) {
    return (
      <IonPage>
        <CommonHeader />
        <IonContent>
          <div className="board-container">
            <div className="board-card">
              <div className="board-empty"><IonSpinner name="crescent" /></div>
            </div>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  if (!post) {
    return (
      <IonPage>
        <CommonHeader />
        <IonContent>
          <div className="board-container">
            <div className="board-card">
              <div className="board-empty">글을 찾을 수 없습니다.</div>
              <div className="board-form-actions">
                <IonButton size="small" fill="outline" onClick={() => history.replace('/board')}>
                  목록으로
                </IonButton>
              </div>
            </div>
          </div>
        </IonContent>
        <IonAlert
          isOpen={!!message}
          onDidDismiss={() => setMessage('')}
          header="알림"
          message={message}
          buttons={['확인']}
        />
      </IonPage>
    );
  }

  return (
    <IonPage>
      <Helmet>
        <title>{post.title} | 자유게시판</title>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Helmet>
      <CommonHeader />
      <IonContent>
        <div className="board-container">
          <div className="board-card">
            <h2 className="board-detail-title">{post.title}</h2>
            <div className="board-detail-meta">
              <span>{post.authorName ?? '알 수 없음'}</span>
              <span>{formatBoardDate(post.insertDts)}</span>
              <span>조회 {post.viewCount}</span>
              <span>댓글 {post.commentCount}</span>
            </div>

            <div className="board-detail-content">{post.content}</div>

            <div className="board-detail-actions">
              <IonButton size="small" fill="clear" onClick={() => history.push('/board')}>목록</IonButton>
              {post.mine && (
                <>
                  <IonButton size="small" fill="outline" onClick={() => history.push(`/board/${post.id}/edit`)}>
                    수정
                  </IonButton>
                  <IonButton
                    size="small"
                    fill="outline"
                    color="danger"
                    onClick={() => setPendingDelete({ type: 'post', id: post.id })}
                  >
                    삭제
                  </IonButton>
                </>
              )}
            </div>

            <div className="board-comments">
              <h3>댓글 {post.comments.length}</h3>
              {post.comments.length === 0 ? (
                <div className="board-empty">첫 댓글을 남겨보세요.</div>
              ) : (
                post.comments.map((item) => (
                  <div key={item.id} className="board-comment">
                    <div className="board-comment-body">
                      <div className="board-comment-meta">
                        <span className="board-comment-author">{item.authorName ?? '알 수 없음'}</span>
                        <span>{formatBoardDate(item.insertDts)}</span>
                      </div>
                      <div className="board-comment-text">{item.content}</div>
                    </div>
                    {item.mine && (
                      <IonButton
                        size="small"
                        fill="clear"
                        color="danger"
                        onClick={() => setPendingDelete({ type: 'comment', id: item.id })}
                      >
                        삭제
                      </IonButton>
                    )}
                  </div>
                ))
              )}

              {isLoggedIn ? (
                <div className="board-comment-form">
                  <div className="board-field">
                    <textarea
                      value={comment}
                      maxLength={MAX_COMMENT_LENGTH}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="댓글을 입력하세요"
                      rows={3}
                    />
                    <div className="board-field-count">{comment.length} / {MAX_COMMENT_LENGTH}</div>
                  </div>
                  <div className="board-form-actions">
                    <IonButton size="small" onClick={handleAddComment} disabled={isSubmitting}>
                      {isSubmitting ? '등록 중...' : '댓글 등록'}
                    </IonButton>
                  </div>
                </div>
              ) : (
                <div className="board-login-hint">로그인 후 댓글을 작성할 수 있습니다.</div>
              )}
            </div>
          </div>
        </div>

        <IonAlert
          isOpen={!!pendingDelete}
          onDidDismiss={() => setPendingDelete(null)}
          header="삭제할까요?"
          message={pendingDelete?.type === 'post' ? '글과 댓글이 함께 삭제됩니다.' : '댓글을 삭제합니다.'}
          buttons={[
            { text: '취소', role: 'cancel' },
            { text: '삭제', role: 'destructive', handler: handleConfirmDelete },
          ]}
        />
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

export default BoardDetail;
