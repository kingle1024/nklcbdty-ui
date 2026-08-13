import React, { useCallback, useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { IonPage, IonContent, IonButton, IonSpinner, IonAlert } from '@ionic/react';
import { Helmet } from 'react-helmet';
import CommonHeader from '../common/CommonHeader';
import {
  BoardPostPage,
  BoardType,
  boardLabel,
  fetchPosts,
  formatBoardDate,
} from '../common/boardApi';
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

/** 게시판별 화면 문구와 URL 앞부분 */
const boardMeta = (boardType: BoardType) =>
  boardType === 'notice'
    ? {
        basePath: '/notice',
        subtitle: '서비스 변경사항과 공지를 알려드립니다.',
        description: '네카라쿠배당토야 공지사항',
        emptyText: '등록된 공지가 없습니다.',
      }
    : {
        basePath: '/board',
        subtitle: '취업·이직 준비 이야기를 자유롭게 나눠보세요.',
        description: '취업/이직 이야기를 자유롭게 나누는 게시판',
        emptyText: '첫 글을 남겨보세요.',
      };

interface BoardProps {
  boardType?: BoardType;
}

const Board: React.FC<BoardProps> = ({ boardType = 'free' }) => {
  const history = useHistory();
  const label = boardLabel(boardType);
  const meta = boardMeta(boardType);

  const [result, setResult] = useState<BoardPostPage | null>(null);
  const [page, setPage] = useState(0);
  // 입력 중인 검색어와 실제 조회에 쓰는 검색어를 분리해 타이핑마다 조회하지 않는다
  const [keywordInput, setKeywordInput] = useState('');
  const [keyword, setKeyword] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  // 게시판을 바꿔서 들어오면 이전 게시판의 페이지/검색어가 남지 않도록 되돌린다
  useEffect(() => {
    setPage(0);
    setKeyword('');
    setKeywordInput('');
  }, [boardType]);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      setResult(await fetchPosts(boardType, page, PAGE_SIZE, keyword));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '글 목록을 가져오지 못했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, [boardType, page, keyword]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSearch = () => {
    setPage(0);
    setKeyword(keywordInput.trim());
  };

  const posts = result?.rows ?? [];
  const totalPages = result?.totalPages ?? 0;
  // 공지사항 작성은 관리자 API(/api/admin/boards/**) 라 사용자 화면에서는 읽기만 한다
  const canWrite = boardType === 'free';

  return (
    <IonPage>
      <Helmet>
        <title>{label}</title>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="description" content={meta.description} />
      </Helmet>
      <CommonHeader />
      <IonContent>
        <div className="board-container">
          <div className="board-card">
            <div className="board-head">
              <h2>{label}</h2>
              {canWrite && (
                <IonButton size="small" onClick={() => history.push(`${meta.basePath}/write`)}>
                  글쓰기
                </IonButton>
              )}
            </div>
            <p className="board-subtitle">{meta.subtitle}</p>

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
                {keyword ? `'${keyword}' 검색 결과가 없습니다.` : meta.emptyText}
              </div>
            ) : (
              <div className="board-list">
                {posts.map((post) => (
                  <div
                    key={post.id}
                    className={`board-row${post.pinned ? ' pinned' : ''}`}
                    onClick={() => history.push(`${meta.basePath}/${post.id}`)}
                  >
                    <div className="board-row-title">
                      {post.pinned && <span className="board-pin-badge">공지</span>}
                      {post.title}
                      {post.commentCount > 0 && (
                        <span className="board-comment-badge">[{post.commentCount}]</span>
                      )}
                    </div>
                    <div className="board-row-meta">
                      <span className="board-row-author">
                        {post.authorName ?? '알 수 없음'}
                        {post.writtenByAdmin && <span className="board-admin-badge">운영자</span>}
                      </span>
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
