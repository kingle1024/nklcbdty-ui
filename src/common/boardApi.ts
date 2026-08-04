// 자유게시판 API 호출. 백엔드 BoardController(/api/board/**) 와 짝을 이룬다.
// 목록/상세는 비로그인도 볼 수 있고, 작성/수정/삭제는 토큰이 있어야 한다.
// (상세도 토큰을 함께 보낸다 — 서버가 mine 값을 채워줘야 수정/삭제 버튼을 띄울 수 있다)
import axios from 'axios';
import API_URL from '../config';

export interface BoardPostSummary {
  id: number;
  title: string;
  authorName: string | null;
  viewCount: number;
  commentCount: number;
  insertDts: string | null;
}

export interface BoardPostPage {
  items: BoardPostSummary[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface BoardComment {
  id: number;
  content: string;
  authorName: string | null;
  insertDts: string | null;
  /** 내가 쓴 댓글인지 — 삭제 버튼 표시용 */
  mine: boolean;
}

export interface BoardPostDetail {
  id: number;
  title: string;
  content: string;
  authorName: string | null;
  viewCount: number;
  commentCount: number;
  insertDts: string | null;
  updateDts: string | null;
  /** 내가 쓴 글인지 — 수정/삭제 버튼 표시용 */
  mine: boolean;
  comments: BoardComment[];
}

const authHeaders = (): Record<string, string> => {
  const token = localStorage.getItem('jwtToken');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

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

export const fetchPosts = async (page: number, size: number, keyword: string): Promise<BoardPostPage> => {
  try {
    const res = await axios.get<BoardPostPage>(`${API_URL}/api/board/posts`, {
      params: keyword ? { page, size, keyword } : { page, size },
    });
    return res.data;
  } catch (error) {
    throw new Error(messageOf(error, '글 목록을 가져오지 못했습니다.'));
  }
};

export const fetchPost = async (id: number): Promise<BoardPostDetail> => {
  try {
    const res = await axios.get<BoardPostDetail>(`${API_URL}/api/board/posts/${id}`, {
      headers: authHeaders(),
    });
    return res.data;
  } catch (error) {
    throw new Error(messageOf(error, '글을 가져오지 못했습니다.'));
  }
};

export const createPost = async (title: string, content: string): Promise<number> => {
  try {
    const res = await axios.post<{ id: number }>(
      `${API_URL}/api/board/posts`,
      { title, content },
      { headers: authHeaders() }
    );
    return res.data.id;
  } catch (error) {
    throw new Error(messageOf(error, '글을 등록하지 못했습니다.'));
  }
};

export const updatePost = async (id: number, title: string, content: string): Promise<void> => {
  try {
    await axios.put(`${API_URL}/api/board/posts/${id}`, { title, content }, { headers: authHeaders() });
  } catch (error) {
    throw new Error(messageOf(error, '글을 수정하지 못했습니다.'));
  }
};

export const deletePost = async (id: number): Promise<void> => {
  try {
    await axios.delete(`${API_URL}/api/board/posts/${id}`, { headers: authHeaders() });
  } catch (error) {
    throw new Error(messageOf(error, '글을 삭제하지 못했습니다.'));
  }
};

export const addComment = async (postId: number, content: string): Promise<void> => {
  try {
    await axios.post(`${API_URL}/api/board/posts/${postId}/comments`, { content }, { headers: authHeaders() });
  } catch (error) {
    throw new Error(messageOf(error, '댓글을 등록하지 못했습니다.'));
  }
};

export const deleteComment = async (commentId: number): Promise<void> => {
  try {
    await axios.delete(`${API_URL}/api/board/comments/${commentId}`, { headers: authHeaders() });
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
