# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

AI Debate Arena (AI辩论投票群) — A single-page app where N AI agents (N>=5, odd) debate topics in a single-elimination tournament. Non-debating agents act as judges, voting on winners. 10 preset historical personas (Socrates, Einstein, Marx, etc.) are available as debaters.

## Commands

```bash
make setup          # install + prisma generate + prisma migrate (first-time setup)
make dev            # start dev server on port 45227
make build          # production build
make lint           # eslint
make type-check     # tsc --noEmit
make db-init        # seed built-in providers (requires dev server running)
make db-studio      # open Prisma Studio
make db-migrate     # run prisma migrate dev
make db-reset       # destructive DB reset (prompts for confirmation)
make clean          # remove .next, dist, node_modules
```

## Architecture

### Stack

Next.js 16 App Router, React 19, TypeScript, Tailwind CSS v4 (CSS-based config in `globals.css`), shadcn/ui (base-nova style), Zustand for client state, Prisma + SQLite for persistence, Vercel AI SDK for streaming AI responses.

**Important:** This is Next.js 16 with breaking changes from standard Next.js. Read `node_modules/next/dist/docs/` before writing code. Heed deprecation notices.

### Data Flow

1. `app/page.tsx` — single `'use client'` page, renders one of three states: config, active tournament, or completed tournament
2. `stores/debate-store.ts` — Zustand store managing tournament state, providers, history; all mutations call API routes
3. `app/api/debate/route.ts` — core AI logic; uses `streamText` for debate turns (SSE), `generateText` for judge voting
4. `app/api/db/*` — CRUD routes for providers, tournaments, history
5. `lib/presets.ts` — persona definitions + `generateDebaterPrompt()` / `generateJudgePrompt()`

### Debate Flow Per Match

Opening statements (2 rounds) → Rebuttals (2 rounds) → Cross-examination (2 rounds) → Closing statements (1 round) → Judge voting → Winner advances

### Database

SQLite via `better-sqlite3` + Prisma. DB file at `prisma/dev.db`. Complex objects (participants, rounds, winners) stored as JSON strings in TEXT columns. Each API route creates a fresh `PrismaClient` per request.

### Key Directories

- `app/api/debate/` — AI debate and judge logic
- `app/api/db/` — provider, tournament, history CRUD
- `app/components/` — page-level components (arena, voting, config panels, bracket display)
- `components/ui/` — shadcn/ui primitives
- `lib/presets.ts` — persona prompts (Chinese) and prompt generators
- `stores/` — Zustand state management
- `types/` — TypeScript interfaces

### shadcn/ui

Components added via `npx shadcn@latest add <component>`. Config in `components.json` (base-nova style, lucide icons).

### Environment

See `.env.example`. Required: `OPENAI_API_KEY`. Optional: `ANTHROPIC_API_KEY`. Custom provider keys are sent from the client at runtime, not stored in env.
