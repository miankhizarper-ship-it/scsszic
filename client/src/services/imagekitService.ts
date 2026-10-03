import { apiFetch, ApiError } from "@/services/apiClient";

/**
 * imagekitService (Task 37) — browser-DIRECT image uploads to ImageKit for
 * the community surfaces (feed artwork, member avatars).
 *
 * Flow (no file bytes ever touch our API server):
 *   1. GET /api/media/imagekit-auth?folder=<feed|avatar> — the SERVER signs
 *      a short-lived upload token (HMAC-SHA1 with the PRIVATE key, which
 *      never leaves the server).
 *   2. POST multipart → auth.uploadUrl with the file + auth params — the
 *      response carries the public CDN `url` that the form then stores.
 *
 * The endpoint is role-gated server-side (member|manage|admin): plain-user
 * and anonymous callers get 401/403 before any token exists. A deployment
 * without IMAGEKIT_* credentials answers 503 — the upload widget treats
 * that as "not configured" and the forms keep their URL inputs.
 */

/** Server-recognized folders (the server owns the real folder path). */
export type ImageKitFolder = "feed" | "avatar";

export interface ImageKitAuthParams {
  token: string;
  signature: string;
  expire: number;
  publicKey: string;
  urlEndpoint: string;
  folder: string;
  uploadUrl: string;
}

/** Images only — the formats the feed cards and avatars actually render. */
const ACCEPTED_MIME_PREFIX = "image/";
const ACCEPTED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
]);

/** Hard client-side cap — mirrors the platform's other upload surfaces. */
export const IMAGEKIT_MAX_BYTES = 10 * 1024 * 1024;

export class ImageKitUploadError extends Error {
  readonly code: "INVALID_FILE" | "TOO_LARGE" | "NETWORK" | "SERVER";
  constructor(code: ImageKitUploadError["code"], message: string) {
    super(message);
    this.name = "ImageKitUploadError";
    this.code = code;
  }
}

/** Client-side pre-validation — cheap, before any network traffic. */
export function validateImageFile(file: File): void {
  if (!file.type.startsWith(ACCEPTED_MIME_PREFIX) || !ACCEPTED_TYPES.has(file.type)) {
    throw new ImageKitUploadError(
      "INVALID_FILE",
      "Choose an image file (JPG, PNG, WebP, GIF, or AVIF).",
    );
  }
  if (file.size > IMAGEKIT_MAX_BYTES) {
    throw new ImageKitUploadError(
      "TOO_LARGE",
      `Images must be at most ${Math.round(IMAGEKIT_MAX_BYTES / (1024 * 1024))} MB.`,
    );
  }
}

/**
 * Upload one image and resolve with its public CDN URL. `onProgress`
 * reports 0–100 while the bytes leave the browser (XHR — fetch cannot
 * report upload progress).
 */
export async function uploadImageToImagekit(
  file: File,
  folder: ImageKitFolder,
  onProgress?: (percent: number) => void,
): Promise<string> {
  validateImageFile(file);

  // 1 — the server-signed auth params (also proves the role + config).
  // no-store: a signed token is single-purpose — a cached replay would be
  // rejected by the image host as a reused token.
  let auth: ImageKitAuthParams;
  try {
    const response = await apiFetch<{ data: ImageKitAuthParams }>("/media/imagekit-auth", {
      params: { folder },
      cache: "no-store",
    });
    auth = response.data;
  } catch (error) {
    if (error instanceof ApiError) {
      throw new ImageKitUploadError("SERVER", error.message);
    }
    throw new ImageKitUploadError("NETWORK", "Couldn't reach the server to start the upload.");
  }

  // 2 — the browser uploads straight to ImageKit (or the QA mock).
  const form = new FormData();
  form.append("file", file);
  form.append("fileName", file.name || "image");
  form.append("folder", auth.folder);
  form.append("publicKey", auth.publicKey);
  form.append("token", auth.token);
  form.append("expire", String(auth.expire));
  form.append("signature", auth.signature);
  // Unique file names: concurrent uploads can never overwrite each other.
  form.append("useUniqueFileName", "true");

  const url = await new Promise<string>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", auth.uploadUrl);
    xhr.responseType = "json";
    xhr.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress(Math.min(99, Math.round((event.loaded / event.total) * 100)));
      }
    });
    xhr.addEventListener("load", () => {
      const body = (xhr.response ?? {}) as { url?: string; message?: string };
      if (xhr.status >= 200 && xhr.status < 300 && typeof body.url === "string" && body.url) {
        resolve(body.url);
        return;
      }
      const detail =
        typeof body.message === "string" && body.message ? ` — ${body.message}` : "";
      if (xhr.status === 401 || xhr.status === 403) {
        // The upload host rejected the AUTH PARAMS, not the file. That is
        // the signature of a server-side key problem — name the exact fix.
        reject(
          new ImageKitUploadError(
            "SERVER",
            `The image host rejected the upload (HTTP ${xhr.status}${detail}). This almost always ` +
              "means the server's IMAGEKIT_PRIVATE_KEY doesn't match this ImageKit account: in the " +
              "ImageKit dashboard (Developer options → API keys) press the COPY button on the " +
              "private key — the displayed value is masked — then update IMAGEKIT_PRIVATE_KEY in " +
              "Vercel's SERVER project and redeploy the server.",
          ),
        );
        return;
      }
      reject(
        new ImageKitUploadError(
          "SERVER",
          `The image host rejected the upload (HTTP ${xhr.status})${detail || " — please try again."}`,
        ),
      );
    });
    xhr.addEventListener("error", () => {
      reject(new ImageKitUploadError("NETWORK", "The image upload failed — check your connection."));
    });
    xhr.addEventListener("abort", () => {
      reject(new ImageKitUploadError("NETWORK", "The image upload was cancelled."));
    });
    xhr.addEventListener("loadend", () => {
      if (onProgress) onProgress(100);
    });
    xhr.send(form);
  });

  return url;
}
