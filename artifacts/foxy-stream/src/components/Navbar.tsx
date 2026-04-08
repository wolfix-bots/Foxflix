import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X, Flame, TrendingUp, Zap, Bot } from "lucide-react";
import foxLogo from "@/assets/fox-logo.png";
import SearchBar from "./SearchBar";
import AiChat from "./AiChat";

const Navbar = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const { pathname } = useLocation();

  const navLinks = [
    { label: "HOT", href: "/", icon: Flame },
    { label: "TRENDING", href: "/trending", icon: TrendingUp },
    { label: "LATEST", href: "/latest", icon: Zap },
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

          {/* Powered by badges — desktop only */}
          <div className="hidden lg:flex items-center gap-2 flex-shrink-0">
            <span className="text-xs font-display text-muted-foreground">POWERED BY</span>
            <span className="px-2 py-0.5 text-xs font-display border border-neon-cyan/30 text-neon-cyan rounded-sm">FOXY TECH</span>
            <span className="px-2 py-0.5 text-xs font-display border border-neon-magenta/30 text-neon-magenta rounded-sm">CASPER TECH</span>
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

              {/* AI Chat button in hamburger */}
              <button
                onClick={() => { setAiOpen(true); setMenuOpen(false); }}
                className="flex items-center gap-2 px-3 py-2 rounded-sm text-sm font-display tracking-wider text-neon-cyan bg-neon-cyan/5 border border-neon-cyan/20 mt-1"
              >
                <Bot className="w-4 h-4" />
                FOXY AI CHAT
              </button>
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-border">
              <span className="text-xs font-display text-muted-foreground">POWERED BY</span>
              <span className="px-2 py-0.5 text-xs font-display border border-neon-cyan/30 text-neon-cyan rounded-sm">FOXY TECH</span>
              <span className="px-2 py-0.5 text-xs font-display border border-neon-magenta/30 text-neon-magenta rounded-sm">CASPER TECH</span>
            </div>
          </div>
        )}
      </nav>

      {/* AI Chat panel — controlled from hamburger */}
      <AiChat open={aiOpen} onClose={() => setAiOpen(false)} />
    </>
  );
};

export default Navbar;
