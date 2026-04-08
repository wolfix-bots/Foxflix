import { useQuery } from "@tanstack/react-query";
import { Zap, Loader2, ExternalLink } from "lucide-react";
import { api } from "@/lib/api";
import Navbar from "@/components/Navbar";

const LatestPage = () => {
  const { data, isLoading } = useQuery({
    queryKey: ["latest"],
    queryFn: () => api.getLatest(1),
  });

  const items = data?.data || [];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <Zap className="w-6 h-6 text-neon-magenta" />
          <div>
            <h1 className="font-display text-2xl font-bold text-neon-magenta glow-text-magenta tracking-widest">
              LATEST RELEASES
            </h1>
            <p className="text-xs text-muted-foreground font-body">Freshest content just dropped</p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 text-neon-magenta animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {items.map((item, i) => (
              <div key={i} className="group cursor-pointer cyber-border rounded-sm overflow-hidden hover:border-neon-magenta hover:shadow-neon-magenta transition-all">
                <div className="aspect-[2/3] relative overflow-hidden bg-dark-elevated">
                  {item.thumbnail ? (
                    <img
                      src={item.thumbnail}
                      alt={item.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      loading="lazy"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Zap className="w-8 h-8 text-muted-foreground" />
                    </div>
                  )}
                  <div className="absolute top-2 left-2">
                    <span className="px-1.5 py-0.5 text-xs font-display bg-accent/80 text-accent-foreground rounded-sm">
                      {item.category || item.type?.toUpperCase()}
                    </span>
                  </div>
                  <div className="absolute inset-0 bg-gradient-overlay pointer-events-none" />
                </div>
                <div className="p-2 bg-dark-surface">
                  <p className="text-xs font-body font-semibold text-foreground truncate group-hover:text-neon-magenta transition-colors">
                    {item.title}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default LatestPage;
