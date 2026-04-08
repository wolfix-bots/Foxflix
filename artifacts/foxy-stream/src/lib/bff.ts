const BASE = "/api";

async function request<T>(
  path: string,
  options: RequestInit = {},
  token?: string | null
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, { ...options, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(err.error || "Request failed");
  }
  return res.json() as Promise<T>;
}

export interface AuthResponse {
  token: string;
  username: string;
  userId: number;
}

export const bff = {
  auth: {
    register: (username: string, password: string) =>
      request<AuthResponse>("/auth/register", { method: "POST", body: JSON.stringify({ username, password }) }),
    login: (username: string, password: string) =>
      request<AuthResponse>("/auth/login", { method: "POST", body: JSON.stringify({ username, password }) }),
    me: (token: string) =>
      request<{ username: string; userId: number; plabackSpeed: number }>("/auth/me", {}, token),
  },

  user: {
    getWatchlist: (token: string) =>
      request<WatchlistItem[]>("/user/watchlist", {}, token),
    addToWatchlist: (token: string, item: Partial<WatchlistItem>) =>
      request<{ added: boolean; watchlist: WatchlistItem[] }>("/user/watchlist", { method: "POST", body: JSON.stringify(item) }, token),
    removeFromWatchlist: (token: string, subjectId: string) =>
      request<{ removed: boolean }>(`/user/watchlist/${subjectId}`, { method: "DELETE" }, token),

    getHistory: (token: string) =>
      request<HistoryItem[]>("/user/history", {}, token),
    saveProgress: (token: string, data: Partial<HistoryItem>) =>
      request<{ saved: boolean }>("/user/progress", { method: "POST", body: JSON.stringify(data) }, token),

    getRatings: (token: string) =>
      request<Record<string, number>>("/user/ratings", {}, token),
    saveRating: (token: string, subjectId: string, rating: number) =>
      request<{ saved: boolean }>("/user/ratings", { method: "POST", body: JSON.stringify({ subjectId, rating }) }, token),

    getSearchHistory: (token: string) =>
      request<string[]>("/user/search-history", {}, token),
    saveSearch: (token: string, query: string) =>
      request<{ saved: boolean }>("/user/search-history", { method: "POST", body: JSON.stringify({ query }) }, token),
    deleteSearch: (token: string, query: string) =>
      request<{ removed: boolean }>(`/user/search-history/${encodeURIComponent(query)}`, { method: "DELETE" }, token),

    getSpeed: (token: string) =>
      request<{ speed: number }>("/user/speed", {}, token),
    saveSpeed: (token: string, speed: number) =>
      request<{ saved: boolean; speed: number }>("/user/speed", { method: "POST", body: JSON.stringify({ speed }) }, token),

    getStats: (token: string) =>
      request<{ totalWatchTime: number; completedCount: number; watchlistCount: number }>("/user/stats", {}, token),

    getPublicProfile: (username: string) =>
      request<{ userId: number; username: string; createdAt: number; room: { id: number; name: string; status: string } | null }>(`/user/public/${username}`),
  },

  rooms: {
    list: (params?: { status?: string; search?: string }) => {
      const qs = new URLSearchParams(params as Record<string, string>).toString();
      return request<RoomSummary[]>(`/rooms${qs ? `?${qs}` : ""}`);
    },
    getMine: (token: string) =>
      request<RoomDetail>("/rooms/mine", {}, token),
    getById: (id: number, token?: string) =>
      request<RoomDetail>(`/rooms/${id}`, {}, token),
    join: (id: number, password?: string) =>
      request<{ joined: boolean; status: string; current_item: unknown; queue: unknown[]; idleUntil: number }>(`/rooms/${id}/join`, { method: "POST", body: JSON.stringify({ password }) }),
    updateMine: (token: string, name: string, password?: string) =>
      request<{ saved: boolean }>("/rooms/mine", { method: "PATCH", body: JSON.stringify({ name, password }) }, token),
    close: (token: string) =>
      request<{ closed: boolean }>("/rooms/mine/close", { method: "POST" }, token),
    send: (token: string, data: SendToRoomData) =>
      request<{ playing?: boolean; queued?: boolean }>("/rooms/mine/send", { method: "POST", body: JSON.stringify(data) }, token),
    removeFromQueue: (token: string, index: number) =>
      request<{ queue: unknown[] }>(`/rooms/mine/queue/${index}`, { method: "DELETE" }, token),
    reorderQueue: (token: string, from: number, to: number) =>
      request<{ queue: unknown[] }>("/rooms/mine/queue/reorder", { method: "POST", body: JSON.stringify({ from, to }) }, token),
    playQueueItem: (token: string, index: number) =>
      request<{ playing: boolean }>(`/rooms/mine/queue/play-now/${index}`, { method: "POST" }, token),
    getSchedule: (token: string) =>
      request<ScheduleItem[]>("/rooms/mine/schedule", {}, token),
    addSchedule: (token: string, data: ScheduleData) =>
      request<{ scheduled: boolean }>("/rooms/mine/schedule", { method: "POST", body: JSON.stringify(data) }, token),
    deleteSchedule: (token: string, id: number) =>
      request<{ cancelled: boolean }>(`/rooms/mine/schedule/${id}`, { method: "DELETE" }, token),
    getRequests: (token: string, roomId: number) =>
      request<RoomRequest[]>(`/rooms/${roomId}/requests`, {}, token),
    sendRequest: (roomId: number, data: Partial<RoomRequest>) =>
      request<{ sent: boolean }>(`/rooms/${roomId}/request`, { method: "POST", body: JSON.stringify(data) }),
    approveRequest: (token: string, roomId: number, reqId: number) =>
      request<{ approved: boolean }>(`/rooms/${roomId}/requests/${reqId}/approve`, { method: "POST" }, token),
    ignoreRequest: (token: string, roomId: number, reqId: number) =>
      request<{ ignored: boolean }>(`/rooms/${roomId}/requests/${reqId}`, { method: "DELETE" }, token),
    getStream: (roomId: number) =>
      request<{ streamUrl: string; startedAt: number; elapsed: number; durationSeconds: number }>(`/rooms/${roomId}/stream`),
  },
};

