import { Router } from "express";
import db from "../lib/db.js";
import { authMiddleware, optionalAuth } from "../lib/auth.js";
import { addToQueue, playNow, startPlaying, closeRoom, buildStreamUrl } from "../lib/roomTimer.js";
import type { Request, Response } from "express";
import type { JwtPayload } from "../lib/auth.js";

const router = Router();

const getUser = (req: Request): JwtPayload | null =>
  (req as Request & { user?: JwtPayload }).user ?? null;

const parseJSON = <T>(s: string | null | undefined, fallback: T): T => {
  try { return JSON.parse(s ?? "") as T; } catch { return fallback; }
};

// ── List rooms ───────────────────────────────────────────────────────────────
router.get("/", optionalAuth, (req: Request, res: Response): void => {
  const { status, search } = req.query as { status?: string; search?: string };
  let query = `SELECT r.id, r.name, r.status, r.current_item, r.idle_until,
    u.username as host_username
    FROM rooms r JOIN users u ON u.id = r.host_id
    WHERE r.status IN ('playing','idle')`;
  const params: (string | number)[] = [];

  if (status === "playing") {
    query = query.replace("IN ('playing','idle')", "= 'playing'");
  } else if (status === "idle") {
    query = query.replace("IN ('playing','idle')", "= 'idle'");
  }
  if (search) {
    query += ` AND r.name LIKE ?`;
    params.push(`%${search}%`);
  }

  const rooms = db.prepare(query).all(...params) as Array<{
    id: number; name: string; status: string;
    current_item: string | null; idle_until: number | null; host_username: string;
  }>;

  res.json(rooms.map(r => ({
    ...r,
    current_item: parseJSON(r.current_item, null),
  })));
});

// ── Get own room ─────────────────────────────────────────────────────────────
router.get("/mine", authMiddleware, (req: Request, res: Response): void => {
  const user = getUser(req)!;
  const room = db.prepare(`
    SELECT r.*, u.username as host_username FROM rooms r
    JOIN users u ON u.id = r.host_id WHERE r.host_id=?
  `).get(user.userId) as {
    id: number; name: string; password: string | null; status: string;
    current_item: string | null; queue: string; idle_until: number | null; host_username: string;
  } | undefined;
  if (!room) { res.status(404).json({ error: "Room not found" }); return; }
  res.json({
    ...room,
    current_item: parseJSON(room.current_item, null),
    queue: parseJSON(room.queue, []),
    hasPassword: !!room.password,
    password: undefined,
  });
});

// ── Get room by id ───────────────────────────────────────────────────────────
router.get("/:id", optionalAuth, (req: Request, res: Response): void => {
  const roomId = Number(req.params.id);
  const room = db.prepare(`
    SELECT r.id, r.name, r.password, r.status, r.current_item, r.queue, r.idle_until,
    u.username as host_username, u.id as host_id
    FROM rooms r JOIN users u ON u.id = r.host_id WHERE r.id=?
  `).get(roomId) as {
    id: number; name: string; password: string | null; status: string;
    current_item: string | null; queue: string; idle_until: number | null;
    host_username: string; host_id: number;
  } | undefined;
  if (!room) { res.status(404).json({ error: "Room not found" }); return; }

  const { password: pwd, ...roomData } = room;
  res.json({
    ...roomData,
    hasPassword: !!pwd,
    current_item: parseJSON(room.current_item, null),
    queue: parseJSON(room.queue, []),
  });
});

// ── Join room (password check) ───────────────────────────────────────────────
router.post("/:id/join", optionalAuth, (req: Request, res: Response): void => {
  const roomId = Number(req.params.id);
  const { password } = req.body;
  const room = db.prepare("SELECT id, password, status, current_item, queue, idle_until FROM rooms WHERE id=?").get(roomId) as
    | { id: number; password: string | null; status: string; current_item: string | null; queue: string; idle_until: number | null }
    | undefined;
  if (!room) { res.status(404).json({ error: "Room not found" }); return; }
  if (room.password && room.password !== password) {
    res.status(403).json({ error: "Wrong password" }); return;
  }
  res.json({
    joined: true,
    status: room.status,
    current_item: parseJSON(room.current_item, null),
    queue: parseJSON(room.queue, []),
    idleUntil: room.idle_until,
  });
});

// ── Update room settings ─────────────────────────────────────────────────────
router.patch("/mine", authMiddleware, (req: Request, res: Response): void => {
  const user = getUser(req)!;
  const { name, password } = req.body;
  if (!name?.trim()) { res.status(400).json({ error: "Name required" }); return; }
  db.prepare("UPDATE rooms SET name=?, password=?, updated_at=unixepoch() WHERE host_id=?").run(
    name.trim(), password || null, user.userId
  );
  res.json({ saved: true });
});

