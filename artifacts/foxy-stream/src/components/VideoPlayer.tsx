import { useState, useRef, useEffect, useCallback } from "react";
import { Play, Pause, Volume2, VolumeX, Maximize, Minimize, Settings, Download, X, Wifi, Captions, CaptionsOff } from "lucide-react";
import type { Stream } from "@/lib/api";
import { api, formatFileSize } from "@/lib/api";

interface CaptionTrack {
  language: string;
  url: string;
}

interface VideoPlayerProps {
  streams: Stream[];
  title: string;
  subjectId?: string;
  streamId?: string;
  isTV?: boolean;
  season?: number;
  episode?: number;
  onClose?: () => void;
}

const sortedByQualityAsc = (streams: Stream[]): Stream[] => {
  const order: Record<string, number> = { "360p": 1, "480p": 2, "720p": 3, "1080p": 4, "4K": 5 };
  return [...streams].sort((a, b) => (order[a.quality] ?? 99) - (order[b.quality] ?? 99));
};

const VideoPlayer = ({ streams, title, subjectId, streamId, isTV, season, episode, onClose }: VideoPlayerProps) => {
  const downloadFilename = isTV && season != null && episode != null
    ? `${title} S${String(season).padStart(2, "0")}E${String(episode).padStart(2, "0")}.mp4`
    : `${title}.mp4`;
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [selectedStream, setSelectedStream] = useState<Stream>(() => {
    const sorted = sortedByQualityAsc(streams);
    return sorted[0] ?? streams[0];
  });
  const [showQuality, setShowQuality] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadProgress, setLoadProgress] = useState(0);
  const [canPlay, setCanPlay] = useState(false);
  const [autoUpgraded, setAutoUpgraded] = useState(false);
  const [captionTracks, setCaptionTracks] = useState<CaptionTrack[]>([]);
  const [activeCaptionIdx, setActiveCaptionIdx] = useState<number>(-1);
  const [showCaptionMenu, setShowCaptionMenu] = useState(false);
  const controlsTimer = useRef<ReturnType<typeof setTimeout>>();
  const bufferCheckTimer = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    const sorted = sortedByQualityAsc(streams);
    setSelectedStream(sorted[0] ?? streams[0]);
    setAutoUpgraded(false);
    setCanPlay(false);
    setLoading(true);
    setLoadProgress(0);
  }, [streams]);

  // Listen for native fullscreen exit (back button on Android etc.)
  useEffect(() => {
    const onFsChange = () => {
      if (!document.fullscreenElement) {
        setFullscreen(false);
        // Release orientation lock when leaving fullscreen
        try { (screen.orientation as { unlock?: () => void }).unlock?.(); } catch {}
      }
    };
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  useEffect(() => {
    if (!subjectId || !streamId) return;
    api.getCaptions(subjectId, streamId)
      .then((res) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const data = (res as any).data;
        const tracks: CaptionTrack[] = [];
        if (Array.isArray(data?.subtitleList)) {
          data.subtitleList.forEach((s: { languageName?: string; subtitleUrl?: string }) => {
            if (s.subtitleUrl) tracks.push({ language: s.languageName || "Unknown", url: s.subtitleUrl });
          });
        }
        if (Array.isArray(data?.subtitles)) {
          data.subtitles.forEach((s: { language?: string; url?: string }) => {
            if (s.url) tracks.push({ language: s.language || "Unknown", url: s.url });
          });
        }
        if (tracks.length) setCaptionTracks(tracks);
      })
      .catch(() => {});
  }, [subjectId, streamId]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const tracks = video.textTracks;
    for (let i = 0; i < tracks.length; i++) {
      tracks[i].mode = i === activeCaptionIdx ? "showing" : "hidden";
    }
  }, [activeCaptionIdx]);

  const updateBuffered = useCallback(() => {
    const video = videoRef.current;
    if (!video || !video.duration) return;
    try {
      let maxEnd = 0;
      for (let i = 0; i < video.buffered.length; i++) {
        const end = video.buffered.end(i);
        if (end > maxEnd) maxEnd = end;
      }
      const pct = (maxEnd / video.duration) * 100;
      setBuffered(pct);
      setLoadProgress(pct);
    } catch {}
  }, []);

  useEffect(() => {
    bufferCheckTimer.current = setInterval(updateBuffered, 500);
    return () => clearInterval(bufferCheckTimer.current);
  }, [updateBuffered]);

  useEffect(() => {
    if (!autoUpgraded && canPlay && buffered >= 15) {
      const best = streams.find(s => s.quality === "1080p") || streams.find(s => s.quality === "720p");
      if (best && best.quality !== selectedStream.quality) {
        setAutoUpgraded(true);
        const currentT = videoRef.current?.currentTime || 0;
        const wasPlaying = playing;
        setSelectedStream(best);
        setLoading(true);
        setTimeout(() => {
          if (videoRef.current) {
            videoRef.current.currentTime = currentT;
            if (wasPlaying) videoRef.current.play();
          }
        }, 400);
      } else {
        setAutoUpgraded(true);
      }
    }
  }, [autoUpgraded, canPlay, buffered, streams, selectedStream.quality, playing]);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (playing) videoRef.current.pause();
    else videoRef.current.play();
    setPlaying(!playing);
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) setCurrentTime(videoRef.current.currentTime);
    updateBuffered();
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) setDuration(videoRef.current.duration);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const t = parseFloat(e.target.value);
    if (videoRef.current) videoRef.current.currentTime = t;
    setCurrentTime(t);
  };

  const handleVolume = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    setVolume(v);
    if (videoRef.current) videoRef.current.volume = v;
    setMuted(v === 0);
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !muted;
    setMuted(!muted);
  };

  const toggleFullscreen = async () => {
    if (!containerRef.current) return;
    if (!fullscreen) {
      await containerRef.current.requestFullscreen();
      setFullscreen(true);
      // Lock to landscape on mobile — lets the video fill the screen
      try {
        await (screen.orientation as { lock?: (o: string) => Promise<void> }).lock?.("landscape");
      } catch { /* not supported on desktop/some browsers */ }
    } else {
      // Unlock orientation before exiting fullscreen
      try { (screen.orientation as { unlock?: () => void }).unlock?.(); } catch {}
      await document.exitFullscreen();
      setFullscreen(false);
    }
  };

  const showControlsTemporarily = () => {
    setShowControls(true);
    clearTimeout(controlsTimer.current);
    controlsTimer.current = setTimeout(() => {
      if (playing) setShowControls(false);
    }, 3000);
  };

  const formatTime = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = Math.floor(s % 60);
    if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
    return `${m}:${String(sec).padStart(2, "0")}`;
  };

  const changeQuality = (stream: Stream) => {
    const currentT = videoRef.current?.currentTime || 0;
    const wasPlaying = playing;
    setSelectedStream(stream);
    setLoading(true);
    setShowQuality(false);
    setAutoUpgraded(true);
    setTimeout(() => {
      if (videoRef.current) {
        videoRef.current.currentTime = currentT;
        if (wasPlaying) videoRef.current.play();
      }
    }, 400);
  };

  const progressPct = duration > 0 ? (currentTime / duration) * 100 : 0;
  const captionsOn = activeCaptionIdx >= 0;

  return (
    <div
      ref={containerRef}
      className="relative w-full bg-black overflow-hidden"
      style={{ aspectRatio: "16/9" }}
      onMouseMove={showControlsTemporarily}
      onClick={() => setShowControls(true)}
    >
      <video
        ref={videoRef}
        src={selectedStream?.proxyUrl}
        className="w-full h-full object-contain"
        preload="metadata"
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onWaiting={() => setLoading(true)}
        onCanPlay={() => { setLoading(false); setCanPlay(true); }}
        onCanPlayThrough={() => { setLoading(false); setCanPlay(true); }}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onProgress={updateBuffered}
        onClick={togglePlay}
        crossOrigin="anonymous"
        playsInline
      >
        {captionTracks.map((track, i) => (
          <track
            key={i}
            kind="subtitles"
            src={track.url}
            label={track.language}
            srcLang={track.language.slice(0, 2).toLowerCase()}
            default={i === activeCaptionIdx}
          />
        ))}
      </video>

      {/* Buffering overlay */}
      {loading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 gap-3">
          <div className="relative w-16 h-16">
            <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
              <circle cx="32" cy="32" r="28" fill="none" stroke="hsl(var(--border))" strokeWidth="3" />
              <circle cx="32" cy="32" r="28" fill="none" stroke="hsl(var(--neon-cyan))" strokeWidth="3"
                strokeDasharray={`${2 * Math.PI * 28}`}
                strokeDashoffset={`${2 * Math.PI * 28 * (1 - loadProgress / 100)}`}
                strokeLinecap="round" className="transition-all duration-500"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="font-display text-xs text-neon-cyan">{Math.round(loadProgress)}%</span>
            </div>
          </div>
          <p className="font-display text-xs tracking-widest text-muted-foreground">
            {loadProgress < 5 ? "CONNECTING..." : "BUFFERING..."}
          </p>
        </div>
      )}

      {/* Controls overlay */}
      <div className={`absolute inset-0 flex flex-col justify-end transition-opacity duration-300 ${showControls ? "opacity-100" : "opacity-0"}`}>
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-black/30 pointer-events-none" />

        {/* Top bar */}
        <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-display text-sm text-white truncate">{title}</span>
            {canPlay && !loading && (
              <div className="flex items-center gap-1 text-xs text-neon-cyan/70 font-display flex-shrink-0">
                <Wifi className="w-3 h-3" />
                <span>{Math.round(buffered)}%</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            {/* Quality */}
            <div className="relative">
              <button onClick={() => { setShowQuality(!showQuality); setShowCaptionMenu(false); }}
                className="flex items-center gap-1 px-2 py-1 text-xs font-display border border-white/30 rounded-sm hover:border-neon-cyan text-white transition-colors">
                <Settings className="w-3 h-3" />
                {selectedStream?.quality}
              </button>
              {showQuality && (
                <div className="absolute top-full right-0 mt-1 bg-black/90 border border-white/20 rounded-sm overflow-hidden z-10 min-w-28">
                  {streams.map((s) => (
                    <button key={s.quality} onClick={() => changeQuality(s)}
                      className={`w-full text-left px-3 py-2 text-xs font-body hover:bg-white/10 transition-colors ${s.quality === selectedStream?.quality ? "text-neon-cyan" : "text-white"}`}>
                      {s.quality}
                      {formatFileSize(s.size) && <span className="ml-2 text-white/50">{formatFileSize(s.size)}</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* CC */}
            {captionTracks.length > 0 && (
              <div className="relative">
                <button onClick={() => { setShowCaptionMenu(!showCaptionMenu); setShowQuality(false); }}
                  className={`p-1.5 transition-colors ${captionsOn ? "text-neon-cyan" : "text-white/70 hover:text-white"}`} title="Captions">
                  {captionsOn ? <Captions className="w-4 h-4" /> : <CaptionsOff className="w-4 h-4" />}
                </button>
                {showCaptionMenu && (
                  <div className="absolute top-full right-0 mt-1 bg-black/90 border border-white/20 rounded-sm overflow-hidden z-10 min-w-28">
                    <button onClick={() => { setActiveCaptionIdx(-1); setShowCaptionMenu(false); }}
                      className={`w-full text-left px-3 py-2 text-xs hover:bg-white/10 ${activeCaptionIdx === -1 ? "text-neon-cyan" : "text-white"}`}>Off</button>
                    {captionTracks.map((t, i) => (
                      <button key={i} onClick={() => { setActiveCaptionIdx(i); setShowCaptionMenu(false); }}
                        className={`w-full text-left px-3 py-2 text-xs hover:bg-white/10 ${activeCaptionIdx === i ? "text-neon-cyan" : "text-white"}`}>{t.language}</button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Download */}
            <a href={selectedStream?.downloadUrl} download={downloadFilename} target="_blank" rel="noreferrer"
              className="p-1.5 text-white/70 hover:text-neon-cyan transition-colors" title={`Download ${downloadFilename}`}>
              <Download className="w-4 h-4" />
            </a>

            {onClose && (
              <button onClick={onClose} className="p-1.5 text-white/70 hover:text-red-400 transition-colors">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Bottom controls */}
        <div className="relative p-3 space-y-2">
          {/* Progress bar */}
          <div className="relative w-full h-3 flex items-center">
            <div className="absolute w-full h-1 bg-white/20 rounded-full" />
            <div className="absolute h-1 bg-neon-cyan/30 rounded-full transition-all duration-500" style={{ width: `${buffered}%` }} />
            <div className="absolute h-1 rounded-full" style={{ width: `${progressPct}%`, background: "hsl(var(--primary))" }} />
            <input type="range" min={0} max={duration || 100} step={0.1} value={currentTime} onChange={handleSeek}
              className="absolute w-full h-3 opacity-0 cursor-pointer" />
            <div className="absolute w-3 h-3 rounded-full bg-primary pointer-events-none" style={{ left: `calc(${progressPct}% - 6px)` }} />
          </div>

          {/* Controls row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={togglePlay} className="text-white hover:text-neon-cyan transition-colors">
                {playing ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
              </button>
              <div className="flex items-center gap-2">
                <button onClick={toggleMute} className="text-white hover:text-neon-cyan transition-colors">
                  {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </button>
                <input type="range" min={0} max={1} step={0.05} value={muted ? 0 : volume} onChange={handleVolume}
                  className="w-16 h-1 appearance-none bg-white/20 rounded-full cursor-pointer accent-primary" />
              </div>
              <span className="text-xs font-display text-white/70">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>
            <button onClick={toggleFullscreen} className="text-white hover:text-neon-cyan transition-colors">
              {fullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoPlayer;
