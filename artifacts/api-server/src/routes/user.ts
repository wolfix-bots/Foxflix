import { Router } from "express";
import db from "../lib/db.js";
import { authMiddleware } from "../lib/auth.js";
import type { Request, Response } from "express";
import type { JwtPayload } from "../lib/auth.js";

const router = Router();
router.use(authMiddleware);

const getUser = (req: Request) => (req as Request & { user: JwtPayload }).user;

const parseJSON = <T>(s: string, fallback: T): T => {
  try { return JSON.parse(s) as T; } catch { return fallback; }
};

// ── Watchlist ────────────────────────────────────────────────────────────────
router.get("/watchlist", (req: Request, res: Response): void => {
  const { userId } = getUser(req);
  const row = db.prepare("SELECT watchlist FROM users WHERE id = ?").get(userId) as { watchlist: string } | undefined;
  res.json(parseJSON(row?.watchlist ?? "[]", []));
});

router.post("/watchlist", (req: Request, res: Response): void => {
  const { userId } = getUser(req);
  const { subjectId, title, cover, subjectType } = req.body;
  if (!subjectId) { res.status(400).json({ error: "subjectId required" }); return; }
  const row = db.prepare("SELECT watchlist FROM users WHERE id = ?").get(userId) as { watchlist: string };
  const list: { subjectId: string; title: string; cover: string; subjectType: number }[] = parseJSON(row.watchlist, []);
  const exists = list.some(m => m.subjectId === subjectId);
  if (!exists) {
    list.unshift({ subjectId, title, cover, subjectType });
    db.prepare("UPDATE users SET watchlist = ? WHERE id = ?").run(JSON.stringify(list), userId);
  }
  res.json({ added: !exists, watchlist: list });
});

router.delete("/watchlist/:subjectId", (req: Request, res: Response): void => {
  const { userId } = getUser(req);
  const { subjectId } = req.params;
  const row = db.prepare("SELECT watchlist FROM users WHERE id = ?").get(userId) as { watchlist: string };
  const list = parseJSON<{ subjectId: string }[]>(row.watchlist, []).filter(m => m.subjectId !== subjectId);
  db.prepare("UPDATE users SET watchlist = ? WHERE id = ?").run(JSON.stringify(list), userId);
  res.json({ removed: true, watchlist: list });
});

// ── Watch History ────────────────────────────────────────────────────────────
router.get("/history", (req: Request, res: Response): void => {
  const { userId } = getUser(req);
  const row = db.prepare("SELECT watch_history FROM users WHERE id = ?").get(userId) as { watch_history: string };
  res.json(parseJSON(row?.watch_history ?? "[]", []));
});

router.post("/progress", (req: Request, res: Response): void => {
  const { userId } = getUser(req);
  const { subjectId, title, cover, subjectType, progressSeconds, duration, season, episode } = req.body;
  if (!subjectId) { res.status(400).json({ error: "subjectId required" }); return; }
  const row = db.prepare("SELECT watch_history FROM users WHERE id = ?").get(userId) as { watch_history: string };
  const history: {
    subjectId: string; title: string; cover: string; subjectType: number;
    progressSeconds: number; duration: number; season?: number; episode?: number; lastWatched: number;
  }[] = parseJSON(row.watch_history, []);
  const idx = history.findIndex(h => h.subjectId === subjectId && h.season === season && h.episode === episode);
  const entry = { subjectId, title, cover, subjectType, progressSeconds, duration, season, episode, lastWatched: Date.now() };
  if (idx >= 0) history[idx] = entry;
  else history.unshift(entry);
  // Keep last 100
  if (history.length > 100) history.splice(100);
  db.prepare("UPDATE users SET watch_history = ? WHERE id = ?").run(JSON.stringify(history), userId);
  res.json({ saved: true });
});

// ── Ratings ──────────────────────────────────────────────────────────────────
router.get("/ratings", (req: Request, res: Response): void => {
  const { userId } = getUser(req);
  const row = db.prepare("SELECT ratings FROM users WHERE id = ?").get(userId) as { ratings: string };
  res.json(parseJSON(row?.ratings ?? "{}", {}));
});

