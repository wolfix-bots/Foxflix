# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Artifacts

### FoxyStream (`artifacts/foxy-stream`)
- Cyberpunk-themed movie & TV streaming web app
- Imported from: https://github.com/wolfix-bots/cyber-stream-foxy
- Tech: React 18 + TypeScript + Vite + Tailwind CSS v4 + shadcn/ui + TanStack Query
- API: xcasper API (`movieapi.xcasper.space`) for streams and content
- Features: Hot/Trending/Latest rows, Movie detail with video player, Search, AI chat (FoxyAI via Supabase edge functions)
- Optional: AI features require `VITE_SUPABASE_URL` env var pointing to the Supabase project

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
