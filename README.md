# 看山探案录 · 灵魂共探

知乎黑客松 2026 校园新锐季参赛项目 — AI 侦探游戏：用你的知乎思维指纹匹配互补型 AI 搭档，在知乎热榜与真实搜索构建的案件世界里协作破案。

> 🎮 赛道：跨次元游乐场（跨赛道融合灵魂匹配局） · 技术栈：React 18 + Vite + Tailwind + Express + TypeScript + 知乎开放平台 7 类 API + 刘看山 IP

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

**双模式**：独立探索（单人高难度）/ 组队共探（AI 搭档补你思维盲区，独占线索计入搭档贡献）

## 快速启动

### 后端（含前端托管，访问 3001 端口即是完整站点）

```bash
cd backend
cp .env.example .env   # 填入知乎 Access Secret（见 backend/.env.example 说明）
npm install
npm run build && npm start   # 生产模式，托管 frontend/dist
# 或开发模式: npm run dev
```

### 前端（开发模式）

```bash
cd frontend
npm install
npm run dev   # http://localhost:5173，/api 代理到 3001
```

### 一键体验

打开首页 → 点预设侦探（tech_blogger / humanities_writer / business_analyst）→ 选案 → 组队共探 → 开始调查。

## 技术亮点

- **真 AI 推理评估**：结局不只数证据——玩家的结案陈词由直答 Agent 对照案件真相评分，≥8 分升档、≤2 分降档，并生成看山口吻的个性化点评；评分解析带容错，模型失控时自动退回证据档位
- **角色扮演台词三层防御**：检索增强模型天然输出「知乎回答体」，本项目用 Prompt 强约束 → 台词硬修剪（rolePlayTrim）→ 跑题自检回退预设台词的三层机制，保证 NPC/搭档任何情况下不出戏
- **搜证模糊语义匹配**：token 包含 + 字符 2-gram 命中度，「张明的论文为什么被撤稿」这类自然语言问句也能命中搜证方向
- **搭档贡献归因**：命中搭档互补维度的关键线索归因给搭档（线索墙金色「搭档发现」标签），搭档独占线索在对话中真实触发并计入战绩
- **三层容错**：智能重试（限流不浪费配额）→ 业务码感知缓存 → 多级降级（备用话题池 / 预设台词 / 模板文案），任何外部依赖失效游戏仍完整可玩

## 项目结构

```
kanshan-detective/
├── backend/                    # Node.js + Express 后端（生产模式托管前端）
│   ├── src/
│   │   ├── app.ts              # 入口（含前端静态托管 + SPA 回退）
│   │   ├── routes/             # 5 个路由模块
│   │   │   ├── fingerprint.ts  #   思维指纹分析
│   │   │   ├── companion.ts    #   AI 搭档生成
│   │   │   ├── game.ts         #   游戏流程（搜证/对话/推理评估）
│   │   │   ├── archive.ts      #   案件库（预设/热榜/投稿 + 记录）
│   │   │   └── social.ts       #   灵魂侦探榜
│   │   ├── services/           # 业务逻辑层
│   │   │   ├── gameEngine.ts   #   游戏引擎（含 evaluateWithReasoning）
│   │   │   ├── fingerprintService.ts / companionService.ts
│   │   │   ├── caseGenerator.ts / caseStore.ts
│   │   │   └── zhihuApi.ts / agentApi.ts
│   │   ├── prompts/            # Prompt 模板（fingerprint/companion/npc/caseGen/social/evaluate）
│   │   ├── utils/rolePlay.ts   # 台词硬修剪
│   │   └── data/               # 种子用户 / 预设案件 / 搭档模板 / 备用话题池
│   └── tests/                  # 单元测试（21 断言）
├── frontend/                   # React + Vite 前端（自研 SVG 雷达图）
│   └── src/
│       ├── pages/              # 首页 / 指纹档案 / 档案室 / 游戏 / 结果 / 我的卷宗
│       └── components/         # 刘看山IP / 搜证 / 对话 / 线索墙 / 结局揭示 / 侦探榜
└── docs/                       # 案件引擎架构设计
```

## 部署

单服务部署：后端自动托管 `frontend/dist`（构建时检测，存在即挂载静态资源 + SPA 回退），前端无需单独部署。

推荐 **Render 免费层 + UptimeRobot 保活**（¥0/月）：Build Command `cd backend && npm install && npm run build && cd ../frontend && npm install && npm run build`，Start Command `cd backend && npm start`，环境变量见 `.env.example`。

## API 配额管理

| API | 配额 | 单局消耗 | 策略 |
|-----|------|----------|------|
| 直答 Agent | 100 次/天 | 6-8 次/局 | 3 个种子用户预缓存；台词与评估失败均有预设回退 |
| 知乎搜索 | 1000 次/天 | 3-5 次/局 | 充足，缓存 10 分钟 |
| 知乎热榜 | 100 次/天 | 1 次 | 缓存 30 分钟，仅 AI 动态案件使用 |

## 质量保障

- 前后端 `tsc --noEmit` 零错误，TypeScript 全量覆盖
- 后端单元测试 21 断言（统计/容错/隔离/清理 5 组场景）
- 端到端实测：建档 → 指纹 → 组队 → 搜证 → NPC 讯问 → 推理评估 → 结局 → 卷宗 全链路浏览器验证
