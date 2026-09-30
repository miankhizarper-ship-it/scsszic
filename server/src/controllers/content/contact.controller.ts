import type { RequestHandler } from "express";

import { contactFieldErrors, contactMessageSchema } from "../../http/contactSchemas.js";
import { contactRepository } from "../../repositories/content/contactRepository.js";
import { sendContactEmail } from "../../services/email/contactMailer.js";
import { withErrorBoundary } from "./content.controller.js";

/**
 * POST /api/contact — anonymous contact-form endpoint.
 *
 * Layers, in order:
 *   1. per-IP throttle (best-effort in-memory sliding window; on serverless
 *      each warm instance counts independently — cheap mitigation, not a
 *      hard guarantee)
 *   2. zod validation → 400 { message, errors }
 *   3. honeypot: a filled hidden `company` field means a bot — respond with
 *      the SAME success envelope but skip the database write entirely
 *   4. persist to contact_messages (the durable record — a mail outage can
 *      never lose a submission)
 *   5. deliver to the society inbox via Brevo with the visitor on Reply-To
 *      → 201 { message } when the email is on its way
 *      → 502/503 with an honest "saved but NOT delivered" answer when Brevo
 *        refuses or is unconfigured (silently claiming success would make
 *        the society wait for an email that is never coming)
 *
 * Nothing about the storage layer, IP handling, or throttling leaks into
 * any response.
 */

/** Sliding-window throttle: MAX per window per IP. */
const THROTTLE_MAX = 5;
const THROTTLE_WINDOW_MS = 10 * 60 * 1000;

const recentHits = new Map<string, number[]>();

function throttled(ip: string): boolean {
  const now = Date.now();
  const hits = (recentHits.get(ip) ?? []).filter((t) => now - t < THROTTLE_WINDOW_MS);
  if (hits.length >= THROTTLE_MAX) {
    recentHits.set(ip, hits);
    return true;
  }
  hits.push(now);
  recentHits.set(ip, hits);
  // Opportunistic cleanup so the map cannot grow without bound.
  if (recentHits.size > 1000) {
    for (const [key, times] of recentHits) {
      if (times.every((t) => now - t >= THROTTLE_WINDOW_MS)) recentHits.delete(key);
    }
  }
  return false;
}

const SUCCESS_MESSAGE =
  "Thanks for reaching out — your message has been received. The society team will reply by email soon.";

export const createContactMessage: RequestHandler = withErrorBoundary(
  async (req, res) => {
    const ip = req.ip ?? "unknown";
    if (throttled(ip)) {
      res.status(429).json({
        message: "Too many messages sent from this address. Please try again later.",
      });
      return;
    }

    const parsed = contactMessageSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      res
        .status(400)
        .json({ message: "Please check the highlighted fields.", errors: contactFieldErrors(parsed.error) });
      return;
    }

    const { company, ...input } = parsed.data;

    // Honeypot tripped — pretend success, write nothing.
    if (company && company.trim().length > 0) {
      res.status(201).json({ message: SUCCESS_MESSAGE });
      return;
    }

    await contactRepository.create(input);

    const outcome = await sendContactEmail(input);
    if (!outcome.sent) {
      const detail = outcome.detail;
      if (outcome.reason === "unconfigured") {
        res.status(503).json({
          message:
            "Your message was saved, but the society inbox is not receiving form messages yet — please email scs@szic.edu.pk directly.",
        });
        return;
      }
      res.status(502).json({
        message:
          "Your message was saved, but delivery to the society inbox failed — please email scs@szic.edu.pk directly if you need a quick answer.",
        ...(detail ? { detail } : {}),
      });
      return;
    }

    res.status(201).json({ message: SUCCESS_MESSAGE });
  },
  "contact",
);
