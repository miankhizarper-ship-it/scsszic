import { env } from "../../config/env.js";
import { logger } from "../../utils/logger.js";

/**
 * Brevo transactional email — the thin client for api.brevo.com/v3/smtp/email.
 *
 * Design rules:
 *  - NO SDK dependency — one authenticated fetch with a 10s timeout.
 *  - NEVER throws into the auth flow: a mail outage must not turn signup
 *    into a 500. Every outcome lands in a typed result the controller can
 *    surface honestly (and the user can recover from via "Resend email").
 *  - Credentials are read from the environment (BREVO_API_KEY +
 *    BREVO_SENDER_EMAIL). With either missing the mailer reports
 *    "unconfigured" and the signup flow auto-verifies instead.
 *  - Logs carry the recipient address and outcome only — never the API key,
 *    never token values.
 */

const BREVO_ENDPOINT_PATH = "/v3/smtp/email";
const SEND_TIMEOUT_MS = 10_000;

export type EmailSendOutcome =
  | { sent: true; messageId: string }
  | {
      sent: false;
      reason: "unconfigured" | "http_error" | "network_error";
      /** Sanitized, human-readable hint (Brevo's own error message) for the UI. */
      detail?: string;
    };

interface VerificationEmailInput {
  to: string;
  displayName: string;
  /** Absolute link: ${CLIENT_URL}/verify-email?token=<raw token> */
  verifyUrl: string;
  expiryMinutes: number;
}

/** Escape a small set of HTML-significant characters for safe interpolation. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function verificationHtml(input: VerificationEmailInput): string {
  const name = escapeHtml(input.displayName);
  const minutes = input.expiryMinutes;
  return `<!doctype html>
<html><body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;">
        <tr><td style="background:#0a1f44;padding:28px 32px;text-align:center;">
          <div style="color:#e8c766;font-size:22px;font-weight:bold;letter-spacing:2px;">SCS</div>
          <div style="color:#ffffff;font-size:15px;margin-top:6px;">Society of Computer Science &middot; SZIC</div>
        </td></tr>
        <tr><td style="padding:32px;">
          <h1 style="margin:0 0 12px;font-size:20px;color:#0a1f44;">Verify your email, ${name}</h1>
          <p style="margin:0 0 20px;font-size:14px;line-height:22px;color:#334155;">
            Welcome to the Society of Computer Science! Confirm this email address to activate
            your account. This link expires in <strong>${minutes} minutes</strong>.
          </p>
          <table role="presentation" cellpadding="0" cellspacing="0" align="center" style="margin:0 auto 20px;">
            <tr><td style="background:#d4af37;border-radius:8px;">
              <a href="${input.verifyUrl}" style="display:inline-block;padding:12px 28px;font-size:14px;font-weight:bold;color:#0a1f44;text-decoration:none;">
                Verify my email
              </a>
            </td></tr>
          </table>
          <p style="margin:0 0 6px;font-size:12px;color:#64748b;">Or paste this link into your browser:</p>
          <p style="margin:0 0 24px;font-size:12px;word-break:break-all;color:#0a1f44;">${input.verifyUrl}</p>
          <p style="margin:0;font-size:12px;line-height:18px;color:#94a3b8;">
            Didn't create an SCS account? You can safely ignore this email — the link expires on its own.
          </p>
        </td></tr>
        <tr><td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:16px 32px;text-align:center;">
          <div style="font-size:11px;color:#94a3b8;">Shaikh Zayed Islamic Centre &middot; University of Peshawar</div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

function verificationText(input: VerificationEmailInput): string {
  return [
    `Verify your email, ${input.displayName}`,
    "",
    "Welcome to the Society of Computer Science (SZIC).",
    `Confirm this email address to activate your account. This link expires in ${input.expiryMinutes} minutes:`,
    "",
    input.verifyUrl,
    "",
    "Didn't create an SCS account? You can safely ignore this email.",
  ].join("\n");
}

/** Brevo's "Authorised IPs" security feature rejects unknown caller IPs. */
const IP_BLOCK_PATTERN = /un\s?recognised ip address|un\s?recognized ip address|authorised[_\s-]?ips/i;
const IPV4_PATTERN = /\b(?:\d{1,3}\.){3}\d{1,3}\b/;

