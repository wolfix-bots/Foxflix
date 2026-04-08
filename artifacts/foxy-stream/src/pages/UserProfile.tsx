import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { User, Tv, Loader2, AlertCircle } from "lucide-react";
import { bff } from "@/lib/bff";
import Navbar from "@/components/Navbar";

const UserProfile = () => {
  const { username } = useParams<{ username: string }>();

  const { data, isLoading, error } = useQuery({
    queryKey: ["public-profile", username],
    queryFn: () => bff.user.getPublicProfile(username!),
    enabled: !!username,
  });

  if (isLoading) return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 text-neon-cyan animate-spin" />
      </div>
    </div>
  );

  if (error || !data) return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="flex flex-col items-center justify-center h-96 gap-3">
        <AlertCircle className="w-10 h-10 text-destructive" />
        <p className="font-display text-sm text-muted-foreground">USER NOT FOUND</p>
      </div>
    </div>
  );

  const hasActiveRoom = data.room && (data.room.status === "playing" || data.room.status === "idle");

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="flex flex-col items-center gap-6">
          <div className="w-24 h-24 rounded-full bg-dark-elevated border-2 border-neon-cyan/30 flex items-center justify-center">
            <User className="w-12 h-12 text-neon-cyan" />
          </div>
          <div className="text-center">
            <h1 className="font-display text-2xl font-black text-foreground">{data.username.toUpperCase()}</h1>
            <p className="text-xs text-muted-foreground font-body mt-1">
              Member since {new Date(data.createdAt * 1000).toLocaleDateString()}
            </p>
          </div>

          {hasActiveRoom && data.room && (
            <div className="w-full max-w-md p-5 bg-dark-elevated border border-neon-cyan/20 rounded-sm text-center space-y-3">
              <div className="flex items-center justify-center gap-2">
                <div className={`w-2 h-2 rounded-full ${data.room.status === "playing" ? "bg-neon-cyan animate-pulse" : "bg-muted-foreground"}`} />
                <p className="font-display text-xs tracking-widest text-neon-cyan">
                  {data.room.status === "playing" ? "LIVE NOW" : "ROOM IDLE"}
                </p>
              </div>
              <p className="text-sm font-body text-foreground">{data.room.name}</p>
              <Link
                to={`/room/${data.room.id}`}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground font-display text-sm rounded-sm hover:shadow-neon-cyan transition-all"
              >
                <Tv className="w-4 h-4" />
                JOIN ROOM
              </Link>
            </div>
          )}

          {!hasActiveRoom && (
            <p className="text-sm text-muted-foreground font-body text-center">
              {data.username} doesn't have an active room right now.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserProfile;
