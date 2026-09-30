import { API_BASE_URL } from "@/services/apiClient";

/**
 * "Continue with Google" — the OAuth entry is a TOP-LEVEL browser navigation
 * to the API origin (not a fetch): Google takes over the whole page and the
 * callback starts a session by setting the HTTP-only cookie, then redirects
 * back to the site. The href reuses the exact API base every other call
 * uses, so in dev it rides the Vite /api proxy and in production it points
 * at the deployed API with the cookie domain the SPA already shares.
 */
export function googleOAuthUrl(): string {
  return `${API_BASE_URL}/auth/google`;
}

/** Google's multicolor "G" — official geometry, inline so no asset ships. */
export function GoogleIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92a8.78 8.78 0 0 0 2.68-6.62Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26a5.52 5.52 0 0 1-8.09-2.9H.96v2.33A9 9 0 0 0 9 18Z"
      />
      <path
        fill="#FBBC05"
        d="M3.95 10.66a5.41 5.41 0 0 1 0-3.32V5H.96a9 9 0 0 0 0 8l2.99-2.34Z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.59A9 9 0 0 0 .96 5l2.99 2.34A5.36 5.36 0 0 1 9 3.58Z"
      />
    </svg>
  );
}
