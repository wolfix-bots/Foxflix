import { useQuery } from "@tanstack/react-query";
import { TrendingUp, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import Navbar from "@/components/Navbar";
import MovieCard from "@/components/MovieCard";

const TrendingPage = () => {
  const { data, isLoading } = useQuery({
    queryKey: ["trending-page"],
    queryFn: () => api.getTrending(0, 18),
  });

  const movies = data?.data?.subjectList || [];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <TrendingUp className="w-6 h-6 text-neon-cyan" />
          <div>
            <h1 className="font-display text-2xl font-bold text-neon-cyan glow-text-cyan tracking-widest">
              TRENDING
            </h1>
            <p className="text-xs text-muted-foreground font-body">Most watched this week</p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 text-neon-cyan animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {movies.map((movie) => (
              <MovieCard key={movie.subjectId} movie={movie} size="sm" />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TrendingPage;
