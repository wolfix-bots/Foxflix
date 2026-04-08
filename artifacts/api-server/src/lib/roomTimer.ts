import db from "./db.js";
import type { Server as SocketServer } from "socket.io";

interface QueueItem {
  subjectId: string;
  title: string;
  subjectType: number;
  season?: number;
  episode?: number;
  resolution: string;
  lang: string;
  durationSeconds?: number;
  cover?: string;
}

const parseJSON = <T>(s: string | null | undefined, fallback: T): T => {
  try { return JSON.parse(s ?? "") as T; } catch { return fallback; }
};

// timers keyed by roomId
const videoTimers = new Map<number, ReturnType<typeof setTimeout>>();
const idleTimers = new Map<number, ReturnType<typeof setTimeout>>();
const scheduleTimer: ReturnType<typeof setInterval> | null = null;

let _io: SocketServer | null = null;

export function setIo(io: SocketServer) {
  _io = io;
}

function emit(roomId: number, event: string, data: unknown) {
  _io?.to(`room:${roomId}`).emit(event, data);
}

export function buildStreamUrl(item: QueueItem): string {
  const base = "https://movieapi.xcasper.space/api/bff/stream";
  let url = `${base}?subjectId=${item.subjectId}&resolution=${item.resolution}&lang=${item.lang}`;
  if (item.season != null && item.episode != null) {
    url += `&se=${item.season}&ep=${item.episode}`;
  }
  return url;
}

export function startPlaying(roomId: number, item: QueueItem) {
  clearTimeout(videoTimers.get(roomId));
  clearTimeout(idleTimers.get(roomId));
  videoTimers.delete(roomId);
  idleTimers.delete(roomId);

  const streamUrl = buildStreamUrl(item);
  const startedAt = Date.now();

  db.prepare(`
    UPDATE rooms SET status='playing', current_item=?, idle_until=NULL, updated_at=unixepoch()
    WHERE id=?
  `).run(JSON.stringify({ ...item, streamUrl, startedAt }), roomId);

  emit(roomId, "play", { item: { ...item, streamUrl }, startedAt });

  // Schedule end-of-video timer
  const durationMs = (item.durationSeconds ?? 7200) * 1000;
  const timer = setTimeout(() => onVideoEnd(roomId), durationMs);
  videoTimers.set(roomId, timer);
}

function onVideoEnd(roomId: number) {
  videoTimers.delete(roomId);
  const room = db.prepare("SELECT queue FROM rooms WHERE id=?").get(roomId) as { queue: string } | undefined;
  if (!room) return;

  const queue: QueueItem[] = parseJSON(room.queue, []);
  if (queue.length > 0) {
    const next = queue.shift()!;
    db.prepare("UPDATE rooms SET queue=? WHERE id=?").run(JSON.stringify(queue), roomId);
    startPlaying(roomId, next);
  } else {
    startIdle(roomId);
  }
}

export function startIdle(roomId: number) {
  clearTimeout(idleTimers.get(roomId));
  const idleUntil = Date.now() + 30 * 60 * 1000;

  db.prepare(`
    UPDATE rooms SET status='idle', current_item=NULL, idle_until=?, updated_at=unixepoch()
    WHERE id=?
  `).run(idleUntil, roomId);

  emit(roomId, "idle", { idleUntil });

  const timer = setTimeout(() => closeRoom(roomId), 30 * 60 * 1000);
  idleTimers.set(roomId, timer);
}

export function closeRoom(roomId: number) {
  clearTimeout(videoTimers.get(roomId));
  clearTimeout(idleTimers.get(roomId));
  videoTimers.delete(roomId);
  idleTimers.delete(roomId);

  db.prepare("UPDATE rooms SET status='closed', current_item=NULL, idle_until=NULL, updated_at=unixepoch() WHERE id=?").run(roomId);
  emit(roomId, "closed", {});
}

export function addToQueue(roomId: number, item: QueueItem) {
  const room = db.prepare("SELECT status, queue FROM rooms WHERE id=?").get(roomId) as
    | { status: string; queue: string }
    | undefined;
  if (!room) return;

  const queue: QueueItem[] = parseJSON(room.queue, []);
  queue.push(item);
  db.prepare("UPDATE rooms SET queue=?, updated_at=unixepoch() WHERE id=?").run(JSON.stringify(queue), roomId);
  emit(roomId, "queue_updated", { queue });

  if (room.status === "closed" || room.status === "idle") {
    startPlaying(roomId, queue.shift()!);
    db.prepare("UPDATE rooms SET queue=? WHERE id=?").run(JSON.stringify(queue), roomId);
  }
}

export function playNow(roomId: number, item: QueueItem) {
  // Move remaining queue back
  startPlaying(roomId, item);
}

// Restore timers on server start
export function restoreTimers() {
  const rooms = db.prepare("SELECT id, status, current_item, idle_until FROM rooms WHERE status IN ('playing','idle')").all() as
    Array<{ id: number; status: string; current_item: string | null; idle_until: number | null }>;

  for (const room of rooms) {
    if (room.status === "playing" && room.current_item) {
      const item = parseJSON<QueueItem & { startedAt: number; durationSeconds: number }>(room.current_item, null as unknown as QueueItem & { startedAt: number; durationSeconds: number });
      if (!item) continue;
      const elapsed = Date.now() - (item.startedAt ?? 0);
      const remaining = ((item.durationSeconds ?? 7200) * 1000) - elapsed;
      if (remaining > 0) {
        const timer = setTimeout(() => onVideoEnd(room.id), remaining);
        videoTimers.set(room.id, timer);
      } else {
        onVideoEnd(room.id);
      }
    } else if (room.status === "idle" && room.idle_until) {
      const remaining = room.idle_until - Date.now();
      if (remaining > 0) {
        const timer = setTimeout(() => closeRoom(room.id), remaining);
        idleTimers.set(room.id, timer);
      } else {
        closeRoom(room.id);
      }
    }
  }
}

// Schedule checker — runs every minute
export function startScheduleChecker() {
  setInterval(() => {
    const now = Math.floor(Date.now() / 1000);
    const pending = db.prepare(`
      SELECT rs.*, r.host_id FROM room_schedule rs
      JOIN rooms r ON r.id = rs.room_id
      WHERE rs.status='pending' AND rs.scheduled_time <= ?
    `).all(now) as Array<{
      id: number; room_id: number; subject_id: string; title: string;
      subject_type: number; season: number | null; episode: number | null;
      resolution: string; lang: string;
    }>;

    for (const item of pending) {
      const queueItem: QueueItem = {
        subjectId: item.subject_id,
        title: item.title,
        subjectType: item.subject_type,
        season: item.season ?? undefined,
        episode: item.episode ?? undefined,
        resolution: item.resolution,
        lang: item.lang,
      };
      addToQueue(item.room_id, queueItem);
      db.prepare("UPDATE room_schedule SET status='triggered' WHERE id=?").run(item.id);
      emit(item.room_id, "notification", { message: `Scheduled item "${item.title}" has been added to the queue` });
    }
  }, 60 * 1000);
}

export { scheduleTimer };
