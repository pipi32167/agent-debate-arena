# AI 辩论投票群 - Makefile
# 常用命令集合

.PHONY: help dev stop build start install db-migrate db-generate db-studio db-reset clean lint

# 默认显示帮助
help:
	@echo "🤖 AI 辩论投票群 - 可用命令"
	@echo ""
	@echo "📦 开发命令:"
	@echo "  make dev          启动开发服务器"
	@echo "  make stop         停止开发/生产服务器"
	@echo "  make install      安装依赖"
	@echo "  make clean        清理构建文件"
	@echo ""
	@echo "🔨 构建命令:"
	@echo "  make build        构建生产版本"
	@echo "  make start        启动生产服务器"
	@echo ""
	@echo "🗄️  数据库命令:"
	@echo "  make db-migrate   运行数据库迁移"
	@echo "  make db-generate  生成 Prisma Client"
	@echo "  make db-studio    打开 Prisma Studio"
	@echo "  make db-reset     重置数据库（危险！）"
	@echo "  make db-init      初始化数据库（创建内置 Providers）"
	@echo ""
	@echo "🧹 其他命令:"
	@echo "  make lint         运行代码检查"
	@echo "  make help         显示此帮助"

# ========== 开发命令 ==========

# 启动开发服务器（端口 45227）
dev:
	@echo "🚀 启动开发服务器（端口 45227）..."
	npm run dev

# 停止服务器（开发/生产）
stop:
	@echo "🛑 停止服务器进程..."
	@pkill -f "next dev -p 45227" 2>/dev/null || true
	@pkill -f "next start -p 45227" 2>/dev/null || true
	@echo "✅ 服务器已停止"

# 安装依赖
install:
	@echo "📦 安装依赖..."
	npm install

# 清理构建文件
clean:
	@echo "🧹 清理构建文件..."
	rm -rf .next dist node_modules
	@echo "✅ 清理完成"

# ========== 构建命令 ==========

# 构建生产版本
build:
	@echo "🔨 构建生产版本..."
	npm run build

# 启动生产服务器
start:
	@echo "🚀 启动生产服务器..."
	npm start

# 构建并启动
prod: build start

# ========== 数据库命令 ==========

# 生成 Prisma Client
db-generate:
	@echo "📝 生成 Prisma Client..."
	npx prisma generate

# 运行数据库迁移
db-migrate:
	@echo "🗄️  运行数据库迁移..."
	npx prisma migrate dev

# 创建新的迁移
db-migrate-create:
	@read -p "输入迁移名称: " name; \
	npx prisma migrate dev --name $$name

# 重置数据库（危险！）
db-reset:
	@echo "⚠️  警告: 这将重置数据库！"
	@read -p "确定要继续吗? (y/N) " confirm; \
	if [ "$$confirm" = "y" ] || [ "$$confirm" = "Y" ]; then \
		npx prisma migrate reset --force; \
		echo "✅ 数据库已重置"; \
	else \
		echo "❌ 已取消"; \
	fi

# 打开 Prisma Studio
db-studio:
	@echo "🎨 打开 Prisma Studio..."
	npx prisma studio

# 推送 schema 到数据库（不创建迁移文件）
db-push:
	@echo "📤 推送 schema 到数据库..."
	npx prisma db push

# 查看数据库状态
db-status:
	@echo "📊 数据库状态..."
	npx prisma migrate status

# 初始化数据库（创建内置 Providers）
db-init:
	@echo "🎯 初始化数据库..."
	@echo "这将在数据库中创建内置的 OpenAI 和 Anthropic Providers"
	@curl -X POST http://localhost:45227/api/db/init 2>/dev/null || echo "请确保开发服务器已运行 (make dev)"

# 种子数据（可选）
db-seed:
	@echo "🌱 添加种子数据..."
	@# 可以在这里添加种子脚本

# ========== 代码质量 ==========

# 运行代码检查
lint:
	@echo "🔍 运行代码检查..."
	npm run lint 2>/dev/null || echo "未配置 lint 脚本"

# 类型检查
type-check:
	@echo "🔍 运行 TypeScript 类型检查..."
	npx tsc --noEmit

# ========== 快捷命令 ==========

# 快速开始：安装依赖 + 生成 Prisma + 运行迁移 + 启动开发
setup: install db-generate db-migrate
	@echo "✅ 项目初始化完成！"
	@echo "运行 'make dev' 启动开发服务器"

# 完整重置：清理 + 安装 + 数据库重置 + 启动
reset: clean install db-reset db-generate
	@echo "✅ 项目已完全重置！"
	@echo "运行 'make dev' 启动开发服务器"
