<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Agent Debate Arena - AI 辩论投票群

## 项目概述

Agent Debate Arena 是一个多 AI 辩论锦标赛系统。系统让 N 个 AI (N ≥ 5 且为奇数) 进行淘汰赛制辩论，由其他 AI 作为评委投票决定胜负。

### 核心功能
- **丰富的 AI 角色预设** - 苏格拉底、爱因斯坦、马克思等 10 位历史名人 persona
- **多模型支持** - 支持 OpenAI、Anthropic 及自定义 OpenAI 兼容 API (如 OpenRouter、SiliconFlow)
- **淘汰赛制** - 两两辩论，评委投票，胜者晋级
- **透明投票** - 每位评委的投票理由都可见
- **可视化对阵** - 树状图直观展示锦标赛进程
- **持久化存储** - SQLite 数据库保存 Providers、锦标赛和历史记录

## 技术栈

| 类别 | 技术 |
|------|------|
| 框架 | Next.js 16.2.0 (App Router) |
| UI 库 | React 19.2.4 |
| 语言 | TypeScript 5 |
| 样式 | Tailwind CSS 4 + shadcn/ui (base-nova 风格) |
| AI SDK | Vercel AI SDK (@ai-sdk/openai, @ai-sdk/anthropic) |
| 数据库 | SQLite + Prisma ORM 5 |
| 状态管理 | Zustand 5 |
| 图标 | Lucide React |

## 项目结构

```
app/
├── api/                        # API 路由
│   ├── debate/route.ts         # AI 对话与评委投票 API
│   ├── provider/models/route.ts # 获取 Provider 模型列表
│   └── db/                     # 数据库 API
│       ├── init/route.ts       # 初始化内置 Providers
│       ├── providers/route.ts  # Provider CRUD
│       ├── tournament/route.ts # 锦标赛操作
│       └── history/route.ts    # 历史记录
├── components/                 # 页面级组件
│   ├── ai-config.tsx           # AI 配置面板（辩手管理）
│   ├── provider-config.tsx     # Provider 配置面板
│   ├── topic-config.tsx        # 议题配置
│   ├── debate-arena.tsx        # 辩论竞技场（实时展示）
│   ├── voting-panel.tsx        # 投票面板
│   ├── tournament-bracket.tsx  # 锦标赛对阵图
│   └── winner-display.tsx      # 冠军展示
├── layout.tsx                  # 根布局
├── page.tsx                    # 主页面
└── globals.css                 # 全局样式（Tailwind 4 配置）

components/ui/                  # shadcn/ui 组件
├── button.tsx, card.tsx, etc.  # 基础 UI 组件

lib/
├── presets.ts                  # 预设角色、提示词模板
└── utils.ts                    # 工具函数（cn 等）

stores/
└── debate-store.ts             # Zustand 状态管理

types/
└── index.ts                    # TypeScript 类型定义

prisma/
├── schema.prisma               # 数据库 Schema
└── migrations/                 # 数据库迁移文件

Makefile                        # 常用命令集合
```

## 开发命令

### 快速开始（推荐）
```bash
# 查看所有可用命令
make help

# 完整初始化（安装依赖 + 生成 Prisma + 运行迁移）
make setup

# 启动开发服务器（端口 45227）
make dev
```

### 常用命令

| 命令 | 说明 |
|------|------|
| `make dev` | 启动开发服务器 |
| `make build` | 构建生产版本 |
| `make start` | 启动生产服务器 |
| `make install` | 安装依赖 |
| `make setup` | 完整初始化项目 |
| `make clean` | 清理构建文件 |
| `make db-migrate` | 运行数据库迁移 |
| `make db-generate` | 生成 Prisma Client |
| `make db-studio` | 打开 Prisma Studio（可视化数据库）|
| `make db-reset` | 重置数据库（危险！）|
| `make db-init` | 初始化内置 Providers |
| `make lint` | 运行代码检查 |

### 手动初始化流程
```bash
npm install
npx prisma generate
npx prisma migrate dev
npm run dev

# 然后初始化内置 Providers
curl -X POST http://localhost:45227/api/db/init
```

## 环境变量配置

创建 `.env.local` 文件：

```env
# 数据库（必需）
DATABASE_URL="file:./dev.db"

# OpenAI API Key（如使用 OpenAI 模型）
OPENAI_API_KEY=sk-your-openai-api-key

# Anthropic API Key（可选，如使用 Claude 模型）
ANTHROPIC_API_KEY=sk-your-anthropic-api-key
```

