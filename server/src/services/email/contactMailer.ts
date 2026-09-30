import { env } from "../../config/env.js";
import { logger } from "../../utils/logger.js";
import { brevoErrorDetail } from "./brevoMailer.js";

/**
 * Contact-form delivery — forwards a public /api/contact submission to the
 * society's inbox through Brevo, with the visitor's address on Reply-To so
 * "reply" in any mail client goes straight back to them.
 *
 * Design rules (mirrors brevoMailer.ts):
 *  - NO SDK dependency — one authenticated fetch with a 10s timeout.
 *  - NEVER throws into the controller: a mail outage becomes a typed result
 *    the controller surfaces honestly (the submission is ALREADY persisted,
 *    so the caller can decide between "saved" and "saved but undelivered").
 *  - The visitor's name/email are UNVERIFIED free-text: they are interpolated
 *    into HTML only after escaping and ONLY into the Reply-To header and the
 *    message body — never into the "sender" identity, which stays the
 *    verified Brevo sender (spoofing protection).
 *  - Logs carry the outcome + recipient type only — never the API key.
 */

const CONTACT_ENDPOINT_PATH = "/v3/smtp/email";
const SEND_TIMEOUT_MS = 10_000;

export type ContactSendOutcome =
  | { sent: true; messageId: string }
  | {
      sent: false;
      reason: "unconfigured" | "http_error" | "network_error";
      /** Sanitized, human-readable hint for the UI (same vocabulary as signup). */
      detail?: string;
    };

export interface ContactEmailInput {
  /** Visitor-supplied, untrusted — escaped before any HTML interpolation. */
  name: string;
  email: string;
  subject: string;
  message: string;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Collapse newlines so the visitor cannot inject extra MIME headers/rows. */
function oneLine(value: string): string {
  return value.replace(/[\r\n]+/g, " ").trim();
}

function contactHtml(input: ContactEmailInput): string {
  const name = escapeHtml(input.name);
  const email = escapeHtml(input.email);
  const subject = escapeHtml(input.subject);
  // Preserve paragraph breaks in the body, escape everything else.
  const body = escapeHtml(input.message).replace(/\n{2,}/g, "</p><p style='margin:0 0 14px;'>").replace(/\n/g, "<br>");
  return `<!doctype html>
<html><body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;">
        <tr><td style="background:#0a1f44;padding:22px 28px;">
          <div style="color:#e8c766;font-size:19px;font-weight:bold;letter-spacing:2px;">SCS</div>
          <div style="color:#ffffff;font-size:14px;margin-top:4px;">New contact-form message &middot; scsszic.org</div>
        </td></tr>
        <tr><td style="padding:28px;">
          <p style="margin:0 0 6px;font-size:12px;color:#64748b;">From</p>
          <p style="margin:0 0 14px;font-size:14px;color:#0a1f44;"><strong>${name}</strong> &lt;${email}&gt;</p>
          <p style="margin:0 0 6px;font-size:12px;color:#64748b;">Subject</p>
          <p style="margin:0 0 14px;font-size:14px;color:#0a1f44;">${subject}</p>
          <p style="margin:0 0 6px;font-size:12px;color:#64748b;">Message</p>
          <p style="margin:0;font-size:14px;line-height:22px;color:#334155;">${body}</p>
        </td></tr>
        <tr><td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:14px 28px;text-align:center;">
          <div style="font-size:11px;color:#94a3b8;">Reply directly to this email to answer ${name}.</div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

function contactText(input: ContactEmailInput): string {
  return [
    "New contact-form message",
    "",
    `From: ${input.name} <${input.email}>`,
    `Subject: ${input.subject}`,
    "",
    input.message,
    "",
    `Reply directly to this email to answer ${input.name}.`,
  ].join("\n");
}

/** Deliver a contact message to the society inbox. Never throws. */
export async function sendContactEmail(input: ContactEmailInput): Promise<ContactSendOutcome> {
  if (!env.brevoApiKey || !env.brevoSenderEmail) {
    return { sent: false, reason: "unconfigured" };
  }

  const body = {
    sender: { name: env.brevoSenderName, email: env.brevoSenderEmail },
    to: [{ email: env.contactToEmail }],
    replyTo: { email: input.email, name: oneLine(input.name).slice(0, 120) },
    subject: `[SCS Contact] ${oneLine(input.subject).slice(0, 150)}`,
    htmlContent: contactHtml(input),
    textContent: contactText(input),
  };

  try {
    const response = await fetch(`${env.brevoApiUrl.replace(/\/+$/, "")}${CONTACT_ENDPOINT_PATH}`, {
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
      logger.error(`[email] contact delivery to inbox failed: ${detail}`);
      return { sent: false, reason: "http_error", detail };
    }

    const data = (await response.json().catch(() => null)) as { messageId?: string } | null;
    logger.info(`[email] contact message delivered to society inbox (${input.email})`);
    return { sent: true, messageId: data?.messageId ?? "unknown" };
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    logger.error(`[email] contact request error: ${detail}`);
    return { sent: false, reason: "network_error", detail };
  }
}
