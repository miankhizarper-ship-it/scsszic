import { env } from "../../config/env.js";
import { logger } from "../../utils/logger.js";

import { isAiListKind, type AiFieldRequest } from "../../http/aiSchemas.js";

/**
 * Groq-backed field generation for the admin AI assistant (Task 28).
 *
 * Groq speaks the OpenAI chat-completions dialect, so a plain fetch against
 * `${GROQ_API_URL}/chat/completions` is the whole integration — no SDK, no
 * new dependencies, serverless-safe. The API key lives ONLY in the server
 * process (env) and is never logged and never sent to any client.
 *
 * Per-field "kinds" each carry their own system prompt with a hard output
 * contract (plain text, no markdown fences, no surrounding quotes, length
 * caps aligned with the CMS zod schemas) so the answer can be dropped
 * straight into the corresponding form field without cleanup.
 */

/** Error whose message is safe to show the admin and whose status maps 1:1. */
export class AiProviderError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "AiProviderError";
    this.status = status;
  }
}

/** One field kind's generation contract. */
interface FieldPrompt {
  /** What the model IS — kind-specific role framing. */
  system: string;
  /** Hard cap enforced on the answer (chars) before it reaches the form. */
  maxChars: number;
}

const FIELD_PROMPTS: Record<AiFieldRequest["kind"], FieldPrompt> = {
  title: {
    system:
      "You write compelling, specific titles for a student society website. " +
      "Return ONLY the title text: no quotes, no markdown, no trailing period. " +
      "Keep it under 90 characters, title-case where natural, instantly understandable.",
    maxChars: 200,
  },
  excerpt: {
    system:
      "You write short card descriptions (excerpts) for a student society website. " +
      "Return ONLY the excerpt: 1-2 sentences, under 280 characters, plain text, " +
      "no quotes, no markdown, engaging but factual — no exclamation spam.",
    maxChars: 500,
  },
  tagline: {
    system:
      "You write one-line pitch taglines for student society projects. " +
      "Return ONLY the tagline: a single sentence under 120 characters, " +
      "no quotes, no markdown.",
    maxChars: 300,
  },
  achievement: {
    system:
      "You write short third-person achievement summaries for an alumni directory. " +
      "Return ONLY the summary: 1-2 sentences under 220 characters, plain text, " +
      "no quotes, no markdown, factual and respectful.",
    maxChars: 500,
  },
  description: {
    system:
      "You write clear long-form descriptions for a student society website. " +
      "Return ONLY the description text: 2-4 short paragraphs separated by blank " +
      "lines, plain text (no markdown, no bullet symbols, no headings), under " +
      "1,200 characters, concrete and informative.",
    maxChars: 20_000,
  },
  content: {
    system:
      "You write social-feed post bodies for a student society. " +
      "Return ONLY the post text: 2-5 short paragraphs separated by blank lines, " +
      "plain text (no markdown, no hashtags), warm and professional, under 1,200 characters.",
    maxChars: 20_000,
  },
  bio: {
    system:
      "You write short third-person professional bios for a student society website. " +
      "Return ONLY the bio: 1-2 sentences (under 320 characters), plain text, " +
      "no quotes, no markdown, factual — never invent credentials or employers.",
    maxChars: 2_000,
  },
  tags: {
    system:
      "You pick search tags for a student society website. " +
      "Return ONLY the tags, one per line: 4-8 tags, each 1-4 words, lowercase-ish " +
      "short keywords, no numbering, no bullets, no '#', no duplicates.",
    maxChars: 1_000,
  },
  technologies: {
    system:
      "You list the technologies used by a software project. " +
      "Return ONLY the technology names, one per line: 3-10 items, proper capitalization " +
      "(e.g. Node.js, TypeScript), no versions, no descriptions, no duplicates.",
    maxChars: 1_000,
  },
  skills: {
    system:
      "You list professional skills for a member/alumni profile. " +
      "Return ONLY the skills, one per line: 4-10 items, each 1-3 words " +
      "(e.g. React, Public Speaking), no levels, no descriptions, no duplicates.",
    maxChars: 1_000,
  },
  interests: {
    system:
      "You list professional interests for a member profile. " +
      "Return ONLY the interests, one per line: 3-8 items, each 1-4 words " +
      "(e.g. EdTech, Open Source), no descriptions, no duplicates.",
    maxChars: 1_000,
  },
  highlights: {
    system:
      "You list career highlights for an alumni profile. " +
      "Return ONLY the highlights, one per line: 3-6 items, each one concise sentence " +
      "(under 120 characters), plain text, no bullets, no numbering — only facts " +
      "supported by the material.",
    maxChars: 2_000,
  },
  alt: {
    system:
      "You write alt text for images on a student society website. " +
      "Return ONLY the alt text: one descriptive sentence under 120 characters, " +
      "plain text, no quotes, no 'image of' preamble, no markdown.",
    maxChars: 300,
  },
  seoTitle: {
    system:
      "You write SEO titles for a student society website. " +
      "Return ONLY the SEO title: under 60 characters, include the important keywords " +
      "from the material first, no quotes, no branding suffix, no markdown.",
    maxChars: 200,
  },
  seoDescription: {
    system:
      "You write meta descriptions for a student society website. " +
      "Return ONLY the description: one sentence under 155 characters, " +
      "plain text, no quotes, no markdown, front-load the key information.",
    maxChars: 400,
  },
};

