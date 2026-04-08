import { useState, useEffect } from "react";
import { X, Play, Plus, Loader2, Tv } from "lucide-react";
import { bff } from "@/lib/bff";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { MovieSubject } from "@/lib/api";

interface SendToRoomModalProps {
  movie: MovieSubject;
  seriesInfo?: { seasons: { season: number; episodeCount: number }[] } | null;
  onClose: () => void;
}

const RESOLUTIONS = ["360", "480", "720", "1080"];
const LANGS = ["En", "Es", "Fr", "De", "Ja", "Ko", "Zh"];

const SendToRoomModal = ({ movie, seriesInfo, onClose }: SendToRoomModalProps) => {
  const { user } = useAuth();
  const isTV = movie.subjectType === 2;
  const [loading, setLoading] = useState(false);
  const [roomStatus, setRoomStatus] = useState<"idle" | "playing" | "closed" | null>(null);
  const [action, setAction] = useState<"now" | "queue">("now");
  const [resolution, setResolution] = useState("720");
  const [lang, setLang] = useState("En");
  const [season, setSeason] = useState(1);
  const [episode, setEpisode] = useState(1);
  const [episodeMode, setEpisodeMode] = useState<"specific" | "whole">("specific");

  useEffect(() => {
    if (!user) return;
    bff.rooms.getMine(user.token)
      .then(r => { setRoomStatus(r.status as "idle" | "playing" | "closed"); })
      .catch(() => { setRoomStatus("closed"); });
  }, [user]);

  const currentSeasonInfo = seriesInfo?.seasons.find(s => s.season === season);
  const episodeCount = currentSeasonInfo?.episodeCount ?? 20;
  const totalSeasons = seriesInfo?.seasons.length ?? 5;

  const handleSend = async () => {
    if (!user) return;
    setLoading(true);
    try {
      if (isTV && episodeMode === "whole") {
        // Add all episodes of all seasons
        const seasons = seriesInfo?.seasons ?? Array.from({ length: totalSeasons }, (_, i) => ({ season: i + 1, episodeCount: 13 }));
        for (let i = 0; i < seasons.length; i++) {
          const s = seasons[i];
          for (let ep = 1; ep <= s.episodeCount; ep++) {
            await bff.rooms.send(user.token, {
              subjectId: movie.subjectId,
              title: `${movie.title} S${String(s.season).padStart(2, "0")}E${String(ep).padStart(2, "0")}`,
              subjectType: 2,
              season: s.season,
              episode: ep,
              resolution,
              lang,
              durationSeconds: movie.duration || 1500,
              cover: movie.cover?.url,
              action: i === 0 && action === "now" ? "now" : "queue",
            });
          }
        }
      } else {
        await bff.rooms.send(user.token, {
          subjectId: movie.subjectId,
          title: isTV ? `${movie.title} S${String(season).padStart(2, "0")}E${String(episode).padStart(2, "0")}` : movie.title,
          subjectType: movie.subjectType,
          season: isTV ? season : undefined,
          episode: isTV ? episode : undefined,
          resolution,
          lang,
          durationSeconds: movie.duration || 7200,
          cover: movie.cover?.url,
          action,
        });
      }
      toast.success(action === "now" ? `Now playing in your room!` : `Added to room queue!`);
      onClose();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to send to room");
    } finally {
      setLoading(false);
    }
  };

  const effectiveAction = roomStatus === "closed" || roomStatus === "idle" ? "now" : action;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md mx-4 bg-dark-elevated border border-neon-cyan/20 rounded-sm" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <p className="font-display text-xs tracking-widest text-neon-cyan">SEND TO MY ROOM</p>
            <p className="text-sm font-body text-foreground truncate mt-0.5">{movie.title}</p>
          </div>
          <button onClick={onClose}><X className="w-4 h-4 text-muted-foreground" /></button>
        </div>

        <div className="p-5 space-y-4">
          {/* TV options */}
          {isTV && (
            <div className="space-y-3">
              <div className="flex gap-2">
                {(["specific", "whole"] as const).map(m => (
                  <button
                    key={m}
                    onClick={() => setEpisodeMode(m)}
                    className={`flex-1 py-2 text-xs font-display rounded-sm border transition-all ${
                      episodeMode === m ? "border-neon-cyan text-neon-cyan bg-neon-cyan/10" : "border-border text-muted-foreground"
                    }`}
                  >
                    <Tv className="w-3 h-3 inline mr-1" />
                    {m === "specific" ? "THIS EPISODE" : "WHOLE SERIES"}
                  </button>
                ))}
              </div>
              {episodeMode === "specific" && (
                <div className="flex gap-3">
                  <select
                    value={season}
                    onChange={e => { setSeason(Number(e.target.value)); setEpisode(1); }}
                    className="flex-1 px-3 py-2 bg-background border border-border rounded-sm text-xs font-display text-foreground focus:border-neon-cyan focus:outline-none"
                  >
                    {Array.from({ length: totalSeasons }, (_, i) => i + 1).map(s => (
                      <option key={s} value={s}>Season {String(s).padStart(2, "0")}</option>
                    ))}
                  </select>
                  <select
                    value={episode}
                    onChange={e => setEpisode(Number(e.target.value))}
                    className="flex-1 px-3 py-2 bg-background border border-border rounded-sm text-xs font-display text-foreground focus:border-neon-cyan focus:outline-none"
                  >
                    {Array.from({ length: episodeCount }, (_, i) => i + 1).map(ep => (
                      <option key={ep} value={ep}>Episode {String(ep).padStart(2, "0")}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          {/* Quality + language */}
          <div className="flex gap-3">
            <div className="flex-1 space-y-1">
              <label className="text-xs font-display text-muted-foreground">QUALITY</label>
              <select
                value={resolution}
                onChange={e => setResolution(e.target.value)}
                className="w-full px-3 py-2 bg-background border border-border rounded-sm text-xs font-display text-foreground focus:border-neon-cyan focus:outline-none"
              >
                {RESOLUTIONS.map(r => <option key={r} value={r}>{r}p</option>)}
              </select>
            </div>
            <div className="flex-1 space-y-1">
              <label className="text-xs font-display text-muted-foreground">LANGUAGE</label>
              <select
                value={lang}
                onChange={e => setLang(e.target.value)}
                className="w-full px-3 py-2 bg-background border border-border rounded-sm text-xs font-display text-foreground focus:border-neon-cyan focus:outline-none"
              >
                {LANGS.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
          </div>

          {/* Action (only if room is playing) */}
          {roomStatus === "playing" && (
            <div className="flex gap-2">
              <button
                onClick={() => setAction("now")}
                className={`flex-1 py-2 text-xs font-display rounded-sm border transition-all flex items-center justify-center gap-1 ${
                  effectiveAction === "now" ? "border-neon-magenta text-neon-magenta bg-neon-magenta/10" : "border-border text-muted-foreground"
                }`}
              >
                <Play className="w-3 h-3" />
                PLAY NOW
              </button>
              <button
                onClick={() => setAction("queue")}
                className={`flex-1 py-2 text-xs font-display rounded-sm border transition-all flex items-center justify-center gap-1 ${
                  effectiveAction === "queue" ? "border-neon-cyan text-neon-cyan bg-neon-cyan/10" : "border-border text-muted-foreground"
                }`}
              >
                <Plus className="w-3 h-3" />
                ADD TO QUEUE
              </button>
            </div>
          )}

          <button
            onClick={handleSend}
            disabled={loading}
            className="w-full py-2.5 bg-primary text-primary-foreground font-display text-sm tracking-wider rounded-sm hover:shadow-neon-cyan transition-all disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            {loading ? "SENDING..." : "CONFIRM"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SendToRoomModal;