export interface WatchlistItem {
  subjectId: string;
  title: string;
  cover: string;
  subjectType: number;
}

export interface HistoryItem {
  subjectId: string;
  title: string;
  cover: string;
  subjectType: number;
  progressSeconds: number;
  duration: number;
  season?: number;
  episode?: number;
  lastWatched: number;
}

export interface RoomSummary {
  id: number;
  name: string;
  status: string;
  current_item: Record<string, unknown> | null;
  idle_until: number | null;
  host_username: string;
}

export interface RoomDetail {
  id: number;
  name: string;
  status: string;
  hasPassword: boolean;
  current_item: Record<string, unknown> | null;
  queue: Record<string, unknown>[];
  idle_until: number | null;
  host_username: string;
  host_id?: number;
}

export interface SendToRoomData {
  subjectId: string;
  title: string;
  subjectType?: number;
  season?: number;
  episode?: number;
  resolution?: string;
  lang?: string;
  durationSeconds?: number;
  cover?: string;
  action?: "now" | "queue";
}

export interface ScheduleItem {
  id: number;
  room_id: number;
  subject_id: string;
  title: string;
  scheduled_time: number;
  resolution: string;
  lang: string;
}

export interface ScheduleData {
  subjectId: string;
  title: string;
  subjectType?: number;
  season?: number;
  episode?: number;
  resolution?: string;
  lang?: string;
  scheduledTime: string;
}

export interface RoomRequest {
  id: number;
  room_id: number;
  viewer_name: string;
  subject_id: string;
  title: string;
  subject_type: number;
  season?: number;
  episode?: number;
  status: string;
}
