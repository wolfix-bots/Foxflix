import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useNavigate } from "react-router-dom";
import {
  Play, Star, Clock, Globe, Languages, Film, ChevronDown, ChevronUp,
  ArrowLeft, Loader2, AlertCircle, Tv, ChevronRight, X
} from "lucide-react";
import { api, formatDuration } from "@/lib/api";
import type { Stream } from "@/lib/api";
import Navbar from "@/components/Navbar";
import MovieRow from "@/components/MovieRow";
import VideoPlayer from "@/components/VideoPlayer";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

interface SeasonInfo {
  season: number;
  episodeCount: number;
  year?: number;
}

interface SeriesInfo {
  seasons: SeasonInfo[];
  totalSeasons: number;
  status: string;
}

const MovieDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [showPlayer, setShowPlayer] = useState(false);
  const [showTrailer, setShowTrailer] = useState(false);
  const [streams, setStreams] = useState<Stream[]>([]);
  const [streamId, setStreamId] = useState<string | null>(null);
  const [loadingStreams, setLoadingStreams] = useState(false);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [expandDesc, setExpandDesc] = useState(false);

  // Season/episode for TV
  const [season, setSeason] = useState(1);
  const [episode, setEpisode] = useState(1);
  const [seasonOpen, setSeasonOpen] = useState(false);
  const [episodeOpen, setEpisodeOpen] = useState(false);
  const [seriesInfo, setSeriesInfo] = useState<SeriesInfo | null>(null);
  const [loadingSeriesInfo, setLoadingSeriesInfo] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ["detail", id],
    queryFn: () => api.getDetail(id!),
    enabled: !!id,
  });

  const { data: recommendData } = useQuery({
    queryKey: ["recommend", id],
    queryFn: () => api.getRecommend(id!, 1, 10),
    enabled: !!id,
  });

  const movie = data?.data?.subject;
  const recommended = recommendData?.data?.subjectList || [];
  const isTV = movie?.subjectType === 2;

  // Fetch series info — TVMaze (accurate DB) first, Supabase AI as fallback
  useEffect(() => {
    if (!isTV || !movie?.title || seriesInfo || loadingSeriesInfo) return;
    setLoadingSeriesInfo(true);

    const fetchInfo = async () => {
      const title = movie.title;
      const year = movie.releaseDate?.split("-")[0];

      // 1. TVMaze — free, CORS-enabled, 100% accurate episode counts
      try {
        const searchRes = await fetch(
          `https://api.tvmaze.com/singlesearch/shows?q=${encodeURIComponent(title)}`
        );
        if (searchRes.ok) {
          const show = await searchRes.json();
          const epRes = await fetch(`https://api.tvmaze.com/shows/${show.id}/episodes`);
          if (epRes.ok) {
            const episodes: { season: number; number: number }[] = await epRes.json();
            const seasonMap = new Map<number, number>();
            episodes.forEach((ep) => {
              seasonMap.set(ep.season, (seasonMap.get(ep.season) || 0) + 1);
            });
            const seasons: SeasonInfo[] = Array.from(seasonMap.entries())
              .map(([s, count]) => ({ season: s, episodeCount: count }))
              .sort((a, b) => a.season - b.season);
            if (seasons.length) {
              setSeriesInfo({ seasons, totalSeasons: seasons.length, status: show.status || "Ended" });
              return;
            }
          }
        }
      } catch { /* fall through to AI */ }

      // 2. Fallback — Supabase AI deep research
      try {
        const res = await fetch(`${SUPABASE_URL}/functions/v1/series-info`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, year }),
        });
        const data = await res.json();
        if (data?.data?.seasons) setSeriesInfo(data.data);
      } catch { /* no info available */ }
    };

    fetchInfo().finally(() => setLoadingSeriesInfo(false));
  }, [isTV, movie?.title, movie?.releaseDate, seriesInfo, loadingSeriesInfo]);

  // Current season's episode count
  const currentSeasonInfo = seriesInfo?.seasons?.find((s) => s.season === season);
  const episodeCount = currentSeasonInfo?.episodeCount ?? 50;
  const totalSeasons = seriesInfo?.totalSeasons ?? 20;

  const handleWatch = () => {
    if (!movie) return;
    setStreamError(null);
    try {
      const { streams: built, streamId: sid } = api.getStreams(
        movie.subjectId,
        isTV ? season : undefined,
        isTV ? episode : undefined
      );
      setStreams(built);
      setStreamId(sid);
      setShowPlayer(true);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to load streams";
      setStreamError(msg);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center h-96">
          <div className="text-center space-y-4">
            <Loader2 className="w-10 h-10 text-neon-cyan animate-spin mx-auto" />
            <p className="font-display text-sm text-muted-foreground tracking-widest">LOADING...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !movie) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex flex-col items-center justify-center h-96 gap-4">
          <AlertCircle className="w-12 h-12 text-destructive" />
          <p className="font-display text-lg text-muted-foreground">Content not found</p>
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 px-4 py-2 border border-border rounded-sm text-sm font-display hover:border-primary hover:text-neon-cyan transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            GO BACK
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Backdrop */}
      <div className="relative">
        <div className="absolute inset-0 h-80">
          {(movie.stills?.url || movie.cover?.url) && (
            <img
              src={movie.stills?.url || movie.cover?.url}
              alt={movie.title}
              className="w-full h-full object-cover object-top opacity-30"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/80 to-background" />
          <div className="absolute inset-0 bg-gradient-to-r from-background/60 to-transparent" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 pt-8 pb-4">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 mb-6 text-muted-foreground hover:text-foreground transition-colors font-display text-xs tracking-wider"
          >
            <ArrowLeft className="w-4 h-4" />
            BACK
          </button>

          <div className="flex flex-col md:flex-row gap-8">
            {/* Poster */}
            <div className="flex-shrink-0">
              <div className="w-48 md:w-64 cyber-border rounded-sm overflow-hidden shadow-card">
                <img
                  src={movie.cover?.url}
                  alt={movie.title}
                  className="w-full aspect-[2/3] object-cover"
                />
              </div>
            </div>

            {/* Details */}
            <div className="flex-1 space-y-4 relative z-10">
              <span className="inline-block px-2 py-0.5 text-xs font-display border border-border text-muted-foreground rounded-sm">
                {isTV ? "TV SERIES" : "MOVIE"}
              </span>

              <h1 className="font-display text-2xl md:text-4xl font-black text-foreground tracking-wide">
                {movie.title}
              </h1>

              <div className="flex flex-wrap items-center gap-4 text-sm font-body">
                {movie.imdbRatingValue && parseFloat(movie.imdbRatingValue) > 0 && (
                  <div className="flex items-center gap-1.5">
                    <Star className="w-4 h-4 text-neon-yellow fill-current" />
                    <span className="font-semibold text-neon-yellow">{movie.imdbRatingValue}</span>
                    {movie.imdbRatingCount > 0 && (
                      <span className="text-muted-foreground text-xs">({movie.imdbRatingCount.toLocaleString()})</span>
                    )}
                  </div>
                )}
                {movie.releaseDate && (
                  <span className="text-muted-foreground">{movie.releaseDate}</span>
                )}
                {movie.duration > 0 && (
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Clock className="w-4 h-4" />
                    {formatDuration(movie.duration)}
                  </div>
                )}
                {movie.countryName && (
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Globe className="w-4 h-4" />
                    {movie.countryName}
                  </div>
                )}
                {isTV && seriesInfo && (
                  <div className="flex items-center gap-1 text-neon-cyan/80">
                    <Tv className="w-4 h-4" />
                    <span className="text-xs font-display">
                      {seriesInfo.totalSeasons} SEASON{seriesInfo.totalSeasons !== 1 ? "S" : ""} · {seriesInfo.status.toUpperCase()}
                    </span>
                  </div>
                )}
              </div>

              {movie.genre && (
                <div className="flex flex-wrap gap-2">
                  {movie.genre.split(",").map((g) => (
                    <span
                      key={g}
                      className="px-2 py-0.5 text-xs font-display border border-neon-cyan/20 text-neon-cyan/80 rounded-sm"
                    >
                      {g.trim()}
                    </span>
                  ))}
                </div>
              )}

              {movie.description && (
                <div>
                  <p className={`text-sm font-body text-muted-foreground leading-relaxed ${!expandDesc ? "line-clamp-3" : ""}`}>
                    {movie.description}
                  </p>
                  {movie.description.length > 200 && (
                    <button
                      onClick={() => setExpandDesc(!expandDesc)}
                      className="flex items-center gap-1 text-xs text-neon-cyan mt-1 font-display"
                    >
                      {expandDesc ? <><ChevronUp className="w-3 h-3" />LESS</> : <><ChevronDown className="w-3 h-3" />MORE</>}
                    </button>
                  )}
                </div>
              )}

              {/* TV Season/Episode Dropdowns */}
              {isTV && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 mb-1">
                    <Tv className="w-4 h-4 text-neon-cyan" />
                    <span className="text-xs font-display text-neon-cyan tracking-wider">SELECT EPISODE</span>
                    {loadingSeriesInfo && (
                      <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex gap-3 flex-wrap">
                    {/* Season Dropdown */}
                    <div className="relative">
                      <button
                        onClick={() => { setSeasonOpen((o) => !o); setEpisodeOpen(false); }}
                        className="flex items-center gap-2 px-3 py-2 bg-dark-elevated border border-border hover:border-neon-cyan/50 rounded-sm text-sm font-display transition-all min-w-[130px] justify-between"
                      >
                        <span className="text-muted-foreground text-xs">SEASON</span>
                        <span className="text-foreground font-bold">{String(season).padStart(2, "0")}</span>
                        <ChevronDown className={`w-3 h-3 text-muted-foreground transition-transform ${seasonOpen ? "rotate-180" : ""}`} />
                      </button>
                      {seasonOpen && (
                        <div className="absolute top-full left-0 mt-1 z-20 bg-dark-elevated border border-neon-cyan/30 rounded-sm shadow-neon-subtle max-h-52 overflow-y-auto min-w-[130px]">
                          {Array.from({ length: totalSeasons }, (_, i) => i + 1).map((s) => (
                            <button
                              key={s}
                              onClick={() => {
                                setSeason(s);
                                setEpisode(1);
                                setSeasonOpen(false);
                              }}
                              className={`w-full flex items-center justify-between px-3 py-2 text-xs font-display hover:bg-neon-cyan/10 transition-colors ${s === season ? "text-neon-cyan" : "text-foreground"}`}
                            >
                              <span>SEASON {String(s).padStart(2, "0")}</span>
                              {seriesInfo?.seasons?.find((si) => si.season === s) && (
                                <span className="text-muted-foreground">
                                  {seriesInfo.seasons.find((si) => si.season === s)?.episodeCount} EP
                                </span>
                              )}
                              {s === season && <ChevronRight className="w-3 h-3 text-neon-cyan" />}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Episode Dropdown */}
                    <div className="relative">
                      <button
                        onClick={() => { setEpisodeOpen((o) => !o); setSeasonOpen(false); }}
                        className="flex items-center gap-2 px-3 py-2 bg-dark-elevated border border-border hover:border-neon-cyan/50 rounded-sm text-sm font-display transition-all min-w-[140px] justify-between"
                      >
                        <span className="text-muted-foreground text-xs">EPISODE</span>
                        <span className="text-foreground font-bold">{String(episode).padStart(2, "0")}</span>
                        <ChevronDown className={`w-3 h-3 text-muted-foreground transition-transform ${episodeOpen ? "rotate-180" : ""}`} />
                      </button>
                      {episodeOpen && (
                        <div className="absolute top-full left-0 mt-1 z-20 bg-dark-elevated border border-neon-cyan/30 rounded-sm shadow-neon-subtle max-h-52 overflow-y-auto min-w-[140px]">
                          {Array.from({ length: episodeCount }, (_, i) => i + 1).map((ep) => (
                            <button
                              key={ep}
                              onClick={() => { setEpisode(ep); setEpisodeOpen(false); }}
                              className={`w-full text-left px-3 py-2 text-xs font-display hover:bg-neon-cyan/10 transition-colors ${ep === episode ? "text-neon-cyan" : "text-foreground"}`}
                            >
                              EP {String(ep).padStart(2, "0")}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Watch button */}
              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={handleWatch}
                  disabled={loadingStreams}
                  className="flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground font-display text-sm tracking-wider rounded-sm hover:shadow-neon-cyan hover:scale-105 transition-all disabled:opacity-60 disabled:cursor-not-allowed clip-cyber"
                >
                  {loadingStreams ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-current" />}
                  {loadingStreams ? "LOADING..." : "WATCH NOW"}
                </button>

                {movie.trailer?.videoAddress?.url && (
                  <button
                    onClick={() => setShowTrailer(true)}
                    className="flex items-center gap-2 px-4 py-2.5 border border-border text-foreground font-display text-xs tracking-wider rounded-sm hover:border-neon-magenta hover:text-neon-magenta transition-all"
                  >
                    <Film className="w-4 h-4" />
                    TRAILER
                  </button>
                )}
              </div>

              {streamError && (
                <div className="flex items-center gap-2 text-sm text-destructive border border-destructive/30 rounded-sm px-3 py-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {streamError}
                </div>
              )}

              {movie.subtitles && (
                <div className="flex items-start gap-2 text-xs text-muted-foreground">
                  <Languages className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span className="font-body">
                    Subtitles: {movie.subtitles.split(",").slice(0, 6).join(", ")}
                    {movie.subtitles.split(",").length > 6 && ` +${movie.subtitles.split(",").length - 6} more`}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Video Player — fullscreen popup modal */}
      {showPlayer && streams.length > 0 && (
        <div
          className="fixed inset-0 z-[9999] bg-black flex flex-col"
          style={{ animation: "fadeIn 0.2s ease" }}
        >
          {/* Modal header */}
          <div className="flex items-center justify-between px-4 py-3 bg-black/80 border-b border-neon-cyan/20 flex-shrink-0">
            <div className="min-w-0 flex-1">
              <p className="font-display text-xs tracking-widest text-neon-cyan">NOW PLAYING</p>
              <p className="font-body text-sm text-white truncate">
                {movie.title}
                {isTV ? ` — S${String(season).padStart(2, "0")}E${String(episode).padStart(2, "0")}` : ""}
              </p>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0 ml-4">
              {streams.map((s) => (
                <span key={s.quality} className="px-2 py-0.5 text-xs font-display border border-white/20 text-white/50 rounded-sm hidden sm:inline">
                  {s.quality}
                </span>
              ))}
              <button
                onClick={() => setShowPlayer(false)}
                className="p-2 text-white/70 hover:text-red-400 transition-colors"
                aria-label="Close player"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Video centered vertically */}
          <div className="flex-1 flex items-center bg-black">
            <VideoPlayer
              streams={streams}
              title={movie.title}
              subjectId={movie.subjectId}
              streamId={streamId ?? undefined}
              isTV={isTV}
              season={isTV ? season : undefined}
              episode={isTV ? episode : undefined}
              onClose={() => setShowPlayer(false)}
            />
          </div>
        </div>
      )}

      {/* Trailer modal */}
      {showTrailer && movie.trailer?.videoAddress?.url && (
        <div
          className="fixed inset-0 z-[9999] bg-black/95 flex flex-col"
          style={{ animation: "fadeIn 0.2s ease" }}
        >
          <div className="flex items-center justify-between px-4 py-3 bg-black/80 border-b border-neon-magenta/20 flex-shrink-0">
            <div>
              <p className="font-display text-xs tracking-widest text-neon-magenta">TRAILER</p>
              <p className="font-body text-sm text-white truncate">{movie.title}</p>
            </div>
            <button
              onClick={() => setShowTrailer(false)}
              className="p-2 text-white/70 hover:text-neon-magenta transition-colors"
              aria-label="Close trailer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex-1 flex items-center justify-center bg-black p-4">
            <video
              src={movie.trailer.videoAddress.url}
              controls
              autoPlay
              className="w-full max-w-4xl max-h-full rounded-sm"
              style={{ aspectRatio: "16/9" }}
            />
          </div>
        </div>
      )}

      {/* Cast */}
      {movie.staffList && movie.staffList.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 py-6">
          <h2 className="font-display text-sm font-bold tracking-widest text-neon-cyan mb-4">TOP CAST</h2>
          <div className="flex gap-5 overflow-x-auto hide-scrollbar pb-2">
            {movie.staffList.slice(0, 15).map((staff, i) => (
              <div key={i} className="flex-shrink-0 text-center w-24">
                <div className="w-20 h-20 mx-auto rounded-full overflow-hidden border-2 border-border hover:border-neon-cyan transition-colors bg-dark-elevated">
                  {staff.avatar?.url ? (
                    <img src={staff.avatar.url} alt={staff.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground text-lg font-display font-bold">
                      {staff.name?.charAt(0)}
                    </div>
                  )}
                </div>
                <p className="text-xs font-body font-semibold text-foreground mt-2 truncate">{staff.name}</p>
                <p className="text-xs text-muted-foreground truncate">{staff.role}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommended */}
      {recommended.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 py-6 pb-12">
          <MovieRow
            title="MORE LIKE THIS"
            movies={recommended}
            accentColor="magenta"
          />
        </div>
      )}
    </div>
  );
};

export default MovieDetail;
