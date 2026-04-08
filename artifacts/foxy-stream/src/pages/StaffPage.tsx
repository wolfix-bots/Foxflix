import { useCallback, useRef, useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Loader2, AlertCircle, User } from "lucide-react";
import Navbar from "@/components/Navbar";
import MovieCard from "@/components/MovieCard";
import { api } from "@/lib/api";
import type { MovieSubject } from "@/lib/api";

const AI_API = "https://apis.xwolf.space/api/ai/claude";

const StaffPage = () => {
  const [params] = useSearchParams();
  const staffName = params.get("name") || "";
  const navigate = useNavigate();
  const [works, setWorks] = useState<MovieSubject[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [bio, setBio] = useState<string | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const { isLoading: worksLoading } = useQuery({
    queryKey: ["staff-works", staffName],
    enabled: !!staffName,
    queryFn: async () => {
      const res = await api.search(staffName, 1, 12);
      setWorks(res.data?.items || []);
      setHasMore(res.data?.pager?.hasMore ?? false);
      setPage(1);
      // Fetch bio from AI
      const prompt = `Give me a brief 2-sentence bio for the actor/director "${staffName}". Be factual and concise.`;
      fetch(`${AI_API}?q=${encodeURIComponent(prompt)}`)
        .then(r => r.json())
        .then(d => { if (d.status && d.result) setBio(d.result); })
        .catch(() => {});
      return res;
    },
  });

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;
    setLoading(true);
    try {
      const nextPage = page + 1;
      const res = await api.search(staffName, nextPage, 12);
      setWorks(prev => {
        const ids = new Set(prev.map(m => m.subjectId));
        return [...prev, ...(res.data?.items || []).filter((m: MovieSubject) => !ids.has(m.subjectId))];
      });
      setHasMore(res.data?.pager?.hasMore ?? false);
      setPage(nextPage);
    } catch {}
    setLoading(false);
  }, [loading, hasMore, page, staffName]);

  const sentinelRef = useCallback((node: HTMLDivElement | null) => {
    if (observerRef.current) observerRef.current.disconnect();
    if (!node) return;
    observerRef.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) loadMore();
    });
    observerRef.current.observe(node);
  }, [loadMore]);

  if (!staffName) return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <AlertCircle className="w-10 h-10 text-destructive" />
        <p className="font-display text-sm text-muted-foreground">NO STAFF NAME PROVIDED</p>
        <button onClick={() => navigate(-1)} className="text-neon-cyan text-xs font-display flex items-center gap-1">
          <ArrowLeft className="w-3 h-3" />BACK
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-8">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 mb-6 text-muted-foreground hover:text-foreground text-xs font-display">
          <ArrowLeft className="w-4 h-4" />BACK
        </button>

        {/* Staff header */}
        <div className="flex items-start gap-6 mb-10">
          <div className="w-24 h-24 rounded-full bg-dark-elevated border-2 border-neon-cyan/30 flex items-center justify-center flex-shrink-0">
            <User className="w-10 h-10 text-muted-foreground" />
          </div>
          <div>
            <h1 className="font-display text-2xl md:text-3xl font-black text-foreground tracking-wide">{staffName}</h1>
            {bio && <p className="text-sm font-body text-muted-foreground mt-2 max-w-xl leading-relaxed">{bio}</p>}
          </div>
        </div>

        {/* Works */}
        <h2 className="font-display text-xs tracking-widest text-neon-cyan mb-4">WORKS</h2>
        {worksLoading ? (
          <div className="flex justify-center py-10"><Loader2 className="w-8 h-8 text-neon-cyan animate-spin" /></div>
        ) : works.length === 0 ? (
          <div className="text-center py-10">
            <p className="font-display text-sm text-muted-foreground">NO WORKS FOUND</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {works.map((m, i) => <MovieCard key={`${m.subjectId}-${i}`} movie={m} />)}
          </div>
        )}
        <div ref={sentinelRef} className="h-4 mt-2" />
        {loading && <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 text-neon-cyan animate-spin" /></div>}
      </div>
    </div>
  );
};

export default StaffPage;
