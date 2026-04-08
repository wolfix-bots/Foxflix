import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Flame, Loader2, AlertCircle } from "lucide-react";
import { api } from "@/lib/api";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import MovieRow from "@/components/MovieRow";
import type { MovieSubject } from "@/lib/api";

// AI-curated genres — xcasper search populates each one
const AI_GENRES = [
  { label: "🎌 ANIME",       keyword: "anime",    type: 2, accent: "magenta" as const },
  { label: "💥 ACTION",      keyword: "action",   type: 1, accent: "cyan"    as const },
  { label: "😱 HORROR",      keyword: "horror",   type: 1, accent: "magenta" as const },
  { label: "🚀 SCI-FI",      keyword: "sci-fi",   type: 1, accent: "cyan"    as const },
  { label: "😂 COMEDY",      keyword: "comedy",   type: 1, accent: "magenta" as const },
  { label: "💕 ROMANCE",     keyword: "romance",  type: 1, accent: "cyan"    as const },
  { label: "🔍 THRILLER",    keyword: "thriller", type: 1, accent: "magenta" as const },
  { label: "🧒 ANIMATION",   keyword: "cartoon",  type: 2, accent: "cyan"    as const },
];

interface GenreRow {
  label: string;
  accent: "cyan" | "magenta";
  movies: MovieSubject[];
}

const Index = () => {
  const { data: hotData, isLoading: hotLoading, error: hotError } = useQuery({
    queryKey: ["hot"],
    queryFn: api.getHot,
  });

  const { data: trendingData, isLoading: trendingLoading } = useQuery({
    queryKey: ["trending"],
    queryFn: () => api.getTrending(0, 18),
  });

  const [genreRows, setGenreRows] = useState<GenreRow[]>([]);

  const hotMovies: MovieSubject[] = hotData?.data?.movie || [];
  const hotTV: MovieSubject[] = hotData?.data?.tv || [];
  const trending: MovieSubject[] = trendingData?.data?.subjectList || [];

  const heroMovies = [...hotMovies.slice(0, 4), ...trending.slice(0, 2)].filter(
    (m) => m.stills?.url || m.cover?.url
  );

  // Fetch AI-curated genre rows after hot data loads — sequential to avoid hammering the API
  useEffect(() => {
    if (hotLoading || trendingLoading) return;
    let cancelled = false;
    const fetchGenres = async () => {
      const results: GenreRow[] = [];
      for (const genre of AI_GENRES) {
        if (cancelled) break;
        try {
          const res = await api.search(genre.keyword, 1, 14, genre.type);
          const movies = res.data?.items || [];
          if (movies.length >= 4) {
            results.push({ label: genre.label, accent: genre.accent, movies });
            if (!cancelled) setGenreRows([...results]);
          }
        } catch { /* skip genre if search fails */ }
        // Small delay between requests to avoid rate-limiting
        await new Promise(r => setTimeout(r, 300));
      }
    };
    fetchGenres();
    return () => { cancelled = true; };
  }, [hotLoading, trendingLoading]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero */}
      {hotLoading ? (
        <div className="flex items-center justify-center h-96">
          <div className="text-center space-y-4">
            <Loader2 className="w-10 h-10 text-neon-cyan animate-spin mx-auto" />
            <p className="font-display text-sm text-muted-foreground tracking-widest animate-pulse">
              LOADING STREAMS...
            </p>
          </div>
        </div>
      ) : hotError ? (
        <div className="flex items-center justify-center h-48">
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="w-5 h-5" />
            <span className="font-display text-sm">Failed to load content</span>
          </div>
        </div>
      ) : (
        <HeroSection movies={heroMovies} />
      )}

      {/* Content rows */}
      <div className="max-w-7xl mx-auto px-4 py-10 space-y-12">
        {hotMovies.length > 0 && (
          <MovieRow title="🔥 HOT MOVIES" subtitle="Currently trending worldwide" movies={hotMovies} accentColor="cyan" />
        )}
        {hotTV.length > 0 && (
          <MovieRow title="📺 HOT SERIES" subtitle="Binge-worthy shows right now" movies={hotTV} accentColor="magenta" />
        )}
        {trending.length > 0 && (
          <MovieRow title="⚡ TRENDING" subtitle="Most watched this week" movies={trending} accentColor="cyan" showRank />
        )}

        {/* AI-curated genre rows — appear progressively as they load */}
        {genreRows.map((row) => (
          <MovieRow key={row.label} title={row.label} movies={row.movies} accentColor={row.accent} />
        ))}

        {/* Hint while genres are still loading */}
        {genreRows.length === 0 && !hotLoading && (
          <div className="flex items-center gap-2 text-muted-foreground/50">
            <Flame className="w-4 h-4 animate-pulse" />
            <span className="font-display text-xs tracking-widest">AI IS CURATING MORE GENRES...</span>
          </div>
        )}

        <footer className="border-t border-border pt-8 pb-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="font-display text-xs text-muted-foreground tracking-widest">© 2025 FOXYSTREAM</p>
            <div className="flex items-center gap-3">
              <span className="text-xs font-display text-muted-foreground">POWERED BY</span>
              <span className="px-2 py-1 text-xs font-display border border-neon-cyan/30 text-neon-cyan rounded-sm tracking-wider">FOXY TECH</span>
              <span className="px-2 py-1 text-xs font-display border border-neon-magenta/30 text-neon-magenta rounded-sm tracking-wider">CASPER TECH KENYA</span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default Index;
