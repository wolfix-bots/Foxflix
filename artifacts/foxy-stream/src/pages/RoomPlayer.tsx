import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { X, ChevronDown, Send, Loader2 } from "lucide-react";
import { io, type Socket } from "socket.io-client";
import { bff } from "@/lib/bff";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { toast } from "sonner";

interface RoomItem {
  title: string;
  streamUrl: string;
  startedAt?: number;
  durationSeconds?: number;
  cover?: string;
}

const RoomPlayer = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const roomId = Number(id);

  const videoRef = useRef<HTMLVideoElement>(null);
  const socketRef = useRef<Socket | null>(null);
  const controlsTimer = useRef<ReturnType<typeof setTimeout>>();

  const [showControls, setShowControls] = useState(false);
  const [roomInfo, setRoomInfo] = useState<{ name: string; status: string; idleUntil?: number } | null>(null);
  const [currentItem, setCurrentItem] = useState<RoomItem | null>(null);
  const [queue, setQueue] = useState<RoomItem[]>([]);
  const [idleCountdown, setIdleCountdown] = useState<number | null>(null);
  const [closed, setClosed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showRequest, setShowRequest] = useState(false);
  const [requestQuery, setRequestQuery] = useState("");
  const [requestResults, setRequestResults] = useState<{ subjectId: string; title: string; subjectType: number }[]>([]);
  const [notifyWhenLive, setNotifyWhenLive] = useState(false);

  // Show controls on interaction
  const showControlsTemporarily = useCallback(() => {
    setShowControls(true);
    clearTimeout(controlsTimer.current);
    controlsTimer.current = setTimeout(() => setShowControls(false), 3000);
  }, []);

  // Join room + connect socket
  useEffect(() => {
    if (!roomId) return;
    let cancelled = false;

    const init = async () => {
      try {
        const joinData = await bff.rooms.join(roomId);
        if (cancelled) return;

        if (joinData.status === "playing") {
          const streamData = await bff.rooms.getStream(roomId);
          if (!cancelled && streamData.streamUrl) {
            setCurrentItem({
              title: (joinData.current_item as Record<string, string>)?.title ?? "Live Stream",
              streamUrl: streamData.streamUrl,
              startedAt: streamData.startedAt,
              durationSeconds: streamData.durationSeconds,
              cover: (joinData.current_item as Record<string, string>)?.cover,
            });
            if (videoRef.current) {
              videoRef.current.src = streamData.streamUrl;
              videoRef.current.currentTime = streamData.elapsed;
              videoRef.current.play().catch(() => {});
            }
          }
        } else if (joinData.status === "idle" && joinData.idleUntil) {
          setIdleCountdown(Math.max(0, joinData.idleUntil - Date.now()));
        }

        setQueue((joinData.queue as RoomItem[]) || []);
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : "Failed to join room");
        navigate("/");
        return;
      }

      // Fetch room info
      try {
        const info = await bff.rooms.getById(roomId);
        if (!cancelled) setRoomInfo({ name: info.name, status: info.status });
      } catch {}

      setLoading(false);

      // Connect socket
      const socket = io(window.location.origin, {
        path: "/api/socket.io",
        query: { roomId: String(roomId) },
      });
      socketRef.current = socket;

      socket.on("play", (data: { item: RoomItem; startedAt: number }) => {
        setCurrentItem(data.item);
        setIdleCountdown(null);
        if (videoRef.current) {
          videoRef.current.src = data.item.streamUrl;
          videoRef.current.currentTime = 0;
          videoRef.current.play().catch(() => {});
        }
        if (notifyWhenLive) {
          toast.success(`Room is live: ${data.item.title}`);
        }
      });

      socket.on("queue_updated", (data: { queue: RoomItem[] }) => {
        setQueue(data.queue);
      });

      socket.on("idle", (data: { idleUntil: number }) => {
        setCurrentItem(null);
        setIdleCountdown(Math.max(0, data.idleUntil - Date.now()));
        if (videoRef.current) videoRef.current.src = "";
      });

      socket.on("closed", () => {
        setClosed(true);
        setTimeout(() => navigate("/"), 3000);
      });

      socket.on("notification", (data: { message: string }) => {
        toast.info(data.message);
      });
    };

    init();
    return () => {
      cancelled = true;
      socketRef.current?.disconnect();
    };
  }, [roomId]);

  // Idle countdown ticker
  useEffect(() => {
    if (idleCountdown == null || idleCountdown <= 0) return;
    const interval = setInterval(() => {
      setIdleCountdown(prev => (prev != null ? Math.max(0, prev - 1000) : null));
    }, 1000);
    return () => clearInterval(interval);
  }, [idleCountdown]);

  // Request search
  const searchRequest = async () => {
    if (!requestQuery.trim()) return;
    try {
      const res = await api.search(requestQuery, 1, 5);
      setRequestResults((res.data?.items || []).map((m: { subjectId: string; title: string; subjectType: number }) => ({
        subjectId: m.subjectId, title: m.title, subjectType: m.subjectType,
      })));
    } catch {}
  };

  const sendRequest = async (item: { subjectId: string; title: string; subjectType: number }) => {
    try {
      await bff.rooms.sendRequest(roomId, { subjectId: item.subjectId, title: item.title, subjectType: item.subjectType });
      toast.success("Request sent to host!");
      setShowRequest(false);
      setRequestQuery("");
      setRequestResults([]);
    } catch {
      toast.error("Failed to send request");
    }
  };

  const leave = () => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    navigate("/");
  };

  const formatCountdown = (ms: number) => {
    const min = Math.floor(ms / 60000), sec = Math.floor((ms % 60000) / 1000);
    return `${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  };

  if (loading) return (
    <div className="fixed inset-0 bg-black flex items-center justify-center">
      <Loader2 className="w-8 h-8 text-neon-cyan animate-spin" />
    </div>
  );

  if (closed) return (
    <div className="fixed inset-0 bg-black flex flex-col items-center justify-center gap-4">
      <p className="font-display text-xl text-neon-cyan">ROOM CLOSED</p>
      <p className="text-sm text-muted-foreground">Redirecting to home...</p>
    </div>
  );

  return (
    <div
      className="fixed inset-0 bg-black overflow-hidden"
      onClick={showControlsTemporarily}
      onMouseMove={showControlsTemporarily}
    >
      {/* Video */}
      {currentItem ? (
        <video
          ref={videoRef}
          className="w-full h-full object-contain"
          playsInline
          autoPlay
          onDoubleClick={async () => {
            if (!document.fullscreenElement) {
              await document.documentElement.requestFullscreen().catch(() => {});
            } else {
              await document.exitFullscreen().catch(() => {});
            }
          }}
        />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center gap-6">
          {idleCountdown != null ? (
            <>
              <div className="text-center">
                <p className="font-display text-lg text-neon-cyan mb-2">ROOM IS IDLE</p>
                <p className="text-sm text-muted-foreground">The host will play something soon</p>
                <p className="font-display text-3xl text-white mt-4">
                  Closes in {formatCountdown(idleCountdown)}
                </p>
              </div>
              {!notifyWhenLive ? (
                <button
                  onClick={() => setNotifyWhenLive(true)}
                  className="px-6 py-2 text-sm font-display border border-neon-cyan/30 text-neon-cyan rounded-sm hover:bg-neon-cyan/10 transition-all"
                >
                  NOTIFY ME WHEN LIVE
                </button>
              ) : (
                <p className="text-xs font-display text-neon-cyan">✓ YOU'LL BE NOTIFIED</p>
              )}
            </>
          ) : (
            <p className="font-display text-lg text-muted-foreground">LOADING...</p>
          )}
        </div>
      )}

      {/* Controls overlay */}
      <div className={`absolute inset-0 pointer-events-none transition-opacity duration-300 ${showControls ? "opacity-100" : "opacity-0"}`}>
        {/* Top bar */}
        <div className="pointer-events-auto absolute top-0 left-0 right-0 flex items-start justify-between p-4 bg-gradient-to-b from-black/70 to-transparent">
          <div>
            <p className="font-display text-xs tracking-widest text-neon-cyan">{roomInfo?.name ?? "ROOM"}</p>
            {currentItem && <p className="text-sm text-white mt-0.5 truncate max-w-xs">{currentItem.title}</p>}
          </div>
          <button
            className="pointer-events-auto p-2 bg-black/50 rounded-sm text-white/70 hover:text-white transition-colors"
            onClick={leave}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Queue overlay (bottom left) */}
        {queue.length > 0 && (
          <div className="pointer-events-auto absolute bottom-4 left-4 max-w-xs">
            <p className="text-xs font-display text-muted-foreground mb-1">UP NEXT</p>
            <p className="text-sm text-white truncate">{queue[0]?.title}</p>
            {queue.length > 1 && <p className="text-xs text-muted-foreground">+{queue.length - 1} more</p>}
          </div>
        )}

        {/* Request button */}
        <button
          className="pointer-events-auto absolute bottom-4 right-4 flex items-center gap-1.5 px-3 py-2 bg-black/60 border border-white/20 text-white text-xs font-display rounded-sm hover:border-neon-cyan/40 transition-all"
          onClick={() => setShowRequest(o => !o)}
        >
          <Send className="w-3.5 h-3.5" />
          REQUEST
        </button>
      </div>

      {/* Request panel */}
      {showRequest && (
        <div className="absolute bottom-16 right-4 w-72 bg-dark-elevated border border-border rounded-sm shadow-neon-subtle z-50">
          <div className="flex items-center justify-between p-3 border-b border-border">
            <p className="font-display text-xs text-neon-cyan">REQUEST A MOVIE</p>
            <button onClick={() => setShowRequest(false)}><X className="w-3.5 h-3.5 text-muted-foreground" /></button>
          </div>
          <div className="p-3 space-y-2">
            <div className="flex gap-2">
              <input
                value={requestQuery}
                onChange={e => setRequestQuery(e.target.value)}
                onKeyDown={e => e.key === "Enter" && searchRequest()}
                placeholder="Search movies..."
                className="flex-1 px-2 py-1.5 bg-background border border-border rounded-sm text-xs text-foreground placeholder:text-muted-foreground focus:border-neon-cyan focus:outline-none"
              />
              <button onClick={searchRequest} className="px-2 py-1.5 bg-primary text-primary-foreground text-xs font-display rounded-sm">GO</button>
            </div>
            {requestResults.map(item => (
              <div key={item.subjectId} className="flex items-center justify-between py-1.5 border-b border-border/50">
                <p className="text-xs font-body text-foreground truncate flex-1">{item.title}</p>
                <button onClick={() => sendRequest(item)} className="ml-2 text-xs font-display text-neon-cyan hover:underline">
                  REQUEST
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default RoomPlayer;
