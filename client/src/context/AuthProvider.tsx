import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { authService } from "@/services/authService";
import type { SignupPayload } from "@/services/authService";
import type { AuthUser } from "@/types";

/**
 * AuthProvider — the single source of truth for authentication state in React.
 *
 * Architecture (spec §3, §16):
 *   components → useAuth() → AuthProvider → authService → Express API
 *
 * Behaviours:
 *  - On startup `GET /api/auth/me` restores the session from the HTTP-only
 *    cookie. Client state is NEVER treated as proof of authentication — the
 *    server is the source of truth.
 *  - `status` distinguishes "loading" (session restore in flight) from
 *    "unauthenticated" so ProtectedRoute can show a calm loading state
 *    instead of bouncing visitors to /login on every hard reload.
 *  - The user object is the client-safe AuthUser DTO; the session itself
 *    lives in an HTTP-only cookie that JavaScript cannot read, so there are
 *    no tokens in localStorage/sessionStorage/React state.
 */

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

interface AuthContextValue {
  user: AuthUser | null;
  status: AuthStatus;
  isAuthenticated: boolean;
  login: (identifier: string, password: string) => Promise<AuthUser>;
  signup: (payload: SignupPayload) => Promise<AuthUser>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const refresh = useCallback(async () => {
    setStatus("loading");
    const current = await authService.getCurrentUser();
    if (!mountedRef.current) return;
    setUser(current);
    setStatus(current ? "authenticated" : "unauthenticated");
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const login = useCallback(async (identifier: string, password: string) => {
    const signedIn = await authService.login({ identifier, password });
    setUser(signedIn);
    setStatus("authenticated");
    return signedIn;
  }, []);

  const signup = useCallback(async (payload: SignupPayload) => {
    const created = await authService.signup(payload);
    setUser(created);
    setStatus("authenticated");
    return created;
  }, []);

  const logout = useCallback(async () => {
    try {
      // Server-side session invalidation first — the cookie alone is not the
      // source of truth, the server session store is.
      await authService.logout();
    } finally {
      setUser(null);
      setStatus("unauthenticated");
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      status,
      isAuthenticated: status === "authenticated" && user !== null,
      login,
      signup,
      logout,
      refresh,
    }),
    [user, status, login, signup, logout, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
