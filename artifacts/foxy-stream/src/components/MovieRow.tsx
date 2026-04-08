import { useRef, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import MovieCard from "./MovieCard";
import type { MovieSubject } from "@/lib/api";

interface MovieRowProps {
  title: string;
  subtitle?: string;
  movies: MovieSubject[];
  accentColor?: "cyan" | "magenta";
  autoScroll?: boolean;
  showRank?: boolean;
}

const MovieRow = ({ title, subtitle, movies, accentColor = "cyan", autoScroll = true, showRank = false }: MovieRowProps) => {
  const rowRef = useRef<HTMLDivElement>(null);
  const isPaused = useRef(false);

  const scroll = (direction: "left" | "right") => {
    if (!rowRef.current) return;
    isPaused.current = true;
    setTimeout(() => { isPaused.current = false; }, 8000);
    rowRef.current.scrollBy({ left: direction === "right" ? 400 : -400, behavior: "smooth" });
  };

  useEffect(() => {
    if (!autoScroll) return;
    const timer = setInterval(() => {
      if (isPaused.current || !rowRef.current) return;
      const { scrollLeft, scrollWidth, clientWidth } = rowRef.current;
      if (scrollLeft + clientWidth >= scrollWidth - 20) {
        rowRef.current.scrollTo({ left: 0, behavior: "smooth" });
      } else {
        rowRef.current.scrollBy({ left: 320, behavior: "smooth" });
      }
    }, 3500);
    return () => clearInterval(timer);
  }, [autoScroll]);

  const handleMouseEnter = () => { isPaused.current = true; };
  const handleMouseLeave = () => { isPaused.current = false; };

  const accentClass = accentColor === "cyan"
    ? "text-neon-cyan glow-text-cyan border-neon-cyan"
    : "text-neon-magenta glow-text-magenta border-neon-magenta";

  if (!movies || movies.length === 0) return null;

  return (
    <section className="space-y-4">
      <div className="flex items-end justify-between">
        <div>
          <h2 className={`font-display text-lg font-bold tracking-widest ${accentClass}`}>{title}</h2>
          {subtitle && <p className="text-xs text-muted-foreground font-body mt-0.5">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => scroll("left")}
            className="p-1.5 border border-border rounded-sm text-muted-foreground hover:text-foreground hover:border-primary transition-all">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button onClick={() => scroll("right")}
            className="p-1.5 border border-border rounded-sm text-muted-foreground hover:text-foreground hover:border-primary transition-all">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div
        ref={rowRef}
        className="flex gap-3 overflow-x-auto hide-scrollbar pb-2"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleMouseEnter}
        onTouchEnd={() => { setTimeout(() => { isPaused.current = false; }, 5000); }}
      >
        {movies.map((movie, i) => (
          <MovieCard key={movie.subjectId} movie={movie} size="md" rank={showRank ? i + 1 : undefined} />
        ))}
      </div>
    </section>
  );
};

export default MovieRow;