// ── Close room ───────────────────────────────────────────────────────────────
router.post("/mine/close", authMiddleware, (req: Request, res: Response): void => {
  const user = getUser(req)!;
  const room = db.prepare("SELECT id FROM rooms WHERE host_id=?").get(user.userId) as { id: number } | undefined;
  if (!room) { res.status(404).json({ error: "Room not found" }); return; }
  closeRoom(room.id);
  res.json({ closed: true });
});

// ── Send to room (play now or queue) ─────────────────────────────────────────
router.post("/mine/send", authMiddleware, (req: Request, res: Response): void => {
  const user = getUser(req)!;
  const { subjectId, title, subjectType, season, episode, resolution = "720", lang = "En",
    durationSeconds = 7200, cover, action = "queue" } = req.body;
  if (!subjectId || !title) { res.status(400).json({ error: "subjectId and title required" }); return; }

  const room = db.prepare("SELECT id, status FROM rooms WHERE host_id=?").get(user.userId) as
    | { id: number; status: string }
    | undefined;
  if (!room) { res.status(404).json({ error: "Room not found" }); return; }

  const item = { subjectId, title, subjectType: subjectType ?? 1, season, episode, resolution, lang, durationSeconds, cover };

  if (action === "now" || room.status === "closed" || room.status === "idle") {
    playNow(room.id, item);
    res.json({ playing: true });
  } else {
    addToQueue(room.id, item);
    res.json({ queued: true });
  }
});

// ── Queue management ─────────────────────────────────────────────────────────
router.delete("/mine/queue/:index", authMiddleware, (req: Request, res: Response): void => {
  const user = getUser(req)!;
  const index = Number(req.params.index);
  const room = db.prepare("SELECT id, queue FROM rooms WHERE host_id=?").get(user.userId) as
    | { id: number; queue: string }
    | undefined;
  if (!room) { res.status(404).json({ error: "Room not found" }); return; }
  const queue = parseJSON<unknown[]>(room.queue, []);
  queue.splice(index, 1);
  db.prepare("UPDATE rooms SET queue=? WHERE id=?").run(JSON.stringify(queue), room.id);
  res.json({ queue });
});

router.post("/mine/queue/reorder", authMiddleware, (req: Request, res: Response): void => {
  const user = getUser(req)!;
  const { from, to } = req.body;
  const room = db.prepare("SELECT id, queue FROM rooms WHERE host_id=?").get(user.userId) as
    | { id: number; queue: string }
    | undefined;
  if (!room) { res.status(404).json({ error: "Room not found" }); return; }
  const queue = parseJSON<unknown[]>(room.queue, []);
  const [item] = queue.splice(Number(from), 1);
  queue.splice(Number(to), 0, item);
  db.prepare("UPDATE rooms SET queue=? WHERE id=?").run(JSON.stringify(queue), room.id);
  res.json({ queue });
});

router.post("/mine/queue/play-now/:index", authMiddleware, (req: Request, res: Response): void => {
  const user = getUser(req)!;
  const index = Number(req.params.index);
  const room = db.prepare("SELECT id, queue, status FROM rooms WHERE host_id=?").get(user.userId) as
    | { id: number; queue: string; status: string }
    | undefined;
  if (!room) { res.status(404).json({ error: "Room not found" }); return; }
  const queue = parseJSON<Parameters<typeof startPlaying>[1][]>(room.queue, []);
  const [item] = queue.splice(index, 1);
  db.prepare("UPDATE rooms SET queue=? WHERE id=?").run(JSON.stringify(queue), room.id);
  startPlaying(room.id, item);
  res.json({ playing: true });
});

// ── Schedule ─────────────────────────────────────────────────────────────────
router.get("/mine/schedule", authMiddleware, (req: Request, res: Response): void => {
  const user = getUser(req)!;
  const room = db.prepare("SELECT id FROM rooms WHERE host_id=?").get(user.userId) as { id: number } | undefined;
  if (!room) { res.status(404).json({ error: "Room not found" }); return; }
  const items = db.prepare("SELECT * FROM room_schedule WHERE room_id=? AND status='pending' ORDER BY scheduled_time").all(room.id);
  res.json(items);
});

