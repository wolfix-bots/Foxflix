import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { X, Tv, Play, Clock, Search } from "lucide-react";
import { bff } from "@/lib/bff";
import { useNavigate } from "react-router-dom";
import type { RoomSummary } from "@/lib/bff";

interface RoomsPanelProps {
  onClose: () => void;
}

const RoomsPanel = ({ onClose }: RoomsPanelProps) => {
  const [tab, setTab] = useState<"playing" | "idle">("playing");
  const [search, setSearch] = useState("");
  const navigate = useNavigate();

  const { data: rooms = [], isLoading } = useQuery({
    queryKey: ["rooms", tab],
    queryFn: () => bff.rooms.list({ status: tab }),
    refetchInterval: 10000,
  });

  const filtered = rooms.filter((r: RoomSummary) =>
    !search || r.name.toLowerCase().includes(search.toLowerCase()) ||
    r.host_username.toLowerCase().includes(search.toLowerCase())
  );

  const joinRoom = (room: RoomSummary) => {
    onClose();
    navigate(`/room/${room.id}`);
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-lg mx-4 mb-4 sm:mb-0 bg-dark-elevated border border-neon-cyan/20 rounded-sm max-h-[80vh] flex flex-col"
        onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-2">
            <Tv className="w-4 h-4 text-neon-cyan" />
            <h2 className="font-display text-sm tracking-widest text-neon-cyan">LIVE ROOMS</h2>
          </div>
          <button onClick={onClose}><X className="w-4 h-4 text-muted-foreground" /></button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border flex-shrink-0">
          {([
            { key: "playing" as const, label: "PLAYING NOW", icon: Play },
            { key: "idle" as const, label: "IDLE ROOMS", icon: Clock },
          ]).map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => setTab(key)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-display tracking-wider transition-colors ${
                tab === key ? "text-neon-cyan border-b-2 border-neon-cyan" : "text-muted-foreground hover:text-foreground"
              }`}>
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="px-4 py-3 border-b border-border flex-shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search rooms..."
              className="w-full pl-9 pr-4 py-2 bg-background border border-border rounded-sm text-xs font-body text-foreground placeholder:text-muted-foreground focus:border-neon-cyan focus:outline-none"
            />
          </div>
        </div>

        {/* Room list */}
        <div className="overflow-y-auto flex-1">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-neon-cyan/30 border-t-neon-cyan rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12">
              <Tv className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
              <p className="font-display text-xs text-muted-foreground tracking-wider">
                {tab === "playing" ? "NO ROOMS PLAYING" : "NO IDLE ROOMS"}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filtered.map((room: RoomSummary) => {
                const currentItem = room.current_item as Record<string, string> | null;
                return (
                  <button
                    key={room.id}
                    onClick={() => joinRoom(room)}
                    className="w-full flex items-center gap-4 px-5 py-4 hover:bg-neon-cyan/5 transition-colors text-left"
                  >
                    {currentItem?.cover ? (
                      <img src={currentItem.cover} alt="" className="w-10 h-14 object-cover rounded-sm flex-shrink-0 border border-border" />
                    ) : (
                      <div className="w-10 h-14 bg-dark-surface rounded-sm flex-shrink-0 flex items-center justify-center border border-border">
                        <Tv className="w-4 h-4 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-display text-sm text-foreground truncate">{room.name}</p>
                      <p className="text-xs text-muted-foreground font-body mt-0.5">by {room.host_username}</p>
                      {currentItem?.title && (
                        <p className="text-xs text-neon-cyan/70 font-body mt-1 truncate">
                          {tab === "playing" ? "▶ " : "⏸ "}{currentItem.title}
                        </p>
                      )}
                    </div>
                    <div className={`flex-shrink-0 w-2 h-2 rounded-full ${
                      tab === "playing" ? "bg-neon-cyan animate-pulse" : "bg-muted-foreground"
                    }`} />
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RoomsPanel;
