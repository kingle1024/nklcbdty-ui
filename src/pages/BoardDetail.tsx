import React, { useCallback, useEffect, useState } from 'react';
import { useHistory, useParams } from 'react-router-dom';
import { IonPage, IonContent, IonButton, IonSpinner, IonAlert } from '@ionic/react';
import { Helmet } from 'react-helmet';
import CommonHeader from '../common/CommonHeader';
import { useAuth } from '../common/AuthContextType';
import {
  BoardPostDetail,
  BoardType,
  addComment,
  boardLabel,
  deleteComment,
  deletePost,
  fetchPost,
  formatBoardDate,
} from '../common/boardApi';
import './Board.css';

const MAX_COMMENT_LENGTH = 1000;
const MAX_AUTHOR_NAME_LENGTH = 20;

/** 삭제 대상. needsPassword 면 비밀번호를 입력받아 함께 보낸다(익명 글/댓글). */
interface PendingDelete {
  type: 'post' | 'comment';
  id: number;
  needsPassword: boolean;
}

interface BoardDetailProps {
  boardType?: BoardType;
}

const BoardDetail: React.FC<BoardDetailProps> = ({ boardType = 'free' }) => {
  const history = useHistory();
  const { id } = useParams<{ id: string }>();
  const postId = Number(id);
  const { isLoggedIn } = useAuth();
  const label = boardLabel(boardType);
  const basePath = boardType === 'notice' ? '/notice' : '/board';

  const [post, setPost] = useState<BoardPostDetail | null>(null);
  const [comment, setComment] = useState('');
  // 익명 댓글용. 로그인 상태면 서버가 닉네임을 쓰므로 보내지 않는다.
  const [guestName, setGuestName] = useState('');
  const [guestPassword, setGuestPassword] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  // 삭제는 되돌릴 수 없으므로 한 번 더 묻는다. 값이 있으면 확인창이 열린다.
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      setPost(await fetchPost(boardType, postId));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '글을 가져오지 못했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, [boardType, postId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleAddComment = async () => {
    const content = comment.trim();
    if (!content) {
      setMessage('댓글 내용을 입력해주세요.');
      return;
    }
    // 익명 댓글은 나중에 수정/삭제할 때 쓸 닉네임과 비밀번호가 필요하다
    if (!isLoggedIn && (!guestName.trim() || !guestPassword)) {
      setMessage('닉네임과 비밀번호를 입력해주세요.');
      return;
    }

    setIsSubmitting(true);
    try {
      await addComment(
        boardType,
        postId,
        content,
        isLoggedIn ? {} : { authorName: guestName.trim(), password: guestPassword }
      );
      setComment('');
      setGuestPassword('');
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '댓글을 등록하지 못했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async (password?: string) => {
    if (!pendingDelete) {
      return;
    }
    const target = pendingDelete;
    setPendingDelete(null);

    if (target.needsPassword && !password) {
      setMessage('비밀번호를 입력해주세요.');
      return;
    }

    try {
      if (target.type === 'post') {
        await deletePost(boardType, target.id, password);
        history.replace(basePath);
        return;
      }
      await deleteComment(target.id, password);
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
                <IonButton size="small" fill="outline" onClick={() => history.replace(basePath)}>
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

  // 내가 쓴 글은 바로, 익명 글은 비밀번호로 수정/삭제한다.
  // 관리자가 쓴 글(writtenByAdmin)은 둘 다 아니라 버튼이 나오지 않는다.
  const canEditPost = post.mine || post.passwordProtected;
  // 응답에 comments 가 없어도(예: 작성 직후 응답) 화면이 죽지 않게 한다
  const comments = post.comments ?? [];

  return (
    <IonPage>
      <Helmet>
        <title>{post.title} | {label}</title>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Helmet>
      <CommonHeader />
      <IonContent>
        <div className="board-container">
          <div className="board-card">
            <h2 className="board-detail-title">
              {post.pinned && <span className="board-pin-badge">공지</span>}
              {post.title}
            </h2>
            <div className="board-detail-meta">
              <span>
                {post.authorName ?? '알 수 없음'}
                {post.writtenByAdmin && <span className="board-admin-badge">운영자</span>}
              </span>
              <span>{formatBoardDate(post.insertDts)}</span>
              <span>조회 {post.viewCount}</span>
              <span>댓글 {comments.length}</span>
            </div>

            <div className="board-detail-content">{post.content}</div>

            <div className="board-detail-actions">
              <IonButton size="small" fill="clear" onClick={() => history.push(basePath)}>목록</IonButton>
              {canEditPost && (
                <>
                  <IonButton
                    size="small"
                    fill="outline"
                    onClick={() => history.push(`${basePath}/${post.id}/edit`)}
                  >
                    수정
                  </IonButton>
                  <IonButton
                    size="small"
                    fill="outline"
                    color="danger"
                    onClick={() => setPendingDelete({
                      type: 'post',
                      id: post.id,
                      needsPassword: !post.mine && post.passwordProtected,
                    })}
                  >
                    삭제
                  </IonButton>
                </>
              )}
            </div>

            <div className="board-comments">
              <h3>댓글 {comments.length}</h3>
              {comments.length === 0 ? (
                <div className="board-empty">첫 댓글을 남겨보세요.</div>
              ) : (
                comments.map((item) => (
                  <div key={item.id} className="board-comment">
                    <div className="board-comment-body">
                      <div className="board-comment-meta">
                        <span className="board-comment-author">
                          {item.authorName ?? '알 수 없음'}
                          {item.writtenByAdmin && <span className="board-admin-badge">운영자</span>}
                        </span>
                        <span>{formatBoardDate(item.insertDts)}</span>
                      </div>
                      <div className="board-comment-text">{item.content}</div>
                    </div>
                    {(item.mine || item.passwordProtected) && (
                      <IonButton
                        size="small"
                        fill="clear"
                        color="danger"
                        onClick={() => setPendingDelete({
                          type: 'comment',
                          id: item.id,
                          needsPassword: !item.mine && item.passwordProtected,
                        })}
                      >
                        삭제
                      </IonButton>
                    )}
                  </div>
                ))
              )}

              <div className="board-comment-form">
                {!isLoggedIn && (
                  <div className="board-guest-fields">
                    <input
                      value={guestName}
                      maxLength={MAX_AUTHOR_NAME_LENGTH}
                      onChange={(e) => setGuestName(e.target.value)}
                      placeholder="닉네임"
                    />
                    <input
                      type="password"
                      value={guestPassword}
                      onChange={(e) => setGuestPassword(e.target.value)}
                      placeholder="비밀번호 (수정·삭제할 때 필요)"
                    />
                  </div>
                )}
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
            </div>
          </div>
        </div>

        {/* 익명 글/댓글 삭제는 비밀번호를 함께 받는다 */}
        <IonAlert
          isOpen={!!pendingDelete?.needsPassword}
          onDidDismiss={() => setPendingDelete(null)}
          header="비밀번호 확인"
          message={pendingDelete?.type === 'post' ? '글과 댓글이 함께 삭제됩니다.' : '댓글을 삭제합니다.'}
          inputs={[{ name: 'password', type: 'password', placeholder: '작성할 때 쓴 비밀번호' }]}
          buttons={[
            { text: '취소', role: 'cancel' },
            {
              text: '삭제',
              role: 'destructive',
              handler: (data: { password?: string }) => {
                handleConfirmDelete(data?.password);
              },
            },
          ]}
        />
        <IonAlert
          isOpen={!!pendingDelete && !pendingDelete.needsPassword}
          onDidDismiss={() => setPendingDelete(null)}
          header="삭제할까요?"
          message={pendingDelete?.type === 'post' ? '글과 댓글이 함께 삭제됩니다.' : '댓글을 삭제합니다.'}
          buttons={[
            { text: '취소', role: 'cancel' },
            { text: '삭제', role: 'destructive', handler: () => handleConfirmDelete() },
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