interface GroqChatResponse {
  choices?: Array<{ message?: { content?: string } }>;
}

/** Groq error bodies: { error: { message, code?, type? } } — logs only. */
interface GroqErrorBody {
  error?: { message?: string; code?: string; type?: string };
}

/**
 * Read the upstream error body for LOGGING and failure classification.
 * The key never appears in a body; the extracted excerpt is safe to log and
 * (status + class only) to mirror back to the admin in a fixed message.
 */
async function readUpstreamError(response: Response): Promise<string> {
  try {
    const payload = (await response.json()) as GroqErrorBody | null;
    const code = payload?.error?.code ?? payload?.error?.type ?? "";
    const message = payload?.error?.message ?? "";
    return `${code} ${message}`.trim().slice(0, 300);
  } catch {
    return "";
  }
}

/** The configured GROQ_MODEL was rejected (unknown id, decommissioned, …). */
function isModelRejection(status: number, upstream: string): boolean {
  if (status === 404) return true;
  return /model[_ -]?(not[_ ]?found|decommissioned|deprecated)|does not exist|unknown model|invalid model/i.test(
    upstream,
  );
}

/** Strip markdown fences, wrapping quotes and stray whitespace from answers. */
function cleanAnswer(raw: string): string {
  let text = raw.trim();
  // Whole-answer code fence: ```\n...\n``` or ```lang\n...\n```
  const fence = text.match(/^```[a-zA-Z]*\n([\s\S]*?)\n?```$/);
  if (fence) text = fence[1].trim();
  // Model wrapped the answer in quotes despite instructions.
  if (
    text.length >= 2 &&
    ((text.startsWith('"') && text.endsWith('"')) ||
      (text.startsWith("\u201c") && text.endsWith("\u201d")))
  ) {
    text = text.slice(1, -1).trim();
  }
  return text;
}

/** Split a list-kind answer into clean, capped items (drops empties/dupes). */
function parseListItems(raw: string): string[] {
  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.replace(/^[\s\-*\d.)]+/, "").trim())
    .flatMap((line) =>
      line.includes(",") && line.split(",").every((part) => part.trim().length < 40)
        ? line.split(",")
        : [line],
    )
    .map((item) => item.replace(/\s+/g, " ").trim())
    .filter((item) => item.length > 0 && item.length <= 60);

  const seen = new Set<string>();
  const items: string[] = [];
  for (const item of lines) {
    const key = item.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    items.push(item);
    if (items.length >= 20) break;
  }
  return items;
}

