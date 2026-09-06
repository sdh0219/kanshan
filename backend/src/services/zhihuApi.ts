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

/* ---------------- 黑客松专用内容接口（官方 skill 0.5.3，无需鉴权） ---------------- */

const HACKATHON_CONTENT_BASE = 'https://api.zhihu.com/km-indep-home/hackathon/v2';
const HACKATHON_CONTENT_TTL = 1800;

async function hackathonFetch(path: string): Promise<any> {
  const resp = await fetch(`${HACKATHON_CONTENT_BASE}${path}`, {
    headers: { Accept: 'application/json' },
  } as any);
  if (!resp.ok) {
    throw new Error(`黑客松内容接口错误 ${resp.status}: ${path}`);
  }
  return resp.json();
}

/** 盐言故事列表（比赛专用接口，无需鉴权） */
export async function getHackathonStories() {
  const cacheKey = 'hackathon:story:list';
  const cached = cache.get(cacheKey);
  if (cached !== undefined) return cached;
  const data = await hackathonFetch('/story/list');
  cache.set(cacheKey, data, HACKATHON_CONTENT_TTL);
  return data;
}

/** 盐言故事详情（含正文） */
export async function getHackathonStoryDetail(workId: string) {
  // 官方要求：拒绝包含路径/查询/换行等危险字符的 work_id
  if (!workId || /[/\\?#\\r\\n]/.test(workId)) throw new Error('非法 work_id');
  const cacheKey = `hackathon:story:${workId}`;
  const cached = cache.get(cacheKey);
  if (cached !== undefined) return cached;
  const data = await hackathonFetch(`/story/${encodeURIComponent(workId)}`);
  cache.set(cacheKey, data, HACKATHON_CONTENT_TTL);
  return data;
}

/** 知识内容列表（比赛专用接口，无需鉴权） */
export async function getHackathonKnowledge() {
  const cacheKey = 'hackathon:knowledge:list';
  const cached = cache.get(cacheKey);
  if (cached !== undefined) return cached;
  const data = await hackathonFetch('/knowledge/list');
  cache.set(cacheKey, data, HACKATHON_CONTENT_TTL);
  return data;
}

/** 知识内容详情（含正文） */
export async function getHackathonKnowledgeDetail(workId: string) {
  if (!workId || /[/\\?#\\r\\n]/.test(workId)) throw new Error('非法 work_id');
  const cacheKey = `hackathon:knowledge:${workId}`;
  const cached = cache.get(cacheKey);
  if (cached !== undefined) return cached;
  const data = await hackathonFetch(`/knowledge/${encodeURIComponent(workId)}`);
  cache.set(cacheKey, data, HACKATHON_CONTENT_TTL);
  return data;
}

/** 查询开放 API 当日剩余额度（不消耗业务额度） */
export async function getQuota() {
  const path = `/api/v1/quota`;
  return request(path, 120);
}

export const zhihuApi = {
  searchContent,
  globalSearch,
  getHotList,
  getStories,
  getFollowingFeed,
  getUserFollowing,
  getHackathonStories,
  getHackathonStoryDetail,
  getHackathonKnowledge,
  getHackathonKnowledgeDetail,
  getQuota,
};
export default zhihuApi;
