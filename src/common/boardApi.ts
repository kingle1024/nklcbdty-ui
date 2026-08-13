// 게시판 API 호출. 백엔드 BoardController(/api/boards/{boardType}/**) 와 짝을 이룬다.
// boardType 은 notice(공지사항) 또는 free(자유게시판).
//
// 작성 주체가 셋이다.
//  - 로그인 사용자: 토큰만 보낸다. 서버가 mine=true 로 돌려주므로 비밀번호 없이 수정/삭제한다.
//  - 익명:         닉네임 + 비밀번호로 쓰고, 수정/삭제할 때 그 비밀번호를 다시 보낸다.
//  - 관리자:       공지 작성은 /api/admin/boards/** 라 이 파일에서는 다루지 않는다.
// 목록/상세는 비로그인도 볼 수 있다. 상세도 토큰을 함께 보내야 서버가 mine 을 채워준다.
import axios from 'axios';
import API_URL from '../config';

export type BoardType = 'notice' | 'free';

export interface BoardPostSummary {
  id: number;
  boardType: string;
  title: string;
  authorName: string | null;
  viewCount: number;
  commentCount: number;
  /** 상단 고정글(공지) */
  pinned: boolean;
  /** 관리자가 쓴 글 — 목록에 뱃지로 표시 */
  writtenByAdmin: boolean;
  insertDts: string | null;
  updateDts: string | null;
}

export interface BoardPostPage {
  rows: BoardPostSummary[];
  totalElements: number;
  totalPages: number;
  pageNumber: number;
  pageSize: number;
}

export interface BoardComment {
  id: number;
  postId: number;
  content: string;
  authorName: string | null;
  writtenByAdmin: boolean;
  /** 익명 댓글 — 수정/삭제에 비밀번호가 필요하다 */
  passwordProtected: boolean;
  /** 내가 쓴 댓글인지 — 비밀번호 없이 수정/삭제할 수 있다 */
  mine: boolean;
  insertDts: string | null;
  updateDts: string | null;
}

export interface BoardPostDetail {
  id: number;
  boardType: string;
  title: string;
  content: string;
  authorName: string | null;
  viewCount: number;
  pinned: boolean;
  writtenByAdmin: boolean;
  /** 익명 글 — 수정/삭제에 비밀번호가 필요하다 */
  passwordProtected: boolean;
  /** 내가 쓴 글인지 — 비밀번호 없이 수정/삭제할 수 있다 */
  mine: boolean;
  insertDts: string | null;
  updateDts: string | null;
  comments: BoardComment[];
}

/** 글/댓글을 쓸 때 넘기는 작성자 정보. 로그인 상태면 둘 다 비워 보낸다. */
export interface BoardAuthorInput {
  authorName?: string;
  password?: string;
}

const authHeaders = (): Record<string, string> => {
  const token = localStorage.getItem('jwtToken');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const isLoggedIn = (): boolean => !!localStorage.getItem('jwtToken');

/** 서버가 돌려준 사용자용 메세지를 꺼낸다. 없으면 기본 문구. */
const messageOf = (error: unknown, fallback: string): string => {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { message?: string } | undefined;
    if (data?.message) {
      return data.message;
    }
    if (!error.response) {
      return '서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.';
    }
  }
  return fallback;
};

const postsUrl = (boardType: BoardType) => `${API_URL}/api/boards/${boardType}/posts`;

export const fetchPosts = async (
  boardType: BoardType,
  page: number,
  size: number,
  keyword: string
): Promise<BoardPostPage> => {
  try {
    const res = await axios.get<BoardPostPage>(postsUrl(boardType), {
      params: keyword ? { page, size, keyword } : { page, size },
    });
    return res.data;
  } catch (error) {
    throw new Error(messageOf(error, '글 목록을 가져오지 못했습니다.'));
  }
};

export const fetchPost = async (boardType: BoardType, id: number): Promise<BoardPostDetail> => {
  try {
    const res = await axios.get<BoardPostDetail>(`${postsUrl(boardType)}/${id}`, {
      headers: authHeaders(),
    });
    return res.data;
  } catch (error) {
    throw new Error(messageOf(error, '글을 가져오지 못했습니다.'));
  }
};

/** 작성 성공 시 만들어진 글의 id. 서버가 상세 DTO 를 그대로 돌려준다. */
export const createPost = async (
  boardType: BoardType,
  title: string,
  content: string,
  author: BoardAuthorInput
): Promise<number> => {
  try {
    const res = await axios.post<BoardPostDetail>(
      postsUrl(boardType),
      { title, content, ...author },
      { headers: authHeaders() }
    );
    return res.data.id;
  } catch (error) {
    throw new Error(messageOf(error, '글을 등록하지 못했습니다.'));
  }
};

export const updatePost = async (
  boardType: BoardType,
  id: number,
  title: string,
  content: string,
  password?: string
): Promise<void> => {
  try {
    await axios.put(
      `${postsUrl(boardType)}/${id}`,
      { title, content, password },
      { headers: authHeaders() }
    );
  } catch (error) {
    throw new Error(messageOf(error, '글을 수정하지 못했습니다.'));
  }
};

// DELETE 는 비밀번호를 본문으로 보낸다(서버가 @RequestBody 로 받는다).
// axios 의 delete 는 두 번째 인자가 config 라서 body 를 data 로 넣어야 한다.
export const deletePost = async (boardType: BoardType, id: number, password?: string): Promise<void> => {
  try {
    await axios.delete(`${postsUrl(boardType)}/${id}`, {
      headers: authHeaders(),
      data: { password },
    });
  } catch (error) {
    throw new Error(messageOf(error, '글을 삭제하지 못했습니다.'));
  }
};

export const addComment = async (
  boardType: BoardType,
  postId: number,
  content: string,
  author: BoardAuthorInput
): Promise<void> => {
  try {
    await axios.post(
      `${postsUrl(boardType)}/${postId}/comments`,
      { content, ...author },
      { headers: authHeaders() }
    );
  } catch (error) {
    throw new Error(messageOf(error, '댓글을 등록하지 못했습니다.'));
  }
};

export const deleteComment = async (commentId: number, password?: string): Promise<void> => {
  try {
    await axios.delete(`${API_URL}/api/boards/comments/${commentId}`, {
      headers: authHeaders(),
      data: { password },
    });
  } catch (error) {
    throw new Error(messageOf(error, '댓글을 삭제하지 못했습니다.'));
  }
};

/** 목록/상세에 쓰는 날짜 표기. 오늘 쓴 글은 시:분, 그 외는 연.월.일 */
export const formatBoardDate = (value: string | null): string => {
  if (!value) {
    return '-';
  }
  const date = new Date(value);
  if (isNaN(date.getTime())) {
    return value;
  }
  const pad = (n: number) => String(n).padStart(2, '0');
  const today = new Date();
  const isToday =
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate();
  if (isToday) {
    return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }
  return `${date.getFullYear()}.${pad(date.getMonth() + 1)}.${pad(date.getDate())}`;
};

/** 화면 제목·안내문에 쓰는 게시판 이름 */
export const boardLabel = (boardType: BoardType): string =>
  boardType === 'notice' ? '공지사항' : '자유게시판';

/** 경로 문자열을 BoardType 으로. 알 수 없으면 자유게시판으로 본다. */
export const toBoardType = (value?: string): BoardType => (value === 'notice' ? 'notice' : 'free');
