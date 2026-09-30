import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { AlertTriangle, Mail, MailCheck, Send, TriangleAlert } from "lucide-react";

import { AuthShell } from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/Button";
import { authService } from "@/services/authService";
import { ROUTES } from "@/routes/paths";
import { buildPageTitle, usePageMetadata } from "@/lib/seo";

/**
 * Where a "reason" for being on this page comes from:
 *  - "sent"         — signup just dispatched the verification email
 *  - "unconfigured" — the server has NO Brevo credentials (production
 *                     fail-safe: the account stays unverified until an
 *                     administrator fixes the deployment)
 *  - "send_failed"  — Brevo rejected the send (detail carries the hint)
 *  - "unverified"   — a login attempt was blocked (403 email_not_verified)
 */
type CheckEmailReason = "sent" | "unconfigured" | "send_failed" | "unverified";

interface CheckEmailLocationState {
  email?: string;
  reason?: CheckEmailReason;
  detail?: string;
}

type ResendPhase =
  | { phase: "idle" }
  | { phase: "sending" }
  | { phase: "sent"; message: string }
  | { phase: "error"; message: string };

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function headingFor(reason: CheckEmailReason): string {
  switch (reason) {
    case "unconfigured":
      return "Almost there — one server setting to go";
    case "send_failed":
      return "The email could not be sent";
    case "unverified":
      return "Verify your email to sign in";
    default:
      return "Check your inbox";
  }
}

function descriptionFor(reason: CheckEmailReason, email: string): string {
  const who = email ? `to ${email}` : "to your signup address";
  switch (reason) {
    case "unconfigured":
      return "Your account was created, but the server cannot send email yet because the Brevo credentials are missing. The site administrator needs to finish the mail setup.";
    case "send_failed":
      return `We tried to send a verification link ${who}, but the mail service rejected it. You can try again below.`;
    case "unverified":
      return `Your email address isn't verified yet, so sign-in is blocked. We can send a fresh verification link ${who}.`;
    default:
      return `We sent a verification link ${who}. Open it to activate your account — the link works for 15 minutes.`;
  }
}

/**
 * CheckEmailPage — "Check your inbox" (/check-email). The landing spot for
 * every unverified visitor: right after signup, or after a login attempt on
 * an unverified account. Public by design — unverified accounts have no
 * session, so the resend call goes through the public email path.
 */
