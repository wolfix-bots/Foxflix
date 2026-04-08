import { useState, useRef, useEffect } from "react";
import { Search, X, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import type { MovieSubject } from "@/lib/api";
import { Link } from "react-router-dom";

const SearchBar = () => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MovieSubject[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounce = useRef<ReturnType<typeof setTimeout>>();
  const navigate = useNavigate();

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setOpen(false);
      return;
    }
    clearTimeout(debounce.current);
    debounce.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await api.search(query, 1, 8);
        setResults(res.data?.items || []);
        setOpen(true);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 400);
  }, [query]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/search?q=${encodeURIComponent(query)}`);
      setOpen(false);
    }
  };

  const clear = () => {
    setQuery("");
    setResults([]);
    setOpen(false);
    inputRef.current?.focus();
  };

  return (
    <div className="relative w-full max-w-md">
      <form onSubmit={handleSubmit} className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder="Search movies, series..."
          className="w-full pl-9 pr-9 py-2 bg-dark-elevated border border-border rounded-sm text-sm font-body text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:shadow-neon-subtle transition-all"
        />
        {(query || loading) && (
          <button
            type="button"
            onClick={clear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <X className="w-4 h-4" />
            )}
          </button>
        )}
      </form>

      {/* Dropdown results */}
      {open && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-dark-surface border border-border rounded-sm overflow-hidden z-50 shadow-card">
          {results.map((movie) => (
            <Link
              key={movie.subjectId}
              to={`/movie/${movie.subjectId}`}
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-3 py-2 hover:bg-dark-elevated transition-colors group"
            >
              {movie.cover?.url && (
                <img
                  src={movie.cover.url}
                  alt={movie.title}
                  className="w-8 h-12 object-cover rounded-sm flex-shrink-0"
                />
              )}
              <div className="min-w-0">
                <p className="text-sm font-body font-semibold text-foreground group-hover:text-neon-cyan truncate transition-colors">
                  {movie.title}
                </p>
                <p className="text-xs text-muted-foreground">
                  {movie.subjectType === 2 ? "TV Series" : "Movie"} · {movie.releaseDate?.slice(0, 4)}
                </p>
              </div>
            </Link>
          ))}
          <Link
            to={`/search?q=${encodeURIComponent(query)}`}
            onClick={() => setOpen(false)}
            className="block px-3 py-2 text-xs text-center text-neon-cyan hover:bg-dark-elevated transition-colors border-t border-border"
          >
            View all results for "{query}"
          </Link>
        </div>
      )}
    </div>
  );
};

export default SearchBar;
