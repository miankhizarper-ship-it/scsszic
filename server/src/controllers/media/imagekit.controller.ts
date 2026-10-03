import type { Request, RequestHandler } from "express";

import { withErrorBoundary } from "../content/content.controller.js";
import {
  generateImagekitAuthParams,
  imagekitPrivateKeyLooksMasked,
  isImagekitUploadFolder,
  isImagekitUploadsEnabled,
  verifyImagekitCredentials,
} from "../../services/media/imagekit.service.js";

/**
 * Community media upload controllers (Task 37) — request/response boundary
 * for /api/media/*. The route layer has already enforced requireAuth +
 * requireAnyRole([member, manage, admin]), so every request here carries a
 * verified community session; anonymous and plain-user callers never reach
 * this code.
 *
 * This is a SIGNING endpoint, not an upload endpoint: the browser uploads
 * directly to ImageKit (or the QA mock) with the returned auth params —
 * no multipart body ever arrives here, and the private key never leaves
 * the server. The response mirrors the platform envelope:
 *
 *   200 { data: { token, signature, expire, publicKey, urlEndpoint,
 *                 folder, uploadUrl } }
 *   400 { message }   unknown folder value
 *   401/403           route layer (anon / plain user)
 *   503 { message }   ImageKit credentials missing on this deployment
 *   503 { message }   IMAGEKIT_PRIVATE_KEY is the masked display string
 *   503 { message }   IMAGEKIT_PRIVATE_KEY rejected by ImageKit (verified
 *                     live against the Media Library API before signing —
 *                     a wrong key fails HERE with instructions, not as an
 *                     opaque 403 on the browser's upload POST)
 */

const IMAGEKIT_NOT_CONFIGURED =
  "Image uploads are not configured on the server. Set IMAGEKIT_PRIVATE_KEY, IMAGEKIT_PUBLIC_KEY and IMAGEKIT_URL_ENDPOINT in the SERVER environment (Vercel → the API project → Settings → Environment Variables) and redeploy the server.";

const IMAGEKIT_KEY_MASKED =
  "The server's IMAGEKIT_PRIVATE_KEY looks like the MASKED display value from the ImageKit dashboard (it contains asterisks). Open the ImageKit dashboard → Developer options → API keys and press the COPY button on the private key — the visible text is not the real key. Paste the copied value into IMAGEKIT_PRIVATE_KEY in Vercel's SERVER project and redeploy the server.";

/** GET /api/media/imagekit-auth?folder=feed|avatar — mint one upload token. */
export const getImagekitUploadAuth: RequestHandler = withErrorBoundary(
  async (req: Request, res) => {
    const rawFolder = typeof req.query.folder === "string" ? req.query.folder.trim() : "";
    if (!rawFolder || !isImagekitUploadFolder(rawFolder)) {
      res.status(400).json({ message: "Unknown upload folder." });
      return;
    }

    if (!isImagekitUploadsEnabled()) {
      res.status(503).json({ message: IMAGEKIT_NOT_CONFIGURED });
      return;
    }

    if (imagekitPrivateKeyLooksMasked()) {
      res.status(503).json({ message: IMAGEKIT_KEY_MASKED });
      return;
    }

    // Verify the private key against ImageKit BEFORE signing — a wrong key
    // surfaces here, with instructions, instead of as a 403 on the
    // browser's direct upload POST (which this server cannot even see).
    const check = await verifyImagekitCredentials();
    if (!check.ok) {
      const upstream = check.upstreamMessage ? ` ImageKit says: "${check.upstreamMessage}".` : "";
      res.status(503).json({
        message:
          `The server's IMAGEKIT_PRIVATE_KEY was rejected by ImageKit (HTTP ${check.status}). ` +
          "Re-copy the full private key from the ImageKit dashboard (Developer options → API keys → " +
          "the COPY button — the displayed value is masked), update IMAGEKIT_PRIVATE_KEY in " +
          `Vercel's SERVER project, and redeploy the server.${upstream}`,
      });
      return;
    }

    // A signed token is single-purpose — no browser/HTTP cache may ever
    // replay a response (a reused token would be rejected downstream).
    res.set("Cache-Control", "no-store");
    res.status(200).json({ data: generateImagekitAuthParams(rawFolder) });
  },
  "media-imagekit",
);
