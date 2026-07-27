import axios from 'axios';

/**
 * dodrambio KV 캐시 (https://dodrambio.com/api/kv)
 *
 * cloudtype 서버는 잠들어 있다가 깨어나는 데 시간이 걸리므로,
 * 자주 바뀌지 않는 공개 데이터(공고 목록, 카테고리)는 dodrambio 를
 * Redis 처럼 써서 응답을 얹어두고 재사용한다.
 *
 * - 캐시 미스(404)나 KV 서버 장애 시에는 원본 API 로 그대로 폴백한다.
 * - 로컬 개발에서는 캐시를 타지 않는다 (운영 캐시 오염 방지).
 * - 사용자별/상태변화 데이터(상세의 좋아요·댓글, 삭제요청 목록 등)는 절대 캐싱하지 말 것.
 */
const KV_BASE = 'https://dodrambio.com/api/kv';

/** 채용공고는 자주 바뀌지 않으므로 6시간 캐싱 */
const TTL_SECONDS = 6 * 60 * 60;

const isProduction = process.env.NODE_ENV === 'production';

export async function cachedGet<T>(key: string, originUrl: string, params?: Record<string, string>): Promise<T> {
  const kvUrl = `${KV_BASE}/${key}`;

  if (isProduction) {
    try {
      const hit = await axios.get<T>(kvUrl);
      return hit.data;
    } catch {
      // 404(미스)든 KV 장애든 원본으로 폴백
    }
  }

  const response = await axios.get<T>(originUrl, { params });

  if (isProduction) {
    // 저장은 베스트에포트 — 실패해도 사용자 흐름에 영향 없음
    axios
      .put(`${kvUrl}?ttl=${TTL_SECONDS}`, JSON.stringify(response.data), {
        headers: { 'Content-Type': 'application/json' },
      })
      .catch(() => {});
  }

  return response.data;
}
