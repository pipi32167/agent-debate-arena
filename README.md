# AI 辩论投票群 🤖⚔️

一个多 AI 辩论锦标赛系统，N 个 AI (N ≥ 5 且为奇数) 进行淘汰赛制辩论，由其他 AI 作为评委投票决定胜负。

## 功能特性

- 🎭 **丰富的 AI 角色预设** - 苏格拉底、爱因斯坦、马克思等 10 位历史名人 persona
- 🤖 **多模型支持** - 支持 OpenAI、Anthropic 及自定义 OpenAI 兼容 API
- ⚔️ **淘汰赛制** - 两两辩论，评委投票，胜者晋级
- 🗳️ **透明投票** - 每位评委的投票理由都可见
- 📊 **可视化对阵** - 树状图直观展示锦标赛进程
- 💾 **SQLite 数据库** - 持久化存储 Providers、锦标赛和历史记录
- 🔧 **自定义 Provider** - 支持添加 OpenRouter、SiliconFlow 等兼容 API

## 快速开始

### 方式一：使用 Makefile（推荐）

```bash
# 查看所有可用命令
make help

# 完整初始化（安装依赖 + 生成 Prisma + 运行迁移）
make setup

# 启动开发服务器
make dev
```

### 方式二：手动操作

#### 1. 安装依赖

```bash
npm install
```

#### 2. 配置环境变量

```bash
cp .env.example .env.local
```

编辑 `.env.local`：

```env
DATABASE_URL="file:./dev.db"
OPENAI_API_KEY=sk-your-openai-api-key
ANTHROPIC_API_KEY=sk-your-anthropic-api-key  # 可选
```

#### 3. 初始化数据库

```bash
# 生成 Prisma Client
npx prisma generate

# 运行数据库迁移
npx prisma migrate dev

# 启动开发服务器后，初始化内置 Providers
curl -X POST http://localhost:45227/api/db/init
```

#### 4. 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:45227

## Makefile 命令参考

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

## 使用说明

### 配置自定义 Provider

1. 在配置页面的 **Provider 配置** 面板中点击「添加 Provider」
2. 填写 Provider 名称、Base URL（如 `https://api.openai.com/v1`）和 API Key
3. 点击「获取模型列表」拉取可用模型
4. 勾选需要使用的模型
5. 保存 Provider

### 创建 AI 辩手

1. 在 **AI 配置** 面板中选择预设角色或点击「自定义」
2. 编辑 Bot 时可以选择 Provider 和 Model
3. 添加至少 5 个且为奇数个的辩手
4. 设置议题并开始锦标赛

### 辩论流程

```
开场陈述 → 反驳环节 → 自由辩论 → 总结陈词 → 评委投票 → 胜者晋级
```

每场比赛的胜者会进入下一轮，直到只剩一位冠军。

## 技术栈

- **框架**: Next.js 16 + React 19 + TypeScript
- **样式**: Tailwind CSS 4 + shadcn/ui
- **AI SDK**: Vercel AI SDK
- **数据库**: SQLite + Prisma ORM
- **状态管理**: Zustand

## 项目结构

```
app/
├── page.tsx                    # 主页面
├── layout.tsx                  # 根布局
├── api/
│   ├── debate/route.ts         # AI 对话 API
│   ├── provider/models/route.ts # 获取 Provider 模型列表
│   └── db/                     # 数据库 API
│       ├── init/route.ts       # 初始化数据库
│       ├── providers/route.ts  # Provider CRUD
│       ├── tournament/route.ts # 锦标赛操作
│       └── history/route.ts    # 历史记录
├── components/
│   ├── ai-config.tsx           # AI 配置面板
│   ├── provider-config.tsx     # Provider 配置面板
│   ├── topic-config.tsx        # 议题配置
│   ├── debate-arena.tsx        # 辩论竞技场
│   ├── voting-panel.tsx        # 投票面板
│   ├── tournament-bracket.tsx  # 锦标赛对阵图
│   └── winner-display.tsx      # 冠军展示
├── stores/
│   └── debate-store.ts         # 状态管理
lib/
├── presets.ts                  # 预设角色和提示词
└── utils.ts                    # 工具函数
types/
└── index.ts                    # 类型定义
prisma/
└── schema.prisma               # 数据库 Schema
Makefile                        # 常用命令
```

## 数据库 Schema

- **Provider** - API 提供商配置（名称、Base URL、API Key、模型列表）
- **Tournament** - 当前/进行中的锦标赛
- **TournamentHistory** - 已完成的历史记录

## 预设角色

| 角色 | 头像 | Persona |
|------|------|---------|
| 苏格拉底 | 🏛️ | 古希腊哲学家，擅长苏格拉底式提问 |
| 爱因斯坦 | 🔬 | 理论物理学家，逻辑与想象力并重 |
| 亚当斯密 | 💰 | 经济学之父，自由市场捍卫者 |
| 马克思 | ✊ | 社会哲学家，关注阶级与不平等 |
| 达芬奇 | 🎨 | 文艺复兴全才，艺术与科学融合 |
| 孙子 | ⚔️ | 军事战略家，强调形势与策略 |
| 莎士比亚 | 🎭 | 文学巨匠，洞察人性的大师 |
| 林肯 | ⚖️ | 律师出身的政治家，逻辑与修辞并重 |
| 马斯克 | 🚀 | 科技企业家，第一性原理思考者 |
| 休谟 | 🤔 | 怀疑论者，经验主义拥护者 |

## 许可证

MIT
