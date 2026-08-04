import React, { useCallback, useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { IonPage, IonContent, IonButton, IonSpinner, IonAlert } from '@ionic/react';
import { Helmet } from 'react-helmet';
import CommonHeader from '../common/CommonHeader';
import { useAuth } from '../common/AuthContextType';
import { BoardPostPage, fetchPosts, formatBoardDate } from '../common/boardApi';
import './Board.css';

const PAGE_SIZE = 20;

/** 페이징 버튼에 보여줄 페이지 번호 목록(현재 페이지 기준 최대 5개) */
const pageNumbers = (current: number, totalPages: number): number[] => {
  const start = Math.max(0, Math.min(current - 2, totalPages - 5));
  const end = Math.min(totalPages, start + 5);
  const numbers: number[] = [];
  for (let i = start; i < end; i += 1) {
    numbers.push(i);
  }
  return numbers;
};

const Board: React.FC = () => {
  const history = useHistory();
  const { isLoggedIn } = useAuth();

  const [result, setResult] = useState<BoardPostPage | null>(null);
  const [page, setPage] = useState(0);
  // 입력 중인 검색어와 실제 조회에 쓰는 검색어를 분리해 타이핑마다 조회하지 않는다
  const [keywordInput, setKeywordInput] = useState('');
  const [keyword, setKeyword] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      setResult(await fetchPosts(page, PAGE_SIZE, keyword));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '글 목록을 가져오지 못했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, [page, keyword]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSearch = () => {
    setPage(0);
    setKeyword(keywordInput.trim());
  };

  // 비로그인 사용자는 글을 쓸 수 없으므로 로그인 화면으로 안내한다
  const handleWriteClick = () => {
    if (!isLoggedIn) {
      setErrorMessage('로그인 후 글을 작성할 수 있습니다.');
      return;
    }
    history.push('/board/write');
  };

  const posts = result?.items ?? [];
  const totalPages = result?.totalPages ?? 0;

  return (
    <IonPage>
      <Helmet>
        <title>자유게시판</title>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="description" content="취업/이직 이야기를 자유롭게 나누는 게시판" />
      </Helmet>
      <CommonHeader />
      <IonContent>
        <div className="board-container">
          <div className="board-card">
            <div className="board-head">
              <h2>자유게시판</h2>
              <IonButton size="small" onClick={handleWriteClick}>글쓰기</IonButton>
            </div>
            <p className="board-subtitle">취업·이직 준비 이야기를 자유롭게 나눠보세요.</p>

            <div className="board-search">
              <input
                value={keywordInput}
                onChange={(e) => setKeywordInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSearch();
                  }
                }}
                placeholder="제목 또는 내용 검색"
              />
              <IonButton size="small" fill="outline" onClick={handleSearch}>검색</IonButton>
            </div>

            {isLoading ? (
              <div className="board-empty"><IonSpinner name="crescent" /></div>
            ) : posts.length === 0 ? (
              <div className="board-empty">
                {keyword ? `'${keyword}' 검색 결과가 없습니다.` : '첫 글을 남겨보세요.'}
              </div>
            ) : (
              <div className="board-list">
                {posts.map((post) => (
                  <div
                    key={post.id}
                    className="board-row"
                    onClick={() => history.push(`/board/${post.id}`)}
                  >
                    <div className="board-row-title">
                      {post.title}
                      {post.commentCount > 0 && (
                        <span className="board-comment-badge">[{post.commentCount}]</span>
                      )}
                    </div>
                    <div className="board-row-meta">
                      <span className="board-row-author">{post.authorName ?? '알 수 없음'}</span>
                      <span>{formatBoardDate(post.insertDts)}</span>
                      <span className="board-row-views">조회 {post.viewCount}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {totalPages > 1 && (
              <div className="board-pagination">
                <button
                  className="board-page-btn"
                  disabled={page === 0}
                  onClick={() => setPage(page - 1)}
                >
                  이전
                </button>
                {pageNumbers(page, totalPages).map((number) => (
                  <button
                    key={number}
                    className={`board-page-btn${number === page ? ' current' : ''}`}
                    onClick={() => setPage(number)}
                  >
                    {number + 1}
                  </button>
                ))}
                <button
                  className="board-page-btn"
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage(page + 1)}
                >
                  다음
                </button>
              </div>
            )}
          </div>
        </div>

        <IonAlert
          isOpen={!!errorMessage}
          onDidDismiss={() => setErrorMessage('')}
          header="알림"
          message={errorMessage}
          buttons={['확인']}
        />
      </IonContent>
    </IonPage>
  );
};

export default Board;