router.post("/mine/schedule", authMiddleware, (req: Request, res: Response): void => {
  const user = getUser(req)!;
  const { subjectId, title, subjectType, season, episode, resolution = "720", lang = "En", scheduledTime } = req.body;
  if (!subjectId || !title || !scheduledTime) {
    res.status(400).json({ error: "subjectId, title, scheduledTime required" }); return;
  }
  const room = db.prepare("SELECT id FROM rooms WHERE host_id=?").get(user.userId) as { id: number } | undefined;
  if (!room) { res.status(404).json({ error: "Room not found" }); return; }
  db.prepare(`
    INSERT INTO room_schedule (room_id, subject_id, title, subject_type, season, episode, resolution, lang, scheduled_time)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(room.id, subjectId, title, subjectType ?? 1, season ?? null, episode ?? null, resolution, lang, Math.floor(new Date(scheduledTime).getTime() / 1000));
  res.json({ scheduled: true });
});

router.delete("/mine/schedule/:id", authMiddleware, (req: Request, res: Response): void => {
  const user = getUser(req)!;
  const room = db.prepare("SELECT id FROM rooms WHERE host_id=?").get(user.userId) as { id: number } | undefined;
  if (!room) { res.status(404).json({ error: "Room not found" }); return; }
  db.prepare("UPDATE room_schedule SET status='cancelled' WHERE id=? AND room_id=?").run(req.params.id, room.id);
  res.json({ cancelled: true });
});

// ── Viewer requests ───────────────────────────────────────────────────────────
router.get("/:id/requests", authMiddleware, (req: Request, res: Response): void => {
  const user = getUser(req)!;
  const roomId = Number(req.params.id);
  const room = db.prepare("SELECT host_id FROM rooms WHERE id=?").get(roomId) as { host_id: number } | undefined;
  if (!room || room.host_id !== user.userId) { res.status(403).json({ error: "Forbidden" }); return; }
  const requests = db.prepare("SELECT * FROM room_requests WHERE room_id=? AND status='pending' ORDER BY created_at").all(roomId);
  res.json(requests);
});

router.post("/:id/request", optionalAuth, (req: Request, res: Response): void => {
  const roomId = Number(req.params.id);
  const user = getUser(req);
  const { subjectId, title, subjectType, season, episode } = req.body;
  if (!subjectId || !title) { res.status(400).json({ error: "subjectId and title required" }); return; }
  const room = db.prepare("SELECT id, host_id FROM rooms WHERE id=? AND status IN ('playing','idle')").get(roomId) as
    | { id: number; host_id: number }
    | undefined;
  if (!room) { res.status(404).json({ error: "Room not found or not active" }); return; }
  db.prepare(`
    INSERT INTO room_requests (room_id, viewer_id, viewer_name, subject_id, title, subject_type, season, episode)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(roomId, user?.userId ?? null, user?.username ?? "Guest", subjectId, title, subjectType ?? 1, season ?? null, episode ?? null);
  res.json({ sent: true });
});

router.post("/:id/requests/:reqId/approve", authMiddleware, (req: Request, res: Response): void => {
  const user = getUser(req)!;
  const { id: rid, reqId } = req.params;
  const room = db.prepare("SELECT id, host_id FROM rooms WHERE id=?").get(Number(rid)) as { id: number; host_id: number } | undefined;
  if (!room || room.host_id !== user.userId) { res.status(403).json({ error: "Forbidden" }); return; }
  const rq = db.prepare("SELECT * FROM room_requests WHERE id=? AND room_id=?").get(reqId, rid) as
    | { subject_id: string; title: string; subject_type: number; season: number | null; episode: number | null }
    | undefined;
  if (!rq) { res.status(404).json({ error: "Request not found" }); return; }
  addToQueue(room.id, {
    subjectId: rq.subject_id, title: rq.title, subjectType: rq.subject_type,
    season: rq.season ?? undefined, episode: rq.episode ?? undefined,
    resolution: "720", lang: "En",
  });
  db.prepare("UPDATE room_requests SET status='approved' WHERE id=?").run(reqId);
  res.json({ approved: true });
});

router.delete("/:id/requests/:reqId", authMiddleware, (req: Request, res: Response): void => {
  db.prepare("UPDATE room_requests SET status='ignored' WHERE id=?").run(req.params.reqId);
  res.json({ ignored: true });
});

// Build stream URL helper (for viewer to get current stream)
router.get("/:id/stream", optionalAuth, (req: Request, res: Response): void => {
  const roomId = Number(req.params.id);
  const room = db.prepare("SELECT current_item FROM rooms WHERE id=?").get(roomId) as { current_item: string | null } | undefined;
  if (!room?.current_item) { res.status(404).json({ error: "Nothing playing" }); return; }
  const item = parseJSON<{ subjectId: string; resolution: string; lang: string; season?: number; episode?: number; startedAt: number; durationSeconds: number }>(room.current_item, null as unknown as { subjectId: string; resolution: string; lang: string; season?: number; episode?: number; startedAt: number; durationSeconds: number });
  const streamUrl = buildStreamUrl(item);
  const elapsed = (Date.now() - (item.startedAt ?? 0)) / 1000;
  res.json({ streamUrl, startedAt: item.startedAt, elapsed, durationSeconds: item.durationSeconds });
});

export default router;
