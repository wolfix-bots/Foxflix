import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  History, Bookmark, Search, Settings, BarChart2, Tv, Play, Trash2,
  RotateCcw, Loader2, AlertCircle, User, Lock, Plus, X, ChevronUp, ChevronDown,
} from "lucide-react";
import { bff } from "@/lib/bff";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import MovieCard from "@/components/MovieCard";
import { toast } from "sonner";
import type { HistoryItem, WatchlistItem, ScheduleItem, RoomDetail, RoomRequest } from "@/lib/bff";
import type { MovieSubject } from "@/lib/api";

const TABS = [
  { key: "history", label: "HISTORY", icon: History },
  { key: "watchlist", label: "MY LIST", icon: Bookmark },
  { key: "searches", label: "SEARCHES", icon: Search },
  { key: "room", label: "MY ROOM", icon: Tv },
  { key: "settings", label: "SETTINGS", icon: Settings },
  { key: "stats", label: "STATS", icon: BarChart2 },
] as const;

type TabKey = typeof TABS[number]["key"];

const formatSeconds = (s: number) => {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};
const formatTime = (s: number) => {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = Math.floor(s % 60);
  return `${h > 0 ? h + ":" : ""}${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
};

export default function Profile() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [tab, setTab] = useState<TabKey>("history");
  const [newPassword, setNewPassword] = useState("");
  const [roomName, setRoomName] = useState("");
  const [roomPassword, setRoomPassword] = useState("");
  const [savingRoom, setSavingRoom] = useState(false);

  useEffect(() => {
    if (!user) navigate("/");
  }, [user, navigate]);

  const { data: history = [] } = useQuery<HistoryItem[]>({
    queryKey: ["history", user?.userId],
    queryFn: () => bff.user.getHistory(user!.token),
    enabled: !!user && tab === "history",
  });

  const { data: watchlist = [] } = useQuery<WatchlistItem[]>({
    queryKey: ["watchlist", user?.userId],
    queryFn: () => bff.user.getWatchlist(user!.token),
    enabled: !!user && tab === "watchlist",
  });

  const { data: searches = [] } = useQuery<string[]>({
    queryKey: ["search-history", user?.userId],
    queryFn: () => bff.user.getSearchHistory(user!.token),
    enabled: !!user && tab === "searches",
  });

  const { data: stats } = useQuery({
    queryKey: ["stats", user?.userId],
    queryFn: () => bff.user.getStats(user!.token),
    enabled: !!user && tab === "stats",
  });

  const { data: room, refetch: refetchRoom } = useQuery<RoomDetail>({
    queryKey: ["my-room", user?.userId],
    queryFn: () => bff.rooms.getMine(user!.token),
    enabled: !!user && tab === "room",
  });

  const { data: schedule = [] } = useQuery<ScheduleItem[]>({
    queryKey: ["room-schedule", user?.userId],
    queryFn: () => bff.rooms.getSchedule(user!.token),
    enabled: !!user && tab === "room",
  });

  const { data: requests = [] } = useQuery<RoomRequest[]>({
    queryKey: ["room-requests", user?.userId, room?.id],
    queryFn: () => bff.rooms.getRequests(user!.token, room!.id),
    enabled: !!user && !!room && tab === "room",
    refetchInterval: 10000,
  });

  useEffect(() => {
    if (room) {
      setRoomName(room.name);
    }
  }, [room]);

  if (!user) return null;

  const removeWatchlist = async (subjectId: string) => {
    await bff.user.removeFromWatchlist(user.token, subjectId);
    qc.invalidateQueries({ queryKey: ["watchlist"] });
    toast.success("Removed from My List");
  };

  const deleteSearch = async (q: string) => {
    await bff.user.deleteSearch(user.token, q);
    qc.invalidateQueries({ queryKey: ["search-history"] });
  };

  const saveRoom = async () => {
    setSavingRoom(true);
    try {
      await bff.rooms.updateMine(user.token, roomName, roomPassword || undefined);
      toast.success("Room settings saved");
      refetchRoom();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to save");
    }
    setSavingRoom(false);
  };

  const closeRoom = async () => {
    try {
      await bff.rooms.close(user.token);
      toast.success("Room closed");
      refetchRoom();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  };

  const approveRequest = async (reqId: number) => {
    if (!room) return;
    await bff.rooms.approveRequest(user.token, room.id, reqId);
    toast.success("Request approved");
    qc.invalidateQueries({ queryKey: ["room-requests"] });
  };

  const ignoreRequest = async (reqId: number) => {
    if (!room) return;
    await bff.rooms.ignoreRequest(user.token, room.id, reqId);
    qc.invalidateQueries({ queryKey: ["room-requests"] });
  };

  const removeQueueItem = async (index: number) => {
    await bff.rooms.removeFromQueue(user.token, index);
    refetchRoom();
  };

  const reorderQueue = async (from: number, to: number) => {
    if (to < 0 || to >= (room?.queue.length ?? 0)) return;
    await bff.rooms.reorderQueue(user.token, from, to);
    refetchRoom();
  };

  const playQueueItem = async (index: number) => {
    await bff.rooms.playQueueItem(user.token, index);
    refetchRoom();
    toast.success("Now playing!");
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <div className="w-16 h-16 rounded-full bg-dark-elevated border-2 border-neon-cyan/30 flex items-center justify-center">
            <User className="w-8 h-8 text-neon-cyan" />
          </div>
          <div>
            <h1 className="font-display text-xl font-black text-foreground">{user.username.toUpperCase()}</h1>
            <p className="text-xs text-muted-foreground font-body mt-0.5">Member since always</p>
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 overflow-x-auto hide-scrollbar border-b border-border mb-8">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => setTab(key)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-display tracking-wider whitespace-nowrap border-b-2 transition-all ${
                tab === key ? "border-neon-cyan text-neon-cyan" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}>
              <Icon className="w-3.5 h-3.5" />{label}
            </button>
          ))}
        </div>

        {/* ── History ─────────────────────────────────────────────────── */}
        {tab === "history" && (
          <div className="space-y-3">
            {history.length === 0 ? (
              <div className="text-center py-12">
                <History className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                <p className="font-display text-xs text-muted-foreground">NO WATCH HISTORY</p>
              </div>
            ) : (
              history.map((item, i) => {
                const pct = item.duration > 0 ? Math.min(100, (item.progressSeconds / item.duration) * 100) : 0;
                const resume = () => navigate(`/movie/${item.subjectId}?resume=${Math.floor(item.progressSeconds)}&season=${item.season ?? ""}&ep=${item.episode ?? ""}`);
                return (
                  <div key={i} className="flex items-center gap-4 p-3 bg-dark-elevated border border-border rounded-sm hover:border-neon-cyan/20 transition-colors">
                    <img src={item.cover} alt={item.title} className="w-12 h-16 object-cover rounded-sm flex-shrink-0 border border-border" />
                    <div className="flex-1 min-w-0">
                      <p className="font-display text-sm text-foreground truncate">{item.title}</p>
                      {(item.season != null) && (
                        <p className="text-xs text-muted-foreground font-body">S{String(item.season).padStart(2,"0")}E{String(item.episode ?? 1).padStart(2,"0")}</p>
                      )}
                      <div className="flex items-center gap-2 mt-1.5">
                        <div className="flex-1 h-1 bg-border rounded-full overflow-hidden">
                          <div className="h-full bg-neon-cyan rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs text-muted-foreground font-display">{formatTime(item.progressSeconds)}</span>
                      </div>
                    </div>
                    {pct < 95 && (
                      <button onClick={resume}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs font-display border border-neon-cyan/30 text-neon-cyan rounded-sm hover:bg-neon-cyan/10 transition-colors flex-shrink-0">
                        <Play className="w-3 h-3 fill-current" />RESUME
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ── My List ─────────────────────────────────────────────────── */}
        {tab === "watchlist" && (
          <div>
            {watchlist.length === 0 ? (
              <div className="text-center py-12">
                <Bookmark className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                <p className="font-display text-xs text-muted-foreground">YOUR LIST IS EMPTY</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {watchlist.map((item) => (
                  <div key={item.subjectId} className="relative group">
                    <Link to={`/movie/${item.subjectId}`}>
                      <img src={item.cover} alt={item.title} className="w-full aspect-[2/3] object-cover rounded-sm border border-border" />
                      <p className="text-xs font-body text-muted-foreground mt-1 truncate">{item.title}</p>
                    </Link>
                    <button onClick={() => removeWatchlist(item.subjectId)}
                      className="absolute top-1 right-1 p-1 bg-black/70 rounded-sm text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Search History ───────────────────────────────────────────── */}
        {tab === "searches" && (
          <div className="space-y-2 max-w-xl">
            {searches.length === 0 ? (
              <div className="text-center py-12">
                <Search className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                <p className="font-display text-xs text-muted-foreground">NO SEARCH HISTORY</p>
              </div>
            ) : (
              searches.map((q, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-2.5 bg-dark-elevated border border-border rounded-sm hover:border-neon-cyan/20 transition-colors">
                  <Search className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                  <span className="flex-1 text-sm font-body text-foreground">{q}</span>
                  <Link to={`/search?q=${encodeURIComponent(q)}`}
                    className="flex items-center gap-1 text-xs font-display text-neon-cyan hover:underline">
                    <RotateCcw className="w-3 h-3" />SEARCH
                  </Link>
                  <button onClick={() => deleteSearch(q)} className="text-muted-foreground hover:text-destructive transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {/* ── My Room ──────────────────────────────────────────────────── */}
        {tab === "room" && (
          <div className="max-w-2xl space-y-6">
            {/* Settings */}
            <div className="bg-dark-elevated border border-border rounded-sm p-5 space-y-4">
              <h3 className="font-display text-xs tracking-widest text-neon-cyan">ROOM SETTINGS</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-display text-muted-foreground">ROOM NAME</label>
                  <input value={roomName} onChange={e => setRoomName(e.target.value)}
                    className="mt-1 w-full px-3 py-2 bg-background border border-border rounded-sm text-sm font-body text-foreground focus:border-neon-cyan focus:outline-none" />
                </div>
                <div>
                  <label className="text-xs font-display text-muted-foreground">PASSWORD (OPTIONAL)</label>
                  <input value={roomPassword} onChange={e => setRoomPassword(e.target.value)} type="password" placeholder="Leave empty for public"
                    className="mt-1 w-full px-3 py-2 bg-background border border-border rounded-sm text-sm font-body text-foreground focus:border-neon-cyan focus:outline-none" />
                </div>
                <div className="flex gap-3">
                  <button onClick={saveRoom} disabled={savingRoom}
                    className="flex-1 py-2 text-xs font-display bg-primary text-primary-foreground rounded-sm hover:shadow-neon-cyan transition-all disabled:opacity-60">
                    {savingRoom ? "SAVING..." : "SAVE SETTINGS"}
                  </button>
                  <button onClick={closeRoom}
                    className="px-4 py-2 text-xs font-display border border-destructive/50 text-destructive hover:bg-destructive/10 rounded-sm transition-all">
                    CLOSE ROOM
                  </button>
                </div>
              </div>
            </div>

            {/* Now playing + Queue */}
            <div className="bg-dark-elevated border border-border rounded-sm p-5 space-y-4">
              <h3 className="font-display text-xs tracking-widest text-neon-cyan">NOW PLAYING & QUEUE</h3>
              {room?.current_item ? (
                <div className="flex items-center gap-3 p-3 bg-neon-cyan/5 border border-neon-cyan/20 rounded-sm">
                  <Play className="w-4 h-4 text-neon-cyan flex-shrink-0 fill-current" />
                  <p className="text-sm font-body text-foreground truncate">{(room.current_item as Record<string, string>).title}</p>
                  <span className="ml-auto text-xs font-display text-neon-cyan px-2 py-0.5 border border-neon-cyan/30 rounded-sm">LIVE</span>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground font-display">
                  {room?.status === "idle" ? "IDLE — ADD SOMETHING TO QUEUE" : "NOTHING PLAYING"}
                </p>
              )}

              {room?.queue && room.queue.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-display text-muted-foreground tracking-wider">UP NEXT</p>
                  {(room.queue as Record<string, string>[]).map((item, i) => (
                    <div key={i} className="flex items-center gap-2 px-3 py-2 bg-background border border-border rounded-sm">
                      <span className="text-xs text-muted-foreground w-4">{i + 1}</span>
                      <p className="flex-1 text-xs font-body text-foreground truncate">{item.title}</p>
                      <div className="flex items-center gap-1">
                        <button onClick={() => reorderQueue(i, i - 1)} disabled={i === 0} className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30"><ChevronUp className="w-3 h-3" /></button>
                        <button onClick={() => reorderQueue(i, i + 1)} disabled={i === room.queue.length - 1} className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30"><ChevronDown className="w-3 h-3" /></button>
                        <button onClick={() => playQueueItem(i)} className="p-1 text-neon-cyan hover:text-neon-cyan/70"><Play className="w-3 h-3 fill-current" /></button>
                        <button onClick={() => removeQueueItem(i)} className="p-1 text-muted-foreground hover:text-destructive"><X className="w-3 h-3" /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Viewer Requests */}
            {requests.length > 0 && (
              <div className="bg-dark-elevated border border-border rounded-sm p-5 space-y-3">
                <h3 className="font-display text-xs tracking-widest text-neon-magenta">VIEWER REQUESTS ({requests.length})</h3>
                {requests.map(req => (
                  <div key={req.id} className="flex items-center gap-3 p-3 bg-background border border-border rounded-sm">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-display text-foreground truncate">{req.title}</p>
                      <p className="text-xs text-muted-foreground font-body">from {req.viewer_name}</p>
                    </div>
                    <button onClick={() => approveRequest(req.id)}
                      className="px-2 py-1 text-xs font-display text-neon-cyan border border-neon-cyan/30 rounded-sm hover:bg-neon-cyan/10">APPROVE</button>
                    <button onClick={() => ignoreRequest(req.id)}
                      className="px-2 py-1 text-xs font-display text-muted-foreground border border-border rounded-sm hover:text-destructive hover:border-destructive/30">IGNORE</button>
                  </div>
                ))}
              </div>
            )}

            {/* Schedule */}
            <div className="bg-dark-elevated border border-border rounded-sm p-5 space-y-3">
              <h3 className="font-display text-xs tracking-widest text-neon-cyan">SCHEDULED</h3>
              {schedule.length === 0 ? (
                <p className="text-xs text-muted-foreground">No scheduled items</p>
              ) : (
                schedule.map(item => (
                  <div key={item.id} className="flex items-center gap-3 p-3 bg-background border border-border rounded-sm">
                    <div className="flex-1">
                      <p className="text-xs font-body text-foreground">{item.title}</p>
                      <p className="text-xs text-muted-foreground">{new Date(item.scheduled_time * 1000).toLocaleString()}</p>
                    </div>
                    <button onClick={async () => {
                      await bff.rooms.deleteSchedule(user.token, item.id);
                      qc.invalidateQueries({ queryKey: ["room-schedule"] });
                    }} className="text-destructive hover:text-destructive/70"><X className="w-3.5 h-3.5" /></button>
                  </div>
                ))
              )}
            </div>

            {/* Go to room */}
            {room && (
              <Link to={`/room/${room.id}`}
                className="flex items-center justify-center gap-2 py-3 text-sm font-display border border-neon-cyan/30 text-neon-cyan hover:bg-neon-cyan/10 rounded-sm transition-colors">
                <Tv className="w-4 h-4" />OPEN MY ROOM
              </Link>
            )}
          </div>
        )}

        {/* ── Settings ─────────────────────────────────────────────────── */}
        {tab === "settings" && (
          <div className="max-w-md space-y-6">
            <div className="bg-dark-elevated border border-border rounded-sm p-5 space-y-4">
              <h3 className="font-display text-xs tracking-widest text-muted-foreground">ACCOUNT SETTINGS</h3>
              <p className="text-xs text-muted-foreground font-body">Username: <span className="text-foreground">{user.username}</span></p>
              <button onClick={logout}
                className="w-full py-2 text-xs font-display border border-destructive/40 text-destructive hover:bg-destructive/10 rounded-sm transition-all">
                LOG OUT
              </button>
            </div>
          </div>
        )}

        {/* ── Stats ─────────────────────────────────────────────────────── */}
        {tab === "stats" && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl">
            {[
              { label: "TOTAL WATCH TIME", value: formatSeconds(stats?.totalWatchTime ?? 0) },
              { label: "COMPLETED", value: `${stats?.completedCount ?? 0} titles` },
              { label: "MY LIST", value: `${stats?.watchlistCount ?? 0} items` },
            ].map(({ label, value }) => (
              <div key={label} className="bg-dark-elevated border border-border rounded-sm p-5 text-center">
                <p className="font-display text-xs tracking-widest text-muted-foreground mb-2">{label}</p>
                <p className="font-display text-2xl font-black text-neon-cyan">{value}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
