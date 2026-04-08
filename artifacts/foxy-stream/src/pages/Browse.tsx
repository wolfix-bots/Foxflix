import { useState, useCallback, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Filter, Loader2, AlertCircle } from "lucide-react";
import { api } from "@/lib/api";
import type { MovieSubject } from "@/lib/api";
import Navbar from "@/components/Navbar";
import MovieCard from "@/components/MovieCard";

const GENRES = ["Action", "Comedy", "Drama", "Horror", "Romance", "Sci-Fi", "Thriller", "Animation", "Fantasy", "Mystery", "Crime", "Adventure", "Documentary"];
const COUNTRIES = ["United States", "China", "Japan", "Korea", "UK", "France", "India", "Italy", "Spain", "Germany"];

const Browse = () => {
  const [genreFilter, setGenreFilter] = useState<string[]>([]);
  const [typeFilter, setTypeFilter] = useState<number | null>(null);
  const [movies, setMovies] = useState<MovieSubject[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const keyword = genreFilter.length > 0 ? genreFilter.join(" ") : "movie";

  const { data: initialData, isLoading: initialLoading } = useQuery({
    queryKey: ["browse", keyword, typeFilter],
    queryFn: async () => {
      const res = await api.search(keyword, 1, 18, typeFilter ?? undefined);
      setMovies(res.data?.items || []);
      setHasMore(res.data?.pager?.hasMore ?? false);
      setPage(1);
      return res;
    },
  });

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;
    setLoading(true);
    try {
      const nextPage = page + 1;
      const res = await api.search(keyword, nextPage, 18, typeFilter ?? undefined);
      setMovies(prev => {
        const ids = new Set(prev.map(m => m.subjectId));
        const newItems = (res.data?.items || []).filter((m: MovieSubject) => !ids.has(m.subjectId));
        return [...prev, ...newItems];
      });
      setHasMore(res.data?.pager?.hasMore ?? false);
      setPage(nextPage);
    } catch {}
    setLoading(false);
  }, [loading, hasMore, page, keyword, typeFilter]);

  const sentinelRef = useCallback((node: HTMLDivElement | null) => {
    if (observerRef.current) observerRef.current.disconnect();
    if (!node) return;
    observerRef.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) loadMore();
    }, { threshold: 0.1 });
    observerRef.current.observe(node);
  }, [loadMore]);

  const toggleGenre = (g: string) => {
    setGenreFilter(prev => prev.includes(g) ? prev.filter(x => x !== g) : [...prev, g]);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex items-center gap-2 mb-6">
          <Filter className="w-4 h-4 text-neon-cyan" />
          <h1 className="font-display text-sm tracking-widest text-neon-cyan">BROWSE CONTENT</h1>
          <button onClick={() => setSidebarOpen(o => !o)} className="ml-auto text-xs font-display text-muted-foreground">
            {sidebarOpen ? "HIDE FILTERS" : "SHOW FILTERS"}
          </button>
        </div>

        <div className="flex gap-6">
          {/* Sidebar */}
          {sidebarOpen && (
            <aside className="w-52 flex-shrink-0 space-y-6">
              {/* Type */}
              <div>
                <h3 className="font-display text-xs tracking-widest text-muted-foreground mb-3">TYPE</h3>
                <div className="space-y-1.5">
                  {[{ label: "ALL", value: null }, { label: "MOVIES", value: 1 }, { label: "SERIES", value: 2 }].map(({ label, value }) => (
                    <button
                      key={label}
                      onClick={() => setTypeFilter(value)}
                      className={`w-full text-left px-3 py-1.5 rounded-sm text-xs font-display transition-colors ${
                        typeFilter === value ? "text-neon-cyan bg-neon-cyan/10 border border-neon-cyan/30" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Genres */}
              <div>
                <h3 className="font-display text-xs tracking-widest text-muted-foreground mb-3">GENRE</h3>
                <div className="space-y-1.5">
                  {GENRES.map(g => (
                    <button
                      key={g}
                      onClick={() => toggleGenre(g)}
                      className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-sm text-xs font-body transition-colors ${
                        genreFilter.includes(g)
                          ? "text-neon-cyan bg-neon-cyan/10 border border-neon-cyan/30"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <span className={`w-3 h-3 rounded-sm border flex-shrink-0 flex items-center justify-center ${
                        genreFilter.includes(g) ? "border-neon-cyan bg-neon-cyan/30" : "border-muted-foreground"
                      }`}>
                        {genreFilter.includes(g) && <span className="text-neon-cyan text-[8px]">✓</span>}
                      </span>
                      {g}
                    </button>
                  ))}
                </div>
              </div>
            </aside>
          )}

          {/* Results */}
          <div className="flex-1 min-w-0">
            {initialLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 text-neon-cyan animate-spin" />
              </div>
            ) : movies.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <AlertCircle className="w-8 h-8 text-muted-foreground" />
                <p className="font-display text-sm text-muted-foreground">NO RESULTS</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {movies.map((movie, i) => (
                  <MovieCard key={`${movie.subjectId}-${i}`} movie={movie} />
                ))}
              </div>
            )}

            {/* Infinite scroll sentinel */}
            <div ref={sentinelRef} className="h-4 mt-4" />
            {loading && (
              <div className="flex justify-center py-6">
                <Loader2 className="w-6 h-6 text-neon-cyan animate-spin" />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Browse;