router.post("/ratings", (req: Request, res: Response): void => {
  const { userId } = getUser(req);
  const { subjectId, rating } = req.body;
  if (!subjectId || !rating) { res.status(400).json({ error: "subjectId and rating required" }); return; }
  const row = db.prepare("SELECT ratings FROM users WHERE id = ?").get(userId) as { ratings: string };
  const ratings: Record<string, number> = parseJSON(row.ratings, {});
  ratings[subjectId] = Number(rating);
  db.prepare("UPDATE users SET ratings = ? WHERE id = ?").run(JSON.stringify(ratings), userId);
  res.json({ saved: true });
});

// ── Search History ───────────────────────────────────────────────────────────
router.get("/search-history", (req: Request, res: Response): void => {
  const { userId } = getUser(req);
  const row = db.prepare("SELECT search_history FROM users WHERE id = ?").get(userId) as { search_history: string };
  res.json(parseJSON(row?.search_history ?? "[]", []));
});

router.post("/search-history", (req: Request, res: Response): void => {
  const { userId } = getUser(req);
  const { query } = req.body;
  if (!query?.trim()) { res.status(400).json({ error: "query required" }); return; }
  const row = db.prepare("SELECT search_history FROM users WHERE id = ?").get(userId) as { search_history: string };
  let history: string[] = parseJSON(row.search_history, []);
  history = [query, ...history.filter(q => q !== query)].slice(0, 30);
  db.prepare("UPDATE users SET search_history = ? WHERE id = ?").run(JSON.stringify(history), userId);
  res.json({ saved: true });
});

router.delete("/search-history/:query", (req: Request, res: Response): void => {
  const { userId } = getUser(req);
  const query = decodeURIComponent(req.params.query);
  const row = db.prepare("SELECT search_history FROM users WHERE id = ?").get(userId) as { search_history: string };
  const history = parseJSON<string[]>(row.search_history, []).filter(q => q !== query);
  db.prepare("UPDATE users SET search_history = ? WHERE id = ?").run(JSON.stringify(history), userId);
  res.json({ removed: true });
});

// ── Playback Speed ───────────────────────────────────────────────────────────
router.post("/speed", (req: Request, res: Response): void => {
  const { userId } = getUser(req);
  const { speed } = req.body;
  const s = parseFloat(speed);
  if (isNaN(s) || s < 0.25 || s > 3) { res.status(400).json({ error: "Invalid speed" }); return; }
  db.prepare("UPDATE users SET playback_speed = ? WHERE id = ?").run(s, userId);
  res.json({ saved: true, speed: s });
});

router.get("/speed", (req: Request, res: Response): void => {
  const { userId } = getUser(req);
  const row = db.prepare("SELECT playback_speed FROM users WHERE id = ?").get(userId) as { playback_speed: number };
  res.json({ speed: row?.playback_speed ?? 1.0 });
});

// ── Stats ────────────────────────────────────────────────────────────────────
router.get("/stats", (req: Request, res: Response): void => {
  const { userId } = getUser(req);
  const row = db.prepare("SELECT watch_history, watchlist FROM users WHERE id = ?").get(userId) as
    | { watch_history: string; watchlist: string }
    | undefined;
  if (!row) { res.json({ totalWatchTime: 0, completedCount: 0, watchlistCount: 0 }); return; }
  const history = parseJSON<{ progressSeconds: number; duration: number }[]>(row.watch_history, []);
  const totalWatchTime = history.reduce((sum, h) => sum + (h.progressSeconds || 0), 0);
  const completedCount = history.filter(h => h.duration > 0 && h.progressSeconds >= h.duration - 30).length;
  const watchlistCount = parseJSON<unknown[]>(row.watchlist, []).length;
  res.json({ totalWatchTime, completedCount, watchlistCount });
});

// ── Public profile ───────────────────────────────────────────────────────────
router.get("/public/:username", (req: Request, res: Response): void => {
  const { username } = req.params;
  const user = db.prepare("SELECT id, username, created_at FROM users WHERE username = ?").get(username) as
    | { id: number; username: string; created_at: number }
    | undefined;
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  const room = db.prepare("SELECT id, name, status, current_item FROM rooms WHERE host_id = ?").get(user.id) as
    | { id: number; name: string; status: string; current_item: string | null }
    | undefined;
  res.json({
    userId: user.id, username: user.username, createdAt: user.created_at,
    room: room ? { id: room.id, name: room.name, status: room.status } : null,
  });
});

export default router;
