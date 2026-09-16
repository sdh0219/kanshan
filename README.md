# 看山探案录 · 灵魂共探

知乎黑客松 2026 校园新锐季参赛项目 — AI 侦探游戏：用你的知乎思维指纹匹配互补型 AI 搭档，在知乎热榜与真实搜索构建的案件世界里协作破案。

> 赛道：跨次元游乐场（跨赛道融合灵魂匹配局）
> 技术栈：React 18 + Vite + Tailwind + **Hono** + TypeScript + Cloudflare Workers/Pages + KV + 知乎开放平台 API + 刘看山 IP

## 在线体验

- 主站（大陆直连）：<https://kanshan-detective.pages.dev>
- 备用站（海外）：<https://kanshan-detective.3082780889.workers.dev>
- 两站共享同一 KV 命名空间，数据实时一致

打开首页 → 点预设侦探（tech_blogger / humanities_writer / business_analyst）一键建档 → 选案 → 组队共探 → 开始调查。也支持知乎账号 OAuth 登录（登录后额外获得被动账号侧写）。

## 核心玩法

```
输入知乎ID → AI分析你的回答 → 五维思维指纹 → 匹配互补型AI搭档
     ↓
选案（官方卷宗 / 知乎热榜AI生成 / 用户投稿生成）
     ↓
搜证（真实知乎搜索 + 模糊语义匹配）→ 审讯NPC（AI角色扮演对话）→ 线索墙
     ↓
结案陈词（你的推理）→ 看山AI评估（0-10分）→ 三档结局 + 灵魂侦探榜
```

## 部署架构

```
浏览器 ──► Cloudflare Pages 主站（kanshan-detective.pages.dev，大陆直连实测）
              │  高级模式：_worker.js（esbuild 打包的 Hono 应用）+ 前端静态资源
              └── DATA (KV) ◄── Cloudflare Workers 备用站（workers.dev，海外兜底）
                                  两站同构，共享 KV，档案数据实时一致
```

## 快速启动

### 本地开发（Wrangler，推荐）

```bash
cd backend
npm install
# 密钥写入 backend/.dev.vars：ZHIHU_ACCESS_SECRET=xxx
cd ../frontend && npm install && npm run build   # 构建前端到 dist
cd ../backend
npm run dev        # http://localhost:3001 即完整站点
```

### 部署

```bash
cd backend
npm run deploy          # Workers 备用站
npm run deploy:pages    # Pages 主站（构建前端 → esbuild 打包 _worker.js → wrangler pages deploy）
```

完整部署步骤（KV 创建、Secret 配置、常见问题）见 [DEPLOY.md](DEPLOY.md)。

## 项目结构

```
kanshan-detective/
├── backend/
│   ├── src/
│   │   ├── worker.ts            # 入口：Hono 应用（API 路由 + SPA 静态托管）
│   │   ├── server-node.ts       # Node 运行时入口（本地/容器部署备用）
│   │   ├── services/            # 业务逻辑层
│   │   │   ├── gameEngine.ts    #   游戏引擎（搜证/审讯/evaluateWithReasoning）
│   │   │   ├── fingerprintService.ts / companionService.ts
│   │   │   ├── caseGenerator.ts / caseStore.ts
│   │   │   ├── oauthService.ts  #   知乎 OAuth（授权/会话/被动账号侧写）
│   │   │   └── zhihuApi.ts / agentApi.ts
│   │   ├── prompts/             # Prompt 模板（fingerprint/companion/npc/caseGen/social/evaluate）
│   │   ├── data/                # 种子用户 / 预设案件 / 搭档模板 / 备用话题池
│   │   └── utils/               # runtime / rolePlay（台词硬修剪）
│   ├── scripts/deploy-pages.mjs # Pages 一键部署脚本
│   ├── pages-deploy/            # Pages 部署配置（wrangler.jsonc）
│   └── tests/                   # 单元测试
├── frontend/
│   ├── src/
│   │   ├── pages/               # Home / Fingerprint / Archive / Game / Result / MyRecords
│   │   ├── components/          # Detective / Companion / Fingerprint / LiuKanshan
│   │   └── utils/               # sfx / caseCovers（卷宗封面映射）
│   └── public/                  # liukan IP 素材 / covers 卷宗封面 / plan / sfx
├── DEPLOY.md                    # 部署指南（KV、Secret、双线部署）
└── CHANGELOG.md                 # 版本迭代记录
```

## 技术亮点

- **真 AI 推理评估**：结局不只数证据——玩家的结案陈词由直答 Agent 对照案件真相评分，≥8 分升档、≤2 分降档，并生成看山口吻的个性化点评；JSON 解析失败自动重试，模型失控时退回证据档位
- **角色扮演台词三层防御**：检索增强模型天然输出「知乎回答体」，本项目用 Prompt 强约束 → 台词硬修剪（rolePlayTrim）→ 跑题自检回退预设台词的三层机制，保证 NPC/搭档任何情况下不出戏
- **搜证模糊语义匹配**：token 包含 + 字符 2-gram 命中度，「张明的论文为什么被撤稿」这类自然语言问句也能命中搜证方向
- **搭档贡献归因**：命中搭档互补维度的关键线索归因给搭档（线索墙金色「搭档发现」标签），搭档独占线索在对话中真实触发并计入战绩
- **指纹报告双保险**：AI 输出 label/interpret/scene_story 增强可读性，字段缺失时代码按分数确定性生成，前端永远有"说人话"的内容可渲染
- **三层容错**：智能重试（限流不浪费配额）→ 业务码感知缓存 → 多级降级（备用话题池 / 预设台词 / 模板文案），任何外部依赖失效游戏仍完整可玩

## API 配额管理

| API | 配额 | 单局消耗 | 策略 |
|-----|------|----------|------|
| 直答 Agent | 100 次/天 | 6-8 次/局 | 3 个种子用户预缓存；台词与评估失败均有预设回退 |
| 知乎搜索 | 1000 次/天 | 3-5 次/局 | 充足，缓存 10 分钟 |
| 知乎热榜 | 100 次/天 | 1 次 | 缓存 30 分钟，仅 AI 动态案件使用 |

## 质量保障

- 前后端 `tsc --noEmit` 零错误，TypeScript 全量覆盖
- 后端单元测试 21 断言（统计/容错/隔离/清理 5 组场景）
- 端到端实测：建档 → 指纹 → 组队 → 搜证 → NPC 讯问 → 推理评估 → 结局 → 卷宗 全链路浏览器验证（含移动端 390px 视口）

## 迭代记录

见 [CHANGELOG.md](CHANGELOG.md)。最近的例子：上线后收集真实玩家反馈，24 小时内完成"指纹报告说人话 / 小样本轻量档案 / 懒人通道 / 被动账号侧写"四项迭代并部署。
