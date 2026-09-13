# Cloudflare 部署指南（免费 · 无需信用卡）

本项目已改造为 **Cloudflare Workers 一体化架构**：一个 Worker 同时托管前端静态资源（Static Assets）和后端 API（Hono），数据存在 KV。**单域名、无跨域、免费层足够比赛使用。**

```
浏览器 ──► Worker（单域名 https://xxx.workers.dev）
            ├── /api/*      → Hono 路由（指纹/搭档/游戏/档案室/社交）
            ├── 其他路径     → Static Assets（前端 React 构建产物）
            └── DATA (KV)   → 生成案件 / 探案记录
```

## ⭐ 双线部署现状（2026-09-13）

| 站点 | 地址 | 角色 | 大陆直连 |
|---|---|---|---|
| **Cloudflare Pages（主站）** | https://kanshan-detective.pages.dev | 提交表单用的作品链接 | ✅ 实测通过 |
| Cloudflare Workers（备用站） | https://kanshan-detective.3082780889.workers.dev | 海外/翻墙兜底 | ❌ workers.dev 被墙 |

- 两站**共享同一 KV 命名空间**（id `5400b9...7d7a`），数据实时一致
- Pages 主站采用高级模式：`_worker.js`（esbuild 打包整个 Hono Worker）+ 静态资源，与 Workers 版完全同构
- **日常更新**：`npm run deploy:pages`（主站）/ `npm run deploy`（备用站），建议两个都跑保持一致
- Pages 配置：`backend/pages-deploy/wrangler.jsonc`（Pages 命令只认 cwd 下的 wrangler.jsonc，故独立目录）
- Pages 密钥：`npx wrangler pages secret put ZHIHU_ACCESS_SECRET --project-name kanshan-detective`

## 一、前置条件

| 项 | 要求 |
|---|---|
| Node.js | **v22 以上**（Wrangler 4.x 强制要求；本机可用 `D:\environment\nodejs_global\nodejs`，先把它加到 PATH 最前） |
| Cloudflare 账号 | 免费注册 https://dash.cloudflare.com ，**不需要绑信用卡** |
| 知乎密钥 | Access Secret（已在本地 `.dev.vars`，线上要单独配置成 Worker Secret） |

## 二、首次部署（5 步）

> 所有命令在 `backend/` 目录下执行。

### 1. 登录 Cloudflare（浏览器授权一次）

```bash
cd backend
npx wrangler login
```

浏览器会自动弹出，点「Allow」授权即可。登录状态会缓存，之后不用重复登录。

### 2. 创建 KV 命名空间

```bash
npm run kv:create
# 等价于：npx wrangler kv namespace create DATA
```

命令会输出类似：

```json
{ "id": "a1b2c3d4e5f6....", "title": "DATA" }
```

复制这个 `id`，打开 `backend/wrangler.jsonc`，把 `PLACEHOLDER_KV_ID` 替换成真实 id：

```jsonc
"kv_namespaces": [
  { "binding": "DATA", "id": "a1b2c3d4e5f6...." }
]
```

### 3. 配置知乎密钥为 Worker Secret（不会进 Git）

```bash
npx wrangler secret put ZHIHU_ACCESS_SECRET
# 粘贴 Access Secret 后回车
```

> 其余非敏感配置（API base、模型名）已写在 `wrangler.jsonc` 的 `vars` 里，无需再设。

### 4. 构建前端并部署（一条命令）

```bash
npm run deploy
```

它会自动按顺序执行：
1. `predeploy` → TypeScript 类型检查 + 构建前端到 `frontend/dist`
2. `deploy` → `wrangler deploy` 上传 Worker + 静态资源 + 绑定 KV

成功后会输出线上地址，形如：`https://kanshan-detective.<你的子域>.workers.dev`

### 5. 线上验证清单

打开线上地址，依次确认：

- [ ] 首页正常加载（暗黑侦探主题、刘看山素材不裂图）
- [ ] 选预设用户 `tech_blogger` → 雷达图正常
- [ ] 档案室能看到预设案件「消失的学术新星」
- [ ] 搜证输入「论文撤稿」→ 出知乎结果 + 命中线索
- [ ] 审讯小陈问「情绪状态」→ 有台词回复
- [ ] 通关一次 → 结局页 + 记录写入（验证线上 KV）
- [ ] 手机浏览器打开布局正常

把该地址填到 `交付清单/1-可运行体验链接（必交）/README.md`。

## 三、本地开发

```bash
# backend 目录，Node v22+
npm run dev          # wrangler dev，起在 http://localhost:3001
```

- 本地密钥放 `backend/.dev.vars`（已被 .gitignore 排除）：
  ```
  ZHIHU_ACCESS_SECRET=你的密钥
  ```
- 本地 KV 由 Wrangler 自动模拟（`.wrangler/state`），`wrangler.jsonc` 里即使是 PLACEHOLDER id 也不影响本地运行。
- 改了前端代码后，本地联调需要重新 `npm run build:client`（或另开一个终端在 `frontend/` 跑 `npm run dev`，走 5173 代理）。

## 四、后续更新部署

代码改完后，重复一条命令即可：

```bash
npm run deploy
```

只改后端、前端没动时可跳过前端构建：`npm run deploy:only`。

## 五、常见问题

| 问题 | 原因 / 处理 |
|---|---|
| `Wrangler requires at least Node.js v22` | 当前 node 版本太低，切换到 v22+（本机用 `D:\environment\nodejs_global\nodejs`） |
| 部署后接口 500，日志显示 `KV 未初始化` | 第 2 步 KV 没建或 id 没填进 wrangler.jsonc |
| 指纹/NPC 报 429 | 直答 Agent 当日 100 次配额用尽；游戏有兜底，预设触发台词和预设案件不受影响，次日恢复 |
| `wrangler login` 浏览器没弹 | 复制终端里的 URL 手动到浏览器打开授权 |
| 想换个更好记的域名 | Cloudflare 控制台 → Workers & Pages → 该 Worker → Settings → 可绑定自定义域名（可选，非必须） |
| 静态资源更新后线上没变 | 确认 `npm run deploy` 前前端已重新 build（predeploy 会自动做）；强刷浏览器缓存 |

## 六、免费额度说明（比赛足够）

- Workers：免费层每天 10 万次请求，评委体验量级远用不完
- KV：免费层每天 10 万次读 / 1000 次写，案件与记录量级极小
- Static Assets：静态资源请求不计费、不限 Workers 请求数
- 全程不需要信用卡，不绑卡