export default function CheckEmailPage() {
  usePageMetadata({
    title: buildPageTitle("Check your inbox"),
    description: "Confirm your email address to activate your Society of Computer Science account.",
  });

  const location = useLocation();
  const state = (location.state ?? null) as CheckEmailLocationState | null;

  const queryEmail = new URLSearchParams(window.location.search).get("email") ?? "";
  const initialEmail = state?.email ?? queryEmail;
  const reason: CheckEmailReason = state?.reason ?? (initialEmail ? "sent" : "unverified");

  const [email, setEmail] = useState(initialEmail);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [resend, setResend] = useState<ResendPhase>({ phase: "idle" });

  const requestResend = async (address: string) => {
    setResend({ phase: "sending" });
    try {
      const data = await authService.resendVerification(address || undefined);
      setResend({ phase: "sent", message: data.message });
    } catch (error) {
      const detail = error instanceof Error ? error.message : "Couldn't send the email. Try again.";
      setResend({ phase: "error", message: detail });
    }
  };

  const handleResend = () => {
    const address = email.trim();
    if (!address || !EMAIL_PATTERN.test(address)) {
      setEmailError("Enter the email address you signed up with.");
      setResend({ phase: "idle" });
      return;
    }
    setEmailError(null);
    void requestResend(address);
  };

  const emailKnown = Boolean(initialEmail);
  const resendDisabled = resend.phase === "sending" || reason === "unconfigured";

  return (
    <AuthShell
      eyebrow="Member Access"
      title={headingFor(reason)}
      description={descriptionFor(reason, initialEmail)}
      footer={
        <>
          Need a hand?{" "}
          <Link
            to={ROUTES.contact}
            className="font-semibold text-gold-700 transition-colors hover:text-gold-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500"
          >
            Contact the society
          </Link>
        </>
      }
    >
      <div className="flex flex-col items-center gap-5 py-2 text-center">
        {reason === "unconfigured" ? (
          <TriangleAlert size={56} aria-hidden="true" className="text-gold-600" />
        ) : (
          <MailCheck size={56} aria-hidden="true" className="text-navy-700" />
        )}

        {reason === "unconfigured" && (
          <div
            role="status"
            className="w-full rounded-lg border border-gold-500/40 bg-gold-500/10 px-3.5 py-3 text-left text-xs font-medium text-ink"
          >
            <span className="mb-1 flex items-center gap-1.5 font-semibold text-gold-700">
              <AlertTriangle size={13} aria-hidden="true" /> Server email not configured
            </span>
            The deployment is missing its Brevo credentials (BREVO_API_KEY / BREVO_SENDER_EMAIL),
            so verification emails cannot go out. New accounts stay unverified until the site
            administrator completes the mail setup on the server.
          </div>
        )}

        {reason === "send_failed" && state?.detail && (
          <div
            role="status"
            className="w-full rounded-lg border border-error/30 bg-error/5 px-3.5 py-2.5 text-left text-xs font-medium text-error"
          >
            Mail service said: {state.detail}
          </div>
        )}

        {reason === "sent" && (
          <div className="flex items-center gap-2 rounded-full bg-navy-50 px-4 py-1.5 text-xs font-medium text-navy-700">
            <Mail size={13} aria-hidden="true" />
            {initialEmail || "your signup address"}
          </div>
        )}

        <ul className="w-full space-y-1.5 text-left text-xs leading-relaxed text-muted">
          <li>
            • Open the email and click <span className="font-semibold text-ink">Verify my email</span> —
            links expire after 15 minutes and work exactly once.
          </li>
          <li>• Not there? Check spam or promotions folders first.</li>
          {reason === "unverified" && <li>• After verifying, come back and sign in again.</li>}
        </ul>

        {reason === "unconfigured" ? (
          <Button variant="outline" className="w-full justify-center" to={ROUTES.login}>
            Back to sign in
          </Button>
        ) : (
          <div className="w-full space-y-3">
            {!emailKnown && (
              <div>
                <label htmlFor="check-email-address" className="mb-1.5 block text-left text-xs font-semibold text-ink">
                  Signup email
                </label>
                <input
                  id="check-email-address"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  aria-invalid={Boolean(emailError)}
                  className="h-11 w-full rounded-lg border bg-white px-3.5 text-base text-ink shadow-sm transition-colors placeholder:text-muted focus:outline-2 focus:outline-offset-1 focus:outline-gold-500 sm:text-sm aria-[invalid=true]:border-error"
                />
                {emailError && <p className="mt-1.5 text-left text-xs font-medium text-error">{emailError}</p>}
              </div>
            )}

            <Button
              variant="navy"
              onClick={handleResend}
              disabled={resendDisabled}
              className="w-full justify-center"
            >
              <Send size={15} aria-hidden="true" className="mr-1.5" />
              {resend.phase === "sending"
                ? "Sending…"
                : resend.phase === "sent"
                  ? "Email sent again"
                  : "Resend verification email"}
            </Button>

            {resend.phase === "sent" && (
              <p role="status" className="text-xs font-medium text-emerald-700">
                {resend.message}
              </p>
            )}
            {resend.phase === "error" && (
              <p role="alert" className="rounded-lg border border-error/30 bg-error/5 px-3.5 py-2.5 text-xs font-medium text-error">
                {resend.message}
              </p>
            )}

            <Link
              to={ROUTES.login}
              className="block text-sm font-semibold text-gold-700 transition-colors hover:text-gold-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500"
            >
              Back to sign in
            </Link>
          </div>
        )}
      </div>
    </AuthShell>
  );
}
