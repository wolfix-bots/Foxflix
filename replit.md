# FoxyStream Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Artifacts

### FoxyStream (`artifacts/foxy-stream`)
- Cyberpunk-themed movie & TV streaming web app
- Imported from: https://github.com/wolfix-bots/cyber-stream-foxy
- Tech: React 18 + TypeScript + Vite + Tailwind CSS v4 + shadcn/ui + TanStack Query + socket.io-client
- API: xcasper API (`movieapi.xcasper.space`) for streams and content

### All 15 Features Implemented

1. **User Auth** — Register/Login with JWT, AuthContext, user dropdown in Navbar, My Profile page
2. **VideoPlayer Enhancements** — Double-tap fullscreen (mobile), playback speed selector (0.5x–2x), keyboard shortcuts (Space/K=play, ←/→=seek 10s, F=fullscreen, M=mute, ↑/↓=volume), progress tracking every 5s to backend, resumeAt prop
3. **Browse Page** — `/browse` with genre checkboxes sidebar, type filter (All/Movies/Series), infinite scroll
4. **Staff Page** — `/staff?name=<name>` with AI-generated bio (xwolf Claude API), infinite scroll of works
5. **Profile Page** — `/profile` with 6 tabs: Watch History, My List, Search History, My Room, Settings, Stats
6. **RoomPlayer Page** — `/room/:id` fullscreen immersive player with tap-to-show controls, viewer request panel, socket.io live sync
7. **UserProfile Page** — `/user/:username` showing public profile + active room join button
8. **Social Sharing** — X, Facebook, WhatsApp, Copy Link buttons on MovieDetail
9. **OG Meta Tags** — Dynamic Open Graph + Twitter Card meta tags on MovieDetail
10. **Series AI Detection** — TVMaze first → xwolf Claude fallback → defaults for TV season/episode info
11. **Animated Neon Cycling** — `@keyframes neon-cycle` and `neon-border-cycle` CSS animations in index.css
12. **Watch History + Watchlist** — Full CRUD with backend SQLite, displayed in Profile tabs
13. **Star Ratings** — 5-star rating component on MovieDetail, persisted to backend
14. **Real-time Rooms with Socket.io** — Full room system: play/queue/idle/close events, request panel, host management
15. **Continue Watching** — Resume progress from history page (`?resume=<seconds>` param), VideoPlayer resumes at saved position

### Backend (`artifacts/api-server`)
- Express 5 + TypeScript + esbuild
- SQLite via better-sqlite3 (WAL mode), DB at `artifacts/api-server/foxystream.db`
- Socket.io server at path `/api/socket.io`
- JWT auth (`SESSION_SECRET` env var)
- Routes: `/api/auth`, `/api/user`, `/api/rooms`

### Routing
- Replit proxy: `/api/*` → api-server (port 8080), `/*` → foxy-stream (port 22353)
- No Vite proxy needed; frontend calls `/api/...` directly

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: SQLite (better-sqlite3)
- **Auth**: JWT (jsonwebtoken + bcryptjs)
- **Real-time**: Socket.io 4.x
- **Build**: esbuild (via build.mjs)

## Key Commands

```bash
# Start all workflows
pnpm --filter @workspace/api-server run dev
pnpm --filter @workspace/foxy-stream run dev

# Build API server
pnpm --filter @workspace/api-server run build
```

## Environment Variables

- `SESSION_SECRET` — JWT signing secret (required)
- `PORT` — Server port (auto-assigned by Replit)
