import { useState, useRef, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Menu, X, Flame, TrendingUp, Zap, Bot, Tv, User, LogOut, Settings, ChevronDown, Filter } from "lucide-react";
import foxLogo from "@/assets/fox-logo.png";
import SearchBar from "./SearchBar";
import AiChat from "./AiChat";
import LoginModal from "./LoginModal";
import RoomsPanel from "./RoomsPanel";
import { useAuth } from "@/contexts/AuthContext";

const Navbar = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [roomsOpen, setRoomsOpen] = useState(false);
  const [userDropOpen, setUserDropOpen] = useState(false);
  const { user, logout } = useAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const dropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) {
        setUserDropOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const navLinks = [
    { label: "HOT", href: "/", icon: Flame },
    { label: "TRENDING", href: "/trending", icon: TrendingUp },
    { label: "LATEST", href: "/latest", icon: Zap },
    { label: "BROWSE", href: "/browse", icon: Filter },
  ];

  return (
    <>
      <nav className="sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 flex-shrink-0">
            <img src={foxLogo} alt="FoxyStream" className="w-8 h-8 object-contain" />
            <div className="hidden sm:block">
              <span className="font-display text-lg font-bold text-neon-cyan glow-text-cyan tracking-widest">FOXY</span>
              <span className="font-display text-lg font-bold text-neon-magenta glow-text-magenta tracking-widest">STREAM</span>
            </div>
          </Link>

          {/* Desktop nav links */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map(({ label, href, icon: Icon }) => (
              <Link key={href} to={href}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-xs font-display tracking-wider transition-all ${
                  pathname === href
                    ? "text-neon-cyan border border-neon-cyan/30 bg-neon-cyan/5 shadow-neon-subtle"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="w-3 h-3" />
                {label}
              </Link>
            ))}
          </div>

          {/* Search */}
          <div className="flex-1 max-w-sm hidden sm:block">
            <SearchBar />
          </div>

          {/* Rooms button */}
          <button
            onClick={() => setRoomsOpen(true)}
            className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-xs font-display tracking-wider border border-border text-muted-foreground hover:border-neon-cyan/40 hover:text-neon-cyan transition-all flex-shrink-0"
          >
            <Tv className="w-3.5 h-3.5" />
            ROOMS
          </button>

          {/* FoxyAI button */}
          <button
            onClick={() => setAiOpen(true)}
            className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-xs font-display tracking-wider border border-neon-cyan/40 text-neon-cyan bg-neon-cyan/5 hover:bg-neon-cyan/10 hover:shadow-neon-subtle transition-all flex-shrink-0"
          >
            <Bot className="w-3.5 h-3.5" />
            FOXY AI
          </button>

          {/* Auth area */}
          <div className="hidden md:flex items-center gap-2 flex-shrink-0">
            {user ? (
              <div className="relative" ref={dropRef}>
                <button
                  onClick={() => setUserDropOpen(o => !o)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-xs font-display border border-neon-cyan/30 text-neon-cyan bg-neon-cyan/5 hover:bg-neon-cyan/10 transition-all"
                >
                  <User className="w-3.5 h-3.5" />
                  {user.username.toUpperCase()}
                  <ChevronDown className={`w-3 h-3 transition-transform ${userDropOpen ? "rotate-180" : ""}`} />
                </button>
                {userDropOpen && (
                  <div className="absolute right-0 top-full mt-1 w-44 bg-dark-elevated border border-border rounded-sm shadow-neon-subtle z-50">
                    <button onClick={() => { navigate("/profile"); setUserDropOpen(false); }}
                      className="w-full flex items-center gap-2 px-4 py-2.5 text-xs font-display text-foreground hover:text-neon-cyan hover:bg-neon-cyan/5 transition-colors">
                      <Settings className="w-3.5 h-3.5" />PROFILE
                    </button>
                    <button onClick={() => { logout(); setUserDropOpen(false); }}
                      className="w-full flex items-center gap-2 px-4 py-2.5 text-xs font-display text-foreground hover:text-destructive hover:bg-destructive/5 transition-colors border-t border-border">
                      <LogOut className="w-3.5 h-3.5" />LOG OUT
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <>
                <button onClick={() => setLoginOpen(true)}
                  className="px-3 py-1.5 text-xs font-display border border-border text-muted-foreground hover:text-foreground hover:border-neon-cyan/30 rounded-sm transition-all">
                  LOG IN
                </button>
                <button onClick={() => setLoginOpen(true)}
                  className="px-3 py-1.5 text-xs font-display bg-primary text-primary-foreground rounded-sm hover:shadow-neon-cyan transition-all">
                  SIGN UP
                </button>
              </>
            )}
          </div>

          {/* Hamburger */}
          <button
            className="md:hidden text-muted-foreground hover:text-foreground"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden border-t border-border bg-dark-surface px-4 py-4 space-y-3">
            <SearchBar />
            <div className="flex flex-col gap-1">
              {navLinks.map(({ label, href, icon: Icon }) => (
                <Link key={href} to={href} onClick={() => setMenuOpen(false)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-sm text-sm font-display tracking-wider ${
                    pathname === href ? "text-neon-cyan bg-neon-cyan/5" : "text-muted-foreground"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </Link>
              ))}
              <button onClick={() => { setRoomsOpen(true); setMenuOpen(false); }}
                className="flex items-center gap-2 px-3 py-2 rounded-sm text-sm font-display text-muted-foreground">
                <Tv className="w-4 h-4" />ROOMS
              </button>
              <button onClick={() => { setAiOpen(true); setMenuOpen(false); }}
                className="flex items-center gap-2 px-3 py-2 rounded-sm text-sm font-display tracking-wider text-neon-cyan bg-neon-cyan/5 border border-neon-cyan/20 mt-1">
                <Bot className="w-4 h-4" />FOXY AI CHAT
              </button>
              {user ? (
                <>
                  <Link to="/profile" onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 text-sm font-display text-muted-foreground">
                    <User className="w-4 h-4" />PROFILE
                  </Link>
                  <button onClick={() => { logout(); setMenuOpen(false); }}
                    className="flex items-center gap-2 px-3 py-2 text-sm font-display text-destructive">
                    <LogOut className="w-4 h-4" />LOG OUT
                  </button>
                </>
              ) : (
                <button onClick={() => { setLoginOpen(true); setMenuOpen(false); }}
                  className="flex items-center gap-2 px-3 py-2 text-sm font-display text-neon-cyan border border-neon-cyan/20 rounded-sm">
                  <User className="w-4 h-4" />LOG IN / SIGN UP
                </button>
              )}
            </div>
          </div>
        )}
      </nav>

      <AiChat open={aiOpen} onClose={() => setAiOpen(false)} />
      {loginOpen && <LoginModal onClose={() => setLoginOpen(false)} />}
      {roomsOpen && <RoomsPanel onClose={() => setRoomsOpen(false)} />}
    </>
  );
};

export default Navbar;
