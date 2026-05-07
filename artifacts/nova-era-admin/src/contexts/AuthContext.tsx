import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { getToken, getRefreshToken, setToken, setRefreshToken, clearTokens, isTokenExpired, parseTokenUser, type TokenUser } from "@/lib/auth";
import { setAuthTokenGetter } from "@workspace/api-client-react";

interface AuthContextValue {
  user: TokenUser | null;
  isAuthenticated: boolean;
  login: (accessToken: string, refreshToken: string) => void;
  logout: () => void;
  refreshAccessToken: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<TokenUser | null>(() => {
    const token = getToken();
    if (token && !isTokenExpired(token)) return parseTokenUser(token);
    return null;
  });

  const logout = useCallback(() => {
    const refreshToken = getRefreshToken();
    if (refreshToken) {
      fetch("/api/auth/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      }).catch(() => {});
    }
    clearTokens();
    setUser(null);
  }, []);

  const refreshAccessToken = useCallback(async (): Promise<boolean> => {
    const refreshToken = getRefreshToken();
    if (!refreshToken) return false;
    try {
      const res = await fetch("/api/auth/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });
      if (!res.ok) {
        clearTokens();
        setUser(null);
        return false;
      }
      const data = await res.json() as { accessToken: string };
      setToken(data.accessToken);
      const parsed = parseTokenUser(data.accessToken);
      setUser(parsed);
      return true;
    } catch {
      clearTokens();
      setUser(null);
      return false;
    }
  }, []);

  const login = useCallback((accessToken: string, refreshToken: string) => {
    setToken(accessToken);
    setRefreshToken(refreshToken);
    setUser(parseTokenUser(accessToken));
  }, []);

  useEffect(() => {
    setAuthTokenGetter(async () => {
      let token = getToken();
      if (!token) return null;
      if (isTokenExpired(token)) {
        const ok = await refreshAccessToken();
        if (!ok) return null;
        token = getToken();
      }
      return token;
    });
  }, [refreshAccessToken]);

  useEffect(() => {
    if (!user) return;
    const check = () => {
      const token = getToken();
      if (!token || isTokenExpired(token)) {
        refreshAccessToken().then((ok) => {
          if (!ok) logout();
        });
      }
    };
    const interval = setInterval(check, 60 * 1000);
    return () => clearInterval(interval);
  }, [user, logout, refreshAccessToken]);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, logout, refreshAccessToken }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
