import { useState, useEffect } from "react";
import { Play, Star, Clock, ChevronLeft, ChevronRight, Info } from "lucide-react";
import { Link } from "react-router-dom";
import type { MovieSubject } from "@/lib/api";
import { formatDuration } from "@/lib/api";

interface HeroSectionProps {
  movies: MovieSubject[];
}

const HeroSection = ({ movies }: HeroSectionProps) => {
  const [current, setCurrent] = useState(0);
  const [transitioning, setTransitioning] = useState(false);
  const featured = movies.slice(0, 6);

  useEffect(() => {
    const timer = setInterval(() => {
      goNext();
    }, 6000);
    return () => clearInterval(timer);
  }, [current, featured.length]);

  const go = (index: number) => {
    if (transitioning) return;
    setTransitioning(true);
    setTimeout(() => {
      setCurrent(index);
      setTransitioning(false);
    }, 300);
  };

  const goPrev = () => go((current - 1 + featured.length) % featured.length);
  const goNext = () => go((current + 1) % featured.length);

  if (!featured.length) return null;

  const movie = featured[current];

  return (
    <div className="relative w-full overflow-hidden" style={{ height: "clamp(420px, 60vh, 680px)" }}>
      {/* Background image */}
      <div
        className={`absolute inset-0 transition-opacity duration-500 ${transitioning ? "opacity-0" : "opacity-100"}`}
      >
        {movie.stills?.url || movie.cover?.url ? (
          <img
            src={movie.stills?.url || movie.cover?.url}
            alt={movie.title}
            className="w-full h-full object-cover object-center scale-105"
          />
        ) : (
          <div className="w-full h-full bg-dark-elevated" />
        )}
      </div>

      {/* Gradients */}
      <div className="absolute inset-0 bg-gradient-to-r from-background via-background/70 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />

      {/* Cyberpunk grid overlay */}
      <div
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: "linear-gradient(hsl(183 100% 50% / 0.3) 1px, transparent 1px), linear-gradient(90deg, hsl(183 100% 50% / 0.3) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      {/* Content */}
      <div
        className={`absolute inset-0 flex items-center transition-opacity duration-500 ${transitioning ? "opacity-0" : "opacity-100"}`}
      >
        <div className="max-w-7xl mx-auto px-4 w-full">
          <div className="max-w-2xl space-y-4">
            {/* Genre tags */}
            {movie.genre && (
              <div className="flex flex-wrap gap-2">
                {movie.genre.split(",").slice(0, 3).map((g) => (
                  <span
                    key={g}
                    className="px-2 py-0.5 text-xs font-display border border-neon-cyan/30 text-neon-cyan rounded-sm tracking-wider"
                  >
                    {g.trim()}
                  </span>
                ))}
              </div>
            )}

            {/* Title */}
            <h1 className="font-display text-3xl md:text-5xl font-black text-foreground leading-tight tracking-wide">
              {movie.title}
            </h1>

            {/* Meta */}
            <div className="flex items-center gap-4 text-sm font-body">
              {movie.imdbRatingValue && parseFloat(movie.imdbRatingValue) > 0 && (
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 text-neon-yellow fill-current" />
                  <span className="text-neon-yellow font-semibold">{movie.imdbRatingValue}</span>
                </div>
              )}
              {movie.releaseDate && (
                <span className="text-muted-foreground">{new Date(movie.releaseDate).getFullYear()}</span>
              )}
              {movie.duration > 0 && (
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  {formatDuration(movie.duration)}
                </div>
              )}
              {movie.countryName && (
                <span className="text-muted-foreground">{movie.countryName}</span>
              )}
              <span className="px-2 py-0.5 text-xs font-display border border-border text-muted-foreground rounded-sm">
                {movie.subjectType === 2 ? "TV SERIES" : "MOVIE"}
              </span>
            </div>

            {/* Description */}
            {movie.description && (
              <p className="text-sm font-body text-muted-foreground leading-relaxed line-clamp-3 max-w-lg">
                {movie.description}
              </p>
            )}

            {/* Buttons */}
            <div className="flex items-center gap-3 pt-2">
              <Link
                to={`/movie/${movie.subjectId}`}
                className="flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground font-display text-sm tracking-wider rounded-sm hover:shadow-neon-cyan hover:scale-105 transition-all clip-cyber"
              >
                <Play className="w-4 h-4 fill-current" />
                WATCH NOW
              </Link>
              <Link
                to={`/movie/${movie.subjectId}`}
                className="flex items-center gap-2 px-6 py-2.5 border border-border text-foreground font-display text-sm tracking-wider rounded-sm hover:border-primary hover:text-neon-cyan transition-all"
              >
                <Info className="w-4 h-4" />
                DETAILS
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Slide indicators */}
      <div className="absolute bottom-6 right-6 flex items-center gap-3">
        <button onClick={goPrev} className="p-1.5 border border-border rounded-sm text-muted-foreground hover:border-primary hover:text-neon-cyan transition-all">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="flex gap-1.5">
          {featured.map((_, i) => (
            <button
              key={i}
              onClick={() => go(i)}
              className={`transition-all rounded-full ${i === current ? "w-6 h-2 bg-neon-cyan shadow-neon-cyan" : "w-2 h-2 bg-border hover:bg-muted-foreground"}`}
            />
          ))}
        </div>
        <button onClick={goNext} className="p-1.5 border border-border rounded-sm text-muted-foreground hover:border-primary hover:text-neon-cyan transition-all">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Side poster */}
      <div className="absolute right-4 md:right-16 top-1/2 -translate-y-1/2 hidden lg:block">
        <div className={`w-32 rounded-sm cyber-border overflow-hidden shadow-card transition-opacity duration-500 ${transitioning ? "opacity-0" : "opacity-100"}`}>
          <img
            src={movie.cover?.url}
            alt={movie.title}
            className="w-full aspect-[2/3] object-cover"
          />
        </div>
      </div>
    </div>
  );
};

export default HeroSection;
