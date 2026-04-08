import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { bff } from "@/lib/bff";

interface AuthUser {
  userId: number;
  username: string;
  token: string;
  playbackSpeed: number;
}

interface AuthContextType {
  user: AuthUser | null;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
  updateSpeed: (speed: number) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

const TOKEN_KEY = "foxy_token";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) { setIsLoading(false); return; }
    bff.auth.me(token)
      .then((data) => {
        setUser({ userId: data.userId, username: data.username, token, playbackSpeed: data.plabackSpeed ?? 1 });
      })
      .catch(() => localStorage.removeItem(TOKEN_KEY))
      .finally(() => setIsLoading(false));
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const data = await bff.auth.login(username, password);
    localStorage.setItem(TOKEN_KEY, data.token);
    setUser({ userId: data.userId, username: data.username, token: data.token, playbackSpeed: 1 });
    // fetch speed
    bff.user.getSpeed(data.token).then(s => {
      setUser(u => u ? { ...u, playbackSpeed: s.speed } : u);
    }).catch(() => {});
  }, []);

  const register = useCallback(async (username: string, password: string) => {
    const data = await bff.auth.register(username, password);
    localStorage.setItem(TOKEN_KEY, data.token);
    setUser({ userId: data.userId, username: data.username, token: data.token, playbackSpeed: 1 });
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
  }, []);

  const updateSpeed = useCallback((speed: number) => {
    setUser(u => u ? { ...u, playbackSpeed: speed } : u);
    if (user?.token) {
      bff.user.saveSpeed(user.token, speed).catch(() => {});
    }
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, login, register, logout, isLoading, updateSpeed }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
