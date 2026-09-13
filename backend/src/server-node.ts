// Node 运行时入口 —— 用于知乎 AI Works 等平台的一键部署（与 Cloudflare Workers 共用同一套业务代码）
// 差异仅在运行时垫片：KV 以进程内存兜底（平台限制无数据库读写），静态资源从本地 dist 托管
import fs from 'node:fs';
import path from 'node:path';
import { Readable } from 'node:stream';
import { serve } from '@hono/node-server';
import app from './worker.js';

const PORT = Number(process.env.PORT || 3000);
const DIST = path.resolve(process.env.STATIC_DIR || path.join(process.cwd(), 'static'));

/* ---------- 内存 KV 垫片（与 Workers KV 的 get/put/delete 同形，支持 TTL） ---------- */
function createMemoryKV() {
  const store = new Map<string, { value: string; expiresAt?: number }>();
  return {
    async get(key: string): Promise<string | null> {
      const entry = store.get(key);
      if (!entry) return null;
      if (entry.expiresAt && Date.now() > entry.expiresAt) {
        store.delete(key);
        return null;
      }
      return entry.value;
    },
    async put(key: string, value: string, opts?: { expirationTtl?: number }): Promise<void> {
      store.set(key, {
        value,
        expiresAt: opts?.expirationTtl ? Date.now() + opts.expirationTtl * 1000 : undefined,
      });
    },
    async delete(key: string): Promise<void> {
      store.delete(key);
    },
  };
}

/* ---------- 静态资源垫片（实现 ASSETS.fetch：dist 托管 + SPA 回退 + Range 支持） ---------- */
const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.mp4': 'video/mp4',
  '.mp3': 'audio/mpeg',
  '.webm': 'video/webm',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8',
};

const assetsHandler = {
  async fetch(req: any): Promise<Response> {
    const url = new URL(req.url);
    let pathname = decodeURIComponent(url.pathname);
    if (pathname.endsWith('/')) pathname += 'index.html';
    const safe = path.normalize(path.join(DIST, pathname));
    if (!safe.startsWith(DIST)) return new Response('Forbidden', { status: 403 });

    let target = safe;
    if (!fs.existsSync(target) || fs.statSync(target).isDirectory()) {
      target = path.join(DIST, 'index.html'); // SPA 回退
    }
    if (!fs.existsSync(target)) return new Response('Not Found', { status: 404 });

    const stat = fs.statSync(target);
    const baseHeaders: Record<string, string> = {
      'Content-Type': MIME[path.extname(target).toLowerCase()] || 'application/octet-stream',
      'Accept-Ranges': 'bytes',
      'Cache-Control': target.endsWith('index.html') ? 'no-cache' : 'public, max-age=86400',
    };

    const range = req.headers.get('range');
    if (range) {
      const m = /bytes=(\d*)-(\d*)/.exec(range);
      let start = m?.[1] ? parseInt(m[1], 10) : 0;
      let end = m?.[2] ? parseInt(m[2], 10) : stat.size - 1;
      end = Math.min(end, stat.size - 1);
      start = Math.min(Math.max(start, 0), end);
      const stream = fs.createReadStream(target, { start, end });
      return new Response(Readable.toWeb(stream) as any, {
        status: 206,
        headers: { ...baseHeaders, 'Content-Range': `bytes ${start}-${end}/${stat.size}`, 'Content-Length': String(end - start + 1) },
      });
    }
    const stream = fs.createReadStream(target);
    return new Response(Readable.toWeb(stream) as any, { headers: { ...baseHeaders, 'Content-Length': String(stat.size) } });
  },
};

/* ---------- 环境装配：默认值 + 平台注入的环境变量（含密钥） ---------- */
const env: Record<string, unknown> = {
  DATA: createMemoryKV(),
  ASSETS: assetsHandler,
  ZHIHU_API_BASE: 'https://developer.zhihu.com',
  AGENT_API_BASE: 'https://developer.zhihu.com',
  AGENT_MODEL: 'zhida-fast-1p5',
  ...process.env,
  NODE_ENV: 'production', // 平台环境变量不可覆盖
};

serve(
  { fetch: ((req: any) => (app as any).fetch(req, env)) as any, port: PORT } as any,
  (info: any) => {
    const oauthOn = !!process.env.ZHIHU_OAUTH_APP_ID && !!process.env.ZHIHU_OAUTH_APP_KEY;
    console.log(`[看山探案录] Node/AiWorks 服务已启动: http://localhost:${info.port}`);
    console.log(`[看山探案录] 静态目录: ${DIST}`);
    console.log(`[看山探案录] OAuth 登录: ${oauthOn ? '已启用' : '未配置凭证（登录入口隐藏）'}`);
  },
);