export interface AiFieldResult {
  kind: AiFieldRequest["kind"];
  /** Plain-text answer for text kinds (null for list kinds). */
  value: string | null;
  /** Cleaned items for list kinds (null for text kinds). */
  items: string[] | null;
}

/**
 * Generate one field. Throws AiProviderError with a client-safe message on
 * any upstream failure; raw provider errors and the API key NEVER escape.
 */
export async function generateFieldText(request: AiFieldRequest): Promise<AiFieldResult> {
  const prompt = FIELD_PROMPTS[request.kind];

  const contextParts = [
    request.context ? `Content type: ${request.context}.` : "",
    request.title ? `Existing title: "${request.title}".` : "",
  ].filter(Boolean);

  const messages = [
    { role: "system", content: prompt.system },
    {
      role: "user",
      content:
        `${contextParts.join(" ")}\n` +
        `Fill the "${request.kind}" field using ONLY the material below.\n` +
        `If the material does not contain enough information, write the most ` +
        `reasonable neutral version without inventing specific facts (names, dates, numbers).\n\n` +
        `MATERIAL:\n${request.source}`,
    },
  ];

  let response: Response;
  try {
    response = await fetch(`${env.groqApiUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.groqApiKey}`,
      },
      body: JSON.stringify({
        model: env.groqModel,
        messages,
        temperature: 0.7,
        max_tokens: 1_000,
        stream: false,
      }),
      signal: AbortSignal.timeout(env.aiFieldTimeoutMs),
    });
  } catch (error) {
    if (error instanceof Error && error.name === "TimeoutError") {
      throw new AiProviderError(
        504,
        "The AI provider took too long to answer. Please try again.",
      );
    }
    logger.error("[admin-ai] Groq request failed:", error instanceof Error ? error.message : error);
    throw new AiProviderError(
      502,
      "The AI assistant could not be reached. Please try again shortly.",
    );
  }

  if (!response.ok) {
    // Read the upstream body for LOGGING/classification (never the key, and
    // only fixed safe messages reach the client — but precise enough that a
    // misconfigured deployment can be fixed from the panel message alone).
    const upstream = await readUpstreamError(response);
    logger.error(
      `[admin-ai] Groq answered ${response.status}${upstream ? ` — ${upstream}` : ""}`,
    );
    if (response.status === 401 || response.status === 403) {
      throw new AiProviderError(
        502,
        "The AI assistant is misconfigured — the provider rejected the API key. " +
          "Set a valid GROQ_API_KEY on the SERVER project (Vercel → Settings → " +
          "Environment Variables) and redeploy the server.",
      );
    }
    if (isModelRejection(response.status, upstream)) {
      throw new AiProviderError(
        502,
        `The AI model "${env.groqModel}" was rejected by the provider. ` +
          "Set GROQ_MODEL to a valid Groq model id on the SERVER project " +
          "(e.g. llama-3.3-70b-versatile) and redeploy the server.",
      );
    }
    if (response.status === 429) {
      throw new AiProviderError(
        429,
        "The AI provider is rate limiting requests. Please wait a moment and try again.",
      );
    }
    throw new AiProviderError(
      502,
      `The AI provider failed to answer (HTTP ${response.status}). Please try again shortly.`,
    );
  }

  const payload = (await response.json().catch(() => null)) as GroqChatResponse | null;
  const raw = payload?.choices?.[0]?.message?.content ?? "";
  const answer = cleanAnswer(raw);

  if (!answer) {
    throw new AiProviderError(502, "The AI returned an empty answer. Please try again.");
  }

  if (isAiListKind(request.kind)) {
    const items = parseListItems(answer);
    if (items.length === 0) {
      throw new AiProviderError(502, "The AI returned no usable items. Please try again.");
    }
    return { kind: request.kind, value: null, items };
  }

  return { kind: request.kind, value: answer.slice(0, prompt.maxChars), items: null };
}
