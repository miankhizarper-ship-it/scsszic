import type { Request, RequestHandler } from "express";

import { withErrorBoundary } from "../content/content.controller.js";
import {
  generateImagekitAuthParams,
  isImagekitUploadFolder,
  isImagekitUploadsEnabled,
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
 */

const IMAGEKIT_NOT_CONFIGURED =
  "Image uploads are not configured on the server. Ask the site administrator to set the IMAGEKIT_* environment variables.";

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

    res.status(200).json({ data: generateImagekitAuthParams(rawFolder) });
  },
  "media-imagekit",
);
