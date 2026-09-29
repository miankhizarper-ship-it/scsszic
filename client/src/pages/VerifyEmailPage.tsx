import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, MailWarning, XCircle } from "lucide-react";

import { AuthShell } from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/context/AuthProvider";
import { authService } from "@/services/authService";
import { ROUTES } from "@/routes/paths";
import { buildPageTitle, usePageMetadata } from "@/lib/seo";

type VerifyState =
  | { phase: "verifying" }
  | { phase: "success"; message: string }
  | { phase: "error"; message: string };

/**
 * VerifyEmailPage — the landing page for the link inside the verification
 * email (/verify-email?token=…). Public by design: the emailed token IS the
 * credential, so no auth gate wraps this route.
 *
 * The page calls GET /api/auth/verify-email?token=… once, then renders one
 * of three states: verifying → success / error. A signed-in visitor gets
 * their session identity refreshed on success so any "unverified" banner
 * disappears without a manual reload.
 */
export default function VerifyEmailPage() {
  usePageMetadata({
    title: buildPageTitle("Verify email"),
    description: "Confirm your email address to activate your Society of Computer Science account.",
  });

  const { refresh } = useAuth();
  const [state, setState] = useState<VerifyState>({ phase: "verifying" });
  // StrictMode double-invokes effects in dev — the ref guard keeps the
  // single-use verification token from being consumed twice.
  const attemptedRef = useRef(false);

  useEffect(() => {
    if (attemptedRef.current) return;
    attemptedRef.current = true;

    const token = new URLSearchParams(window.location.search).get("token");
    if (!token) {
      setState({ phase: "error", message: "This verification link is invalid." });
      return;
    }

    authService
      .verifyEmail(token)
      .then((data) => {
        setState({ phase: "success", message: data.message });
        // Refresh the session identity so a stale isVerified flag clears.
        void refresh();
      })
      .catch((error: unknown) => {
        setState({
          phase: "error",
          message:
            error instanceof Error
              ? error.message
              : "We couldn't verify your email. Please try again.",
        });
      });
  }, [refresh]);

  return (
    <AuthShell
      eyebrow="Member Access"
      title={state.phase === "success" ? "Email verified" : state.phase === "error" ? "Verification problem" : "Verifying your email"}
      description={
        state.phase === "verifying"
          ? "Checking your verification link — this only takes a second."
          : state.phase === "success"
            ? "Your email address is confirmed and your account is fully active."
            : "We couldn't complete the verification with this link."
      }
      footer={
        state.phase === "success" ? (
          <>
            Ready to explore?{" "}
            <Link
              to={ROUTES.account}
              className="font-semibold text-gold-700 transition-colors hover:text-gold-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500"
            >
              Go to your account
            </Link>
          </>
        ) : (
          <>
            Need help?{" "}
            <Link
              to={ROUTES.contact}
              className="font-semibold text-gold-700 transition-colors hover:text-gold-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500"
            >
              Contact the society
            </Link>
          </>
        )
      }
    >
      <div className="flex flex-col items-center gap-5 py-4 text-center">
        {state.phase === "verifying" && (
          <>
            <span
              aria-hidden="true"
              className="size-14 animate-spin rounded-full border-4 border-navy-100 border-t-gold-500"
            />
            <p className="text-sm text-muted">Validating your link…</p>
          </>
        )}

        {state.phase === "success" && (
          <>
            <CheckCircle2 size={56} aria-hidden="true" className="text-emerald-600" />
            <p className="text-sm font-medium text-ink">{state.message}</p>
            <Button variant="navy" className="w-full justify-center" onClick={() => window.location.assign(ROUTES.account)}>
              Continue to your account
            </Button>
          </>
        )}

        {state.phase === "error" && (
          <>
            {state.message.includes("expired") ? (
              <MailWarning size={56} aria-hidden="true" className="text-gold-600" />
            ) : (
              <XCircle size={56} aria-hidden="true" className="text-error" />
            )}
            <p className="text-sm font-medium text-ink">{state.message}</p>
            <p className="text-xs text-muted">
              Verification links expire after 15 minutes and work exactly once. Signed in? You can
              request a fresh email from your account page.
            </p>
            <Link
              to={ROUTES.login}
              className="text-sm font-semibold text-gold-700 transition-colors hover:text-gold-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500"
            >
              Sign in
            </Link>
          </>
        )}
      </div>
    </AuthShell>
  );
}
