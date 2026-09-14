// 知乎 OAuth 登录（黑客松项目专用流程）
// 凭证来源：活动页创建项目后分配的 app_id / app_key；app_key 只能存 Worker Secret（ZHIHU_OAUTH_APP_KEY）
// 官方流程：authorize 跳转 → 回调收 authorization_code → POST /access_token 换 token → 带 X-OAuth-Token 调用户数据
import { env, getKV } from '../utils/runtime.js';
import type { PassiveProfile } from './fingerprintService.js';

const OPENAPI = 'https://openapi.zhihu.com';
const API_BASE = 'https://developer.zhihu.com';
const SESSION_TTL = 60 * 60 * 24 * 7; // 会话 7 天
const STATE_TTL = 600; // 防 CSRF 的 state 有效期 10 分钟
const COOKIE_NAME = 'ks_session';

function redirectURI(): string {
  return env('OAUTH_REDIRECT_URI') || 'https://kanshan-detective.3082780889.workers.dev/api/auth/callback';
}

/** 凭证是否已配置；未配置时所有 OAuth 路由安全降级（前端隐藏登录入口） */
export function isOAuthConfigured(): boolean {
  return !!env('ZHIHU_OAUTH_APP_ID') && !!env('ZHIHU_OAUTH_APP_KEY');
}

/** 生成带 state 的授权跳转地址，state 存 KV 供回调校验（防 CSRF） */
export async function buildAuthorizeURL(): Promise<string> {
  const state = crypto.randomUUID().replace(/-/g, '');
  const kv = getKV();
  if (kv) await kv.put(`kanshan:oauth_state:${state}`, '1', { expirationTtl: STATE_TTL });
  const params = new URLSearchParams({
    redirect_uri: redirectURI(),
    app_id: env('ZHIHU_OAUTH_APP_ID') || '',
    response_type: 'code',
    state,
  });
  return `${OPENAPI}/authorize?${params.toString()}`;
}

/** 回调时校验并消费 state（一次性） */
export async function consumeState(state: string): Promise<boolean> {
  const kv = getKV();
  if (!kv || !state) return false;
  const key = `kanshan:oauth_state:${state}`;
  const value = await kv.get(key);
  if (!value) return false;
  await kv.delete(key);
  return true;
}

export interface OAuthSession {
  accessToken: string;
  handle: string;
  loginAt: number;
}

/** 用授权码换取 token 并创建服务端会话；token 响应不带昵称，handle 为生成的展示代号 */
export async function exchangeAndCreateSession(code: string): Promise<OAuthSession & { sid: string }> {
  const body = new URLSearchParams({
    app_id: env('ZHIHU_OAUTH_APP_ID') || '',
    app_key: env('ZHIHU_OAUTH_APP_KEY') || '',
    grant_type: 'authorization_code',
    redirect_uri: redirectURI(),
    code,
  });
  const resp = await fetch(`${OPENAPI}/access_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  const data = await resp.json().catch(() => ({} as Record<string, unknown>)) as Record<string, any>;
  const accessToken = typeof data?.access_token === 'string' ? data.access_token : '';
  if (!accessToken) {
    throw new Error(`换取Token失败: ${JSON.stringify(data).substring(0, 200)}`);
  }
  const sid = crypto.randomUUID().replace(/-/g, '');
  const session: OAuthSession = {
    accessToken,
    handle: `zs_${sid.substring(0, 8)}`,
    loginAt: Date.now(),
  };
  const kv = getKV();
  if (kv) {
    await kv.put(
      `kanshan:oauth_session:${sid}`,
      JSON.stringify({ accessToken, handle: session.handle, loginAt: session.loginAt }),
      { expirationTtl: SESSION_TTL },
    );
  }
  return { ...session, sid };
}

export function parseSessionCookie(cookieHeader: string | undefined): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]+)`));
  return match ? match[1] : null;
}

export function buildSessionCookie(sid: string): string {
  return `${COOKIE_NAME}=${sid}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_TTL}`;
}

