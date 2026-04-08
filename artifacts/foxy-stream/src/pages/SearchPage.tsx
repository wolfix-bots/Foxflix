import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Search, Filter } from "lucide-react";
import { useState } from "react";
import { api } from "@/lib/api";
import Navbar from "@/components/Navbar";
import MovieCard from "@/components/MovieCard";
import { Skeleton } from "@/components/ui/skeleton";

const SearchPage = () => {
  const [searchParams] = useSearchParams();
  const q = searchParams.get("q") || "";
  const [filter, setFilter] = useState<number | undefined>(undefined);

  const { data, isLoading } = useQuery({
    queryKey: ["search", q, filter],
    queryFn: () => api.search(q, 1, 20, filter),
    enabled: !!q,
  });

  const results = data?.data?.items || [];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <Search className="w-5 h-5 text-neon-cyan" />
            <div>
              <h1 className="font-display text-xl font-bold text-foreground tracking-wider">
                SEARCH RESULTS
              </h1>
              <p className="text-xs text-muted-foreground font-body">
                {q ? <>Showing results for <span className="text-neon-cyan">"{q}"</span></> : "Enter a search term"}
              </p>
            </div>
          </div>

          {/* Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <div className="flex gap-1">
              {[
                { label: "ALL", value: undefined },
                { label: "MOVIES", value: 1 },
                { label: "TV", value: 2 },
              ].map(({ label, value }) => (
                <button
                  key={label}
                  onClick={() => setFilter(value)}
                  className={`px-3 py-1 text-xs font-display rounded-sm border transition-all ${
                    filter === value
                      ? "border-neon-cyan text-neon-cyan bg-neon-cyan/5 shadow-neon-subtle"
                      : "border-border text-muted-foreground hover:border-primary hover:text-foreground"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {!q ? (
          <div className="text-center py-20">
            <Search className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-30" />
            <p className="font-display text-muted-foreground tracking-widest">SEARCH FOR MOVIES & SERIES</p>
          </div>
        ) : isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="flex flex-col gap-2">
                <Skeleton className="aspect-[2/3] w-full rounded-sm" />
                <Skeleton className="h-3 w-3/4 rounded-sm" />
                <Skeleton className="h-3 w-1/2 rounded-sm" />
              </div>
            ))}
          </div>
        ) : results.length === 0 ? (
          <div className="text-center py-20">
            <p className="font-display text-muted-foreground tracking-widest">NO RESULTS FOUND</p>
            <p className="text-sm text-muted-foreground font-body mt-2">Try a different keyword</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {results.map((movie) => (
              <MovieCard key={movie.subjectId} movie={movie} size="sm" />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchPage;