## 数据库 Schema

### Provider
- API 提供商配置
- 字段：id, name, baseURL, apiKey, models (JSON), isBuiltIn, createdAt, updatedAt

### Tournament
- 当前/进行中的锦标赛
- 字段：id, topic, description, participants (JSON), rounds (JSON), currentRoundIndex, currentMatchIndex, winners (JSON), champion (JSON), status, maxDebateRounds, createdAt, updatedAt

### TournamentHistory
- 已完成的历史记录
- 字段：id, tournamentId, topic, description, participants (JSON), rounds (JSON), champion (JSON), createdAt, completedAt

**注意**：复杂对象（participants, rounds, models 等）在数据库中以 JSON 字符串形式存储。

## 辩论流程

1. **开场陈述** (opening) - 双方阐述核心观点
2. **反驳环节** (rebuttal) - 针对对方观点反驳
3. **自由辩论** (cross) - 继续攻击或防守
4. **总结陈词** (closing) - 总结核心论证
5. **评委投票** - 未参赛的 AI 作为评委投票
6. **胜者晋级** - 进入下一轮淘汰赛

## 代码风格指南

### TypeScript
- 启用严格模式 (`strict: true`)
- 使用 `@/*` 路径别名导入项目文件
- 类型定义在 `types/index.ts` 中集中管理

### React
- 使用函数组件 + Hooks
- 客户端组件需添加 `'use client'` 指令
- 服务器组件为默认（Next.js App Router）

### 样式
- 使用 Tailwind CSS 工具类
- 复杂样式组合使用 `cn()` 工具函数（来自 `lib/utils.ts`）
- 使用 shadcn/ui 组件库，风格为 `base-nova`

### API 路由
- 位于 `app/api/**/route.ts`
- 使用 Prisma Client 操作数据库
- AI API 使用 Vercel AI SDK 的 `streamText` 和 `generateText`
- 内置 Provider (openai/anthropic) 使用环境变量中的 API Key
- 自定义 Provider 使用用户配置的 API Key

## 状态管理

使用 Zustand 管理全局状态：

```typescript
// stores/debate-store.ts
interface DebateState {
  tournament: Tournament | null;
  history: Tournament[];
  providers: ProviderConfig[];
  isLoading: boolean;
  // ... actions
}
```

主要 Actions：
- `createTournament()` - 创建锦标赛
- `startTournament()` - 开始锦标赛
- `addMessage()` / `updateCurrentMessage()` - 更新辩论消息
- `completeDebate()` - 完成单场比赛
- `advanceToNextMatch()` - 进入下一场比赛
- `loadProviders()` / `loadTournament()` / `loadHistory()` - 加载数据

## 预设角色

位于 `lib/presets.ts`，包含 10 位历史名人：

| ID | 名称 | 头像 | 特色 |
|----|------|------|------|
| philosopher | 苏格拉底 | 🏛️ | 苏格拉底式提问 |
| scientist | 爱因斯坦 | 🔬 | 逻辑思维与想象力 |
| economist | 亚当斯密 | 💰 | 自由市场捍卫者 |
| revolutionary | 马克思 | ✊ | 关注阶级与不平等 |
| artist | 达芬奇 | 🎨 | 艺术与科学融合 |
| strategist | 孙子 | ⚔️ | 军事战略家 |
| humanist | 莎士比亚 | 🎭 | 洞察人性 |
| lawyer | 林肯 | ⚖️ | 逻辑与修辞并重 |
| futurist | 马斯克 | 🚀 | 第一性原理思考 |
| skeptic | 休谟 | 🤔 | 怀疑论者 |

## 注意事项

1. **API Key 安全**：自定义 Provider 的 API Key 存储在 SQLite 中，内置 Provider 使用服务器环境变量
2. **端口固定**：开发服务器固定使用端口 45227
3. **无测试框架**：项目目前没有配置测试框架
4. **Tailwind 4**：使用新的 `@import` 语法，无 `tailwind.config.js` 文件
5. **Next.js 16**：API 可能与旧版本不同，注意查阅最新文档
6. **图片优化**：`next.config.ts` 中设置了 `images.unoptimized: true`

## 扩展 Provider

支持添加任何 OpenAI 兼容格式的 API：
- OpenRouter
- SiliconFlow
- 阿里云百炼
- 任何兼容 OpenAI API 格式的服务

通过 UI 的「Provider 配置」面板添加，需要提供：
- 名称
- Base URL（如 `https://api.openai.com/v1`）
- API Key
- 启用的模型列表
