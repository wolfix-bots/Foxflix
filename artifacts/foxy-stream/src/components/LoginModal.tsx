import { useState } from "react";
import { X, User, Lock, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface LoginModalProps {
  onClose: () => void;
  defaultTab?: "login" | "register";
}

const LoginModal = ({ onClose, defaultTab = "login" }: LoginModalProps) => {
  const { login, register } = useAuth();
  const [tab, setTab] = useState<"login" | "register">(defaultTab);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (tab === "login") {
        await login(username, password);
        toast.success(`Welcome back, ${username}!`);
      } else {
        await register(username, password);
        toast.success(`Welcome to FoxyStream, ${username}!`);
      }
      onClose();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-md mx-4 bg-dark-elevated border border-neon-cyan/20 rounded-sm shadow-neon-subtle"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="font-display text-sm tracking-widest text-neon-cyan">
            {tab === "login" ? "SIGN IN" : "CREATE ACCOUNT"}
          </h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border">
          {(["login", "register"] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-3 text-xs font-display tracking-wider transition-colors ${
                tab === t
                  ? "text-neon-cyan border-b-2 border-neon-cyan"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t === "login" ? "LOG IN" : "SIGN UP"}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-display text-muted-foreground tracking-wider">USERNAME</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="Enter username"
                required
                className="w-full pl-10 pr-4 py-2.5 bg-background border border-border rounded-sm text-sm font-body placeholder:text-muted-foreground focus:border-neon-cyan focus:outline-none transition-colors"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-display text-muted-foreground tracking-wider">PASSWORD</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder={tab === "register" ? "Min. 6 characters" : "Enter password"}
                required
                className="w-full pl-10 pr-4 py-2.5 bg-background border border-border rounded-sm text-sm font-body placeholder:text-muted-foreground focus:border-neon-cyan focus:outline-none transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-primary text-primary-foreground font-display text-sm tracking-wider rounded-sm hover:shadow-neon-cyan transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {tab === "login" ? "LOG IN" : "CREATE ACCOUNT"}
          </button>

          <p className="text-center text-xs text-muted-foreground font-body">
            {tab === "login" ? "No account? " : "Have an account? "}
            <button
              type="button"
              onClick={() => setTab(tab === "login" ? "register" : "login")}
              className="text-neon-cyan hover:underline"
            >
              {tab === "login" ? "Sign up free" : "Log in"}
            </button>
          </p>
        </form>
      </div>
    </div>
  );
};

export default LoginModal;
