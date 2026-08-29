import { cache, env } from '../utils/runtime.js';

const RATE_LIMIT_CODE = 30001;
const RETRY_DELAYS = [1500, 3000];
const HOT_LIST_TTL = 1800;

function apiBase() {
  return env('ZHIHU_API_BASE') || 'https://developer.zhihu.com';
}

function getHeaders() {
  return {
    Authorization: `Bearer ${env('ZHIHU_ACCESS_SECRET') || ''}`,
    'X-Request-Timestamp': String(Math.floor(Date.now() / 1000)),
    'Content-Type': 'application/json',
  };
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchOnce(path: string): Promise<any> {
  const url = path.startsWith('http') ? path : `${apiBase()}${path}`;
  const resp = await fetch(url, { headers: getHeaders() } as any);
  if (!resp.ok) {
    const errText = await resp.text().catch(() => '');
    throw Object.assign(new Error(`知乎API错误 ${resp.status}: ${path}`), { statusCode: resp.status, body: errText });
  }
  const data = await resp.json() as any;

  if (data && typeof data.Code === 'number' && data.Code !== 0) {
    const err = Object.assign(
      new Error(`知乎API业务错误 Code=${data.Code}: ${data.Message || '未知'}`),
      { apiCode: data.Code, isRateLimit: data.Code === RATE_LIMIT_CODE },
    );
    throw err;
  }
  return data;
}

async function request<T = any>(path: string, ttl = 600): Promise<T> {
  const cacheKey = `zhihu:${path}`;
  const cached = cache.get(cacheKey) as T | undefined;
  if (cached !== undefined) return cached;

  let lastErr: any;
  for (let attempt = 0; attempt <= RETRY_DELAYS.length; attempt++) {
    try {
      const data = await fetchOnce(path) as T;
      cache.set(cacheKey, data, ttl);
      return data;
    } catch (err: any) {
      lastErr = err;
      // 限流不会在几秒内恢复，重试只会浪费当日配额，只重试服务端错误
      const retryable = err?.statusCode >= 500 && err?.statusCode < 600;
      if (!retryable || attempt === RETRY_DELAYS.length) break;
      console.warn(`[ZhihuAPI] ${err.message}，${RETRY_DELAYS[attempt] / 1000}s后重试 (${attempt + 1}/${RETRY_DELAYS.length})`);
      await sleep(RETRY_DELAYS[attempt]);
    }
  }

  console.error(`[ZhihuAPI] 最终失败 ${path}: ${lastErr?.message}`);
  throw lastErr;
}

export async function searchContent(query: string) {
  const count = 10;
  const path = `/api/v1/content/zhihu_search?Query=${encodeURIComponent(query)}&Count=${count}`;
  return request(path);
}

export async function globalSearch(query: string) {
  const count = 10;
  const path = `/api/v1/content/global_search?Query=${encodeURIComponent(query)}&Count=${count}`;
  return request(path);
}

export async function getHotList() {
  return request(`/api/v1/content/hot_list?Limit=30`, HOT_LIST_TTL);
}

export async function getStories(category: string) {
  return request(`/api/v1/story/${category}`);
}

export async function getFollowingFeed() {
  return request(`/openapi/feed/following`);
}

export async function getUserFollowing() {
  return request(`/openapi/user/following`);
}

export const zhihuApi = { searchContent, globalSearch, getHotList, getStories, getFollowingFeed, getUserFollowing };
export default zhihuApi;
