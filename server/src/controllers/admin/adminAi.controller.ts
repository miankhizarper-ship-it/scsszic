import type { Request, RequestHandler, Response } from "express";

import { withErrorBoundary } from "../content/content.controller.js";
import {
  aiFieldErrors,
  aiFieldRequestSchema,
} from "../../http/aiSchemas.js";
import {
  AiProviderError,
  generateFieldText,
} from "../../services/ai/groq.service.js";
import { env } from "../../config/env.js";

/**
 * Admin AI assistant controller (Task 28) — request/response boundary for
 * POST /api/admin/ai/field. The route layer has already enforced
 * requirePanelAccess (admin or permission-carrying manage session), so every
 * request here carries a verified panel session.
 *
 * Response contracts (existing API convention preserved):
 *   200 { data: { kind, value, items } }   generated field
 *   400 { message, errors }                invalid body (unknown kind, no
 *                                          source, oversized fields)
 *   429 { message }                        panel-level rate limit exceeded
 *   503 { message }                        GROQ_API_KEY not configured
 *   502/504 { message }                    upstream Groq failure (safe text)
 *
 * The provider key and any raw upstream error body NEVER reach the client —
 * the service maps everything to fixed safe messages. Generation is a pure
 * read-side convenience (it writes nothing), so no audit records are
 * produced; the rate limit is the abuse guard.
 */

/**
 * Per-user sliding-window rate limit. In-memory by design: the platform runs
 * as a single Node process locally and as warm serverless instances on
 * Vercel — per-instance accounting is a deliberate soft guard (enough to
 * stop a runaway loop or a curious manage user from torching the shared
 * quota) rather than a hard global budget.
 */
const rateBuckets = new Map<string, number[]>();

function rateLimitExceeded(userId: string): boolean {
  const now = Date.now();
  const windowMs = env.aiFieldRateWindowSeconds * 1_000;
  const bucket = (rateBuckets.get(userId) ?? []).filter(
    (timestamp) => now - timestamp < windowMs,
  );
  if (bucket.length >= env.aiFieldRateLimitMax) {
    rateBuckets.set(userId, bucket);
    return true;
  }
  bucket.push(now);
  rateBuckets.set(userId, bucket);
  // Opportunistic cleanup so abandoned buckets do not accumulate forever.
  if (rateBuckets.size > 500) {
    for (const [key, timestamps] of rateBuckets) {
      if (timestamps.every((timestamp) => now - timestamp >= windowMs)) {
        rateBuckets.delete(key);
      }
    }
  }
  return false;
}

/** POST /api/admin/ai/field — generate ONE form field from pasted material. */
export const generateAdminAiField: RequestHandler = withErrorBoundary(
  async (req: Request, res: Response) => {
    if (!env.aiFieldEnabled) {
      res.status(503).json({
        message:
          "The AI assistant is not configured on this deployment. Set GROQ_API_KEY in the server environment to enable it.",
      });
      return;
    }

    const parsed = aiFieldRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ message: "Invalid AI request.", errors: aiFieldErrors(parsed.error) });
      return;
    }

    const userId = req.user?.id ?? "anonymous";
    if (rateLimitExceeded(userId)) {
      res.status(429).json({
        message: `Too many AI requests — you can generate up to ${env.aiFieldRateLimitMax} fields every ${Math.round(env.aiFieldRateWindowSeconds / 60)} minutes.`,
      });
      return;
    }

    try {
      const result = await generateFieldText(parsed.data);
      res.status(200).json({ data: result });
    } catch (error) {
      if (error instanceof AiProviderError) {
        res.status(error.status).json({ message: error.message });
        return;
      }
      throw error;
    }
  },
  "admin-ai",
);
