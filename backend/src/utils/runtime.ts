/**
 * 极简内存 TTL 缓存。
 * Workers 禁止全局作用域的定时器（NodeCache 的 checkperiod 会崩），
 * 因此用惰性过期：读取时检查 TTL，不做后台清理。
 */
const store = new Map<string, { value: unknown; expires: number }>();

export const cache = {
  get<T = unknown>(key: string): T | undefined {
    const entry = store.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expires) {
      store.delete(key);
      return undefined;
    }
    return entry.value as T;
  },
  set(key: string, value: unknown, ttlSeconds = 600) {
    store.set(key, { value, expires: Date.now() + ttlSeconds * 1000 });
  },
  del(key: string) {
    store.delete(key);
  },
};

/** KV 命名空间（由 worker 入口在每次请求前注入） */
let KV: any = null;
export function setKV(ns: any) {
  KV = ns;
}
export function getKV(): any {
  if (!KV) throw new Error('KV 未初始化');
  return KV;
}

/** 懒读取环境变量：Workers 下由入口把绑定同步进 process.env，本地由 wrangler/.dev.vars 提供 */
export function env(key: string): string | undefined {
  return process.env[key];
}

/** 把 Workers 绑定（vars/secrets）同步到 process.env，供原有服务代码读取 */
export function syncEnvFromBindings(bindings: Record<string, unknown>) {
  for (const [k, v] of Object.entries(bindings)) {
    if (typeof v === 'string' && process.env[k] === undefined) {
      process.env[k] = v;
    }
  }
}