export function buildClearCookie(): string {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; Max-Age=0`;
}

export async function getSessionBySid(sid: string): Promise<OAuthSession | null> {
  const kv = getKV();
  if (!kv || !sid) return null;
  const raw = await kv.get(`kanshan:oauth_session:${sid}`);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as OAuthSession;
  } catch {
    return null;
  }
}

export async function destroySession(sid: string): Promise<void> {
  const kv = getKV();
  if (kv && sid) await kv.delete(`kanshan:oauth_session:${sid}`);
}

/**
 * 拉取授权用户本人的公开创作内容（标题+摘要），作为思维指纹的分析素材。
 * 用户数据接口按官方约定需要 Access Secret + X-OAuth-Token 双头；结果因人而异，禁止缓存。
 */
export async function fetchSessionAnswersText(accessToken: string): Promise<string> {
  const headers = {
    Authorization: `Bearer ${env('ZHIHU_ACCESS_SECRET') || ''}`,
    'X-Request-Timestamp': String(Math.floor(Date.now() / 1000)),
    'X-OAuth-Token': accessToken,
  };
  const resp = await fetch(`${API_BASE}/api/v1/user/contents?ContentType=all&Limit=20&SortField=ts`, { headers });
  if (!resp.ok) throw new Error(`用户内容接口 ${resp.status}`);
  const data = await resp.json() as any;
  if (data && typeof data.Code === 'number' && data.Code !== 0) {
    throw new Error(`用户内容接口业务错误 Code=${data.Code}`);
  }
  const items = data?.Data?.Items || data?.data?.items || [];
  return (Array.isArray(items) ? items : [])
    .map((item: any) => `${item.Title || item.title || ''}\n${item.Summary || item.summary || item.ContentText || item.excerpt || ''}`)
    .filter((t: string) => t.trim().length > 0)
    .join('\n\n---\n\n')
    .substring(0, 8000);
}

/** 数据接口通用双头（官方约定：Access Secret 做 Bearer，OAuth Token 走 X-OAuth-Token） */
function passiveHeaders(accessToken: string) {
  return {
    Authorization: `Bearer ${env('ZHIHU_ACCESS_SECRET') || ''}`,
    'X-Request-Timestamp': String(Math.floor(Date.now() / 1000)),
    'X-OAuth-Token': accessToken,
  };
}

/**
 * 被动账号侧写：不依赖用户写任何内容，直接从 OAuth 授权拿公开信息。
 * 三路数据各自独立降级——拿不到哪路就少展示哪路，绝不因此失败。
 */
export async function fetchSessionPassiveProfile(accessToken: string): Promise<PassiveProfile> {
  const profile: PassiveProfile = {};
  const headers = passiveHeaders(accessToken);

  // 1. 基本信息（openapi /user）
  try {
    const resp = await fetch(`${OPENAPI}/user`, { headers });
    if (resp.ok) {
      const data = await resp.json() as any;
      const src = data?.data || data?.Data || data?.user || data || {};
      profile.nickname = src.name || src.Fullname || src.fullname || undefined;
      profile.headline = src.headline || src.Headline || undefined;
      const g = String(src.gender ?? src.Gender ?? '').toLowerCase();
      profile.gender = g === 'male' ? '男' : g === 'female' ? '女' : undefined;
    }
  } catch (err) {
    console.error(`[OAuth] 被动侧写·基本信息失败: ${(err as Error).message}`);
  }

  // 2. 关注列表（关注的人+总数）
  try {
    const resp = await fetch(`${API_BASE}/api/v1/user/followees?Limit=10&Offset=0`, { headers });
    if (resp.ok) {
      const data = await resp.json() as any;
      if (!(typeof data?.Code === 'number' && data.Code !== 0)) {
        const items = data?.Data?.Items || data?.data?.items || [];
        if (Array.isArray(items) && items.length > 0) {
          profile.followees = items
            .map((it: any) => it.Name || it.name || it.Title || it.title || '')
            .filter((s: string) => s).slice(0, 5);
        }
        const totals = data?.Data?.Paging?.Totals || data?.data?.paging?.totals;
        const total = Number(totals?.total ?? totals);
        profile.followeeCount = Number.isFinite(total) && total > 0 ? total : (Array.isArray(items) ? items.length : null);
      }
    }
  } catch (err) {
    console.error(`[OAuth] 被动侧写·关注列表失败: ${(err as Error).message}`);
  }

  // 3. 收藏夹（名称能反映兴趣领域）
  try {
    const resp = await fetch(`${API_BASE}/api/v1/user/favlists?Limit=10&Offset=0`, { headers });
    if (resp.ok) {
      const data = await resp.json() as any;
      if (!(typeof data?.Code === 'number' && data.Code !== 0)) {
        const items = data?.Data?.Items || data?.data?.items || [];
        if (Array.isArray(items) && items.length > 0) {
          profile.favlists = items
            .map((it: any) => it.Title || it.title || it.Name || it.name || '')
            .filter((s: string) => s).slice(0, 6);
        }
      }
    }
  } catch (err) {
    console.error(`[OAuth] 被动侧写·收藏夹失败: ${(err as Error).message}`);
  }

  return profile;
}

export const oauthService = {
  isOAuthConfigured,
  buildAuthorizeURL,
  consumeState,
  exchangeAndCreateSession,
  parseSessionCookie,
  buildSessionCookie,
  buildClearCookie,
  getSessionBySid,
  destroySession,
  fetchSessionAnswersText,
  fetchSessionPassiveProfile,
};
export default oauthService;
