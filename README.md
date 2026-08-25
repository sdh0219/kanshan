# 看山探案录 · 灵魂共探

知乎黑客松 2026 校园新锐季参赛项目 — 整合方案（方案④探案 + 方案①灵魂匹配）

## 快速启动

### 1. 后端

```bash
cd backend
cp .env.example .env
# 编辑 .env 填入知乎API Token和直答Agent Token
npm install
npm run dev
# 服务启动在 http://localhost:3001
```

### 2. 前端

```bash
cd frontend
npm install
npm run dev
# 前端启动在 http://localhost:5173
```

### 3. 体验流程

1. 打开 http://localhost:5173
2. 输入知乎ID（或选择预设用户：tech_blogger / humanities_writer / business_analyst）
3. 系统构建思维指纹 → 生成互补型AI搭档
4. 进入预设案件「消失的学术新星」
5. 搜证 → 审讯NPC → 收集线索 → 推理指认
6. 揭晓结局 → 查看灵魂侦探榜

## 项目结构

```
kanshan-detective/
├── backend/                    # Node.js + Express 后端
│   ├── src/
│   │   ├── app.ts              # 入口
│   │   ├── routes/             # 4个路由模块
│   │   │   ├── fingerprint.ts  #   思维指纹分析
│   │   │   ├── companion.ts    #   AI搭档生成
│   │   │   ├── game.ts         #   游戏流程
│   │   │   └── social.ts       #   灵魂侦探榜
│   │   ├── services/           # 业务逻辑层
│   │   │   ├── zhihuApi.ts     #   知乎API封装
│   │   │   ├── agentApi.ts     #   直答Agent封装
│   │   │   ├── fingerprintService.ts
│   │   │   ├── companionService.ts
│   │   │   ├── gameEngine.ts   #   游戏引擎
│   │   │   └── caseGenerator.ts
│   │   ├── prompts/            # Prompt模板
│   │   │   ├── fingerprint.ts
│   │   │   ├── companion.ts
│   │   │   ├── npc.ts
│   │   │   ├── caseGen.ts
│   │   │   └── social.ts
│   │   └── data/               # 预设数据
│   │       ├── seedUsers.ts    #   3个种子用户
│   │       ├── presetCase.ts   #   预设案件剧本
│   │       └── companionTemplates.ts # 3种搭档模板
│   ├── .env.example
│   └── package.json
│
├── frontend/                   # React + Vite 前端
│   ├── src/
│   │   ├── App.tsx             # 主入口
│   │   ├── main.tsx
│   │   ├── index.css           # Tailwind + 悬疑暗黑主题
│   │   ├── api/client.ts       # API调用封装
│   │   ├── stores/gameStore.ts # Zustand全局状态
│   │   ├── pages/              # 4个页面
│   │   │   ├── HomePage.tsx        #   首页(输入ID)
│   │   │   ├── FingerprintPage.tsx #   思维指纹结果
│   │   │   ├── GamePage.tsx        #   探案游戏
│   │   │   └── ResultPage.tsx     #   结局+侦探榜
│   │   └── components/         # 组件
│   │       ├── Fingerprint/RadarChart.tsx
│   │       ├── Companion/CompanionCard.tsx
│   │       ├── Detective/
│   │       │   ├── CaseIntro.tsx
│   │       │   ├── SearchPanel.tsx
│   │       │   ├── DialogueBox.tsx
│   │       │   ├── ClueWall.tsx
│   │       │   └── EndingReveal.tsx
│   │       └── Social/DetectiveBoard.tsx
│   ├── tailwind.config.js
│   ├── vite.config.ts
│   └── package.json
│
└── README.md
```

## 技术栈

| 层 | 技术 |
|----|------|
| 前端 | React 18 + Vite 5 + Tailwind CSS + Recharts + Zustand |
| 后端 | Node.js + Express 4 + TypeScript + node-cache |
| API | 知乎热榜/搜索/故事/关注流/知识 + 直答Agent + 刘看山IP |

## API配额管理

| API | 配额 | 单局消耗 | 策略 |
|-----|------|----------|------|
| 直答Agent | 100次/天 | 6-8次/局 | 3个种子用户预缓存，约支持12-15局 |
| 知乎搜索 | 1000次/天 | 3-5次/局 | 充足 |
| 知乎热榜 | 100次/天 | 1次 | 仅AI动态案件使用 |

## 核心创新

1. **个性化AI搭档**：根据玩家思维弱点动态生成互补型侦探角色
2. **跨赛道融合**：社交匹配（灵魂匹配局）+ AI游戏（跨次元游乐场）
3. **思维指纹有游戏价值**：5维指纹直接映射探案能力
4. **知乎生态深度**：全7类API + 刘看山IP，每个API都是游戏核心机制

## 48h开发计划

- Day1 10:00-14:00: 项目搭建 + API封装 + 案件剧本 + Prompt调试
- Day1 14:00-24:00: 核心游戏循环 + 思维指纹 + AI搭档系统
- Day1 24:00-06:00: 完整流程串联
- Day2 06:00-12:00: UI打磨 + 悬疑氛围 + 看山形象
- Day2 12:00-16:00: 灵魂侦探榜 + 社交展示
- Day2 16:00-20:00: AI动态案件 + 部署
- Day2 20:00-10:00: 文档 + 视频 + 提交
