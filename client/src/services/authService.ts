import { ApiError, apiFetch } from "@/services/apiClient";
import type { AuthFieldErrors, AuthUser } from "@/types";

/**
 * Auth service — the client's single boundary to /api/auth/*.
 *
 * Maps one-to-one onto the Express endpoints (server/src/routes/auth.routes.ts):
 *
 *   signup()         → POST /api/auth/signup
 *   login()          → POST /api/auth/login
 *   getCurrentUser() → GET  /api/auth/me
 *   logout()         → POST /api/auth/logout
 *
 * There is deliberately no token handling here: the server sets an HTTP-only
 * session cookie, and `apiFetch` sends `credentials: "include"` on every
 * call. When Phase 8 moves sessions to MongoDB nothing in this file changes.
 */

export interface SignupPayload {
  displayName: string;
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface LoginPayload {
  /** Email address OR username (the server normalizes both). */
  identifier: string;
  password: string;
}

interface AuthResponse {
  user: AuthUser;
}

interface MessageResponse {
  message: string;
}

/**
 * Normalize transport failures into safe, user-presentable errors.
 *
 * ApiError already carries a server-authored safe message (and optional
 * field-level errors for validation/conflict responses), so it is re-thrown
 * as-is — forms rely on `errors` to map 400/409 details onto inputs. Only
 * unexpected failures (network down, malformed response) get a generic
 * message; raw fetch internals never leak to the UI.
 */
function normalizeAuthError(error: unknown): Error {
  if (error instanceof ApiError) return error;
  return new Error("Something went wrong. Please try again.");
}

export const authService = {
  async signup(payload: SignupPayload): Promise<AuthUser> {
    try {
      const data = await apiFetch<AuthResponse>("/auth/signup", {
        method: "POST",
        body: payload,
      });
      return data.user;
    } catch (error) {
      throw normalizeAuthError(error);
    }
  },

  async login(payload: LoginPayload): Promise<AuthUser> {
    try {
      const data = await apiFetch<AuthResponse>("/auth/login", {
        method: "POST",
        body: payload,
      });
      return data.user;
    } catch (error) {
      throw normalizeAuthError(error);
    }
  },

  /**
   * Restore the session on app startup. Resolves the user when signed in,
   * `null` when anonymous (a 401 is an expected state, not an error).
   */
  async getCurrentUser(): Promise<AuthUser | null> {
    try {
      const data = await apiFetch<AuthResponse>("/auth/me");
      return data.user;
    } catch (error) {
      if (error instanceof Error && "status" in error && (error as { status?: number }).status === 401) {
        return null;
      }
      // Network/server trouble — treat as anonymous rather than blocking the
      // whole app on a flaky API; refresh() can be retried explicitly.
      return null;
    }
  },

  /** Invalidate the server-side session; the cookie is cleared by the server. */
  async logout(): Promise<void> {
    try {
      await apiFetch<MessageResponse>("/auth/logout", { method: "POST" });
    } catch (error) {
      throw normalizeAuthError(error);
    }
  },
}

/** Expose field errors from an ApiError without leaking internals to forms. */
export function getFieldErrors(error: unknown): AuthFieldErrors | undefined {
  if (error && typeof error === "object" && "errors" in error) {
    const errors = (error as { errors?: AuthFieldErrors }).errors;
    if (errors && typeof errors === "object") return errors;
  }
  return undefined;
}