/**
 * Pull a safe, short hint out of Brevo's error response body — with special,
 * actionable handling for Brevo's Authorised-IPs rejection (its account-level
 * security feature silently blocks serverless callers whose outbound IP is
 * not on the allowlist, which is exactly what Vercel deployments hit).
 *
 * Exported so every Brevo-speaking mailer (verification, contact) surfaces
 * ONE consistent, classified error vocabulary.
 */
export async function brevoErrorDetail(response: Response): Promise<string> {
  const statusPart = `brevo_http_${response.status}`;
  try {
    const data = (await response.json()) as { message?: string; code?: string } | null;
    const message = typeof data?.message === "string" ? data.message : "";
    const code = typeof data?.code === "string" ? data.code : "";
    const raw = [code, message].filter(Boolean).join(": ");

    if (IP_BLOCK_PATTERN.test(raw)) {
      // Tell the administrator exactly what to toggle — and why adding the
      // single reported IP is only a stopgap (Vercel egress IPs rotate).
      const ip = message.match(IPV4_PATTERN)?.[0];
      const stopgap = ip
        ? `Adding the exact IP (${ip}) also works, but only until it changes.`
        : "Adding the reported IP also works, but only until it changes.";
      return [
        `${statusPart} — Brevo is blocking this server's IP address${ip ? ` (${ip})` : ""}:`,
        `your Brevo account only accepts API calls from authorised IPs. Fix: open Brevo → Security →`,
        `Authorised IPs (app.brevo.com/security/authorised_ips) and turn IP authorisation OFF —`,
        `Vercel's outbound IPs rotate, so a single allowlisted address will break again.`,
        stopgap,
      ]
        .join(" ")
        .slice(0, 480);
    }

    // Brevo's message never contains credentials — safe to surface. Truncate
    // defensively so a pathological body cannot blow up a UI banner.
    let hint = raw.slice(0, 240);
    if (response.status === 401) {
      hint += " — check that BREVO_API_KEY matches a v3 key from Brevo → SMTP & API";
    }
    if (/sender/i.test(raw)) {
      hint += " — and that the sender address is verified in Brevo → Senders";
    }
    return hint ? `${statusPart} — ${hint}` : statusPart;
  } catch {
    return statusPart;
  }
}

/** Send the verification email through Brevo. Never throws. */
export async function sendVerificationEmail(input: VerificationEmailInput): Promise<EmailSendOutcome> {
  if (!env.emailVerificationEnabled) {
    return { sent: false, reason: "unconfigured" };
  }

  const body = {
    sender: { name: env.brevoSenderName, email: env.brevoSenderEmail },
    to: [{ email: input.to }],
    subject: "Verify your email — Society of Computer Science",
    htmlContent: verificationHtml(input),
    textContent: verificationText(input),
  };

  try {
    const response = await fetch(`${env.brevoApiUrl.replace(/\/+$/, "")}${BREVO_ENDPOINT_PATH}`, {
      method: "POST",
      headers: {
        "api-key": env.brevoApiKey,
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
    });

    if (!response.ok) {
      const detail = await brevoErrorDetail(response);
      logger.error(`[email] Brevo send failed for ${input.to}: ${detail}`);
      return { sent: false, reason: "http_error", detail };
    }

    const data = (await response.json().catch(() => null)) as { messageId?: string } | null;
    logger.info(`[email] verification email sent to ${input.to}`);
    return { sent: true, messageId: data?.messageId ?? "unknown" };
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    logger.error(`[email] Brevo request error for ${input.to}: ${detail}`);
    return { sent: false, reason: "network_error", detail };
  }
}
