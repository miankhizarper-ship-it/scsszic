import type { Request, RequestHandler, Response } from "express";

import { withErrorBoundary } from "../content/content.controller.js";
import { recordAudit } from "../../audit/auditLogger.js";
import { isValidObjectKey } from "../../services/storage/keys.js";
import {
  deleteObject,
  isStorageConfigured,
  StorageError,
  uploadObject,
} from "../../services/storage/index.js";
import { isUploadFolder } from "../../services/storage/validation.js";

/**
 * Admin media upload controllers (Phase 10A) — request/response boundary for
 * /api/admin/uploads. The route layer has already enforced requireAdmin, so
 * every request here carries a verified admin session; there is deliberately
 * no anonymous or public upload path.
 *
 * Response contracts (existing API convention preserved):
 *   upload → 201 { data: { url, key, contentType, size } }
 *   delete → 200 { data: { key, deleted: true } }
 *   errors → 400 { message }            (missing file / malformed key)
 *            415 { message }            (type not allowed / bytes ≠ declared)
 *            413 { message }            (size cap — mapped in multipart.ts)
 *            503 { message }            (R2 not configured)
 *            502 { message }            (R2 upstream failure)
 *
 * MongoDB is untouched here: the returned `url` is stored by the CMS create/
 * update endpoints in the exact same string fields they always used — old
 * external/local URLs and new R2 URLs are interchangeable. Secrets, keys and
 * signed URLs never appear in responses, logs or audit records; audit
 * metadata carries folder/type/size scalars only.
 */

const UPLOAD_NOT_CONFIGURED =
  "Media storage is not configured on the server. Ask the site administrator to set the R2_* environment variables.";
const UPLOAD_UNAVAILABLE =
  "Media storage is temporarily unavailable. Please try again shortly.";

function storageErrorResponse(res: Response, error: StorageError): void {
  switch (error.code) {
    case "INVALID_INPUT":
      res.status(400).json({ message: error.message });
      return;
    case "INVALID_CONTENT_TYPE":
      res.status(415).json({ message: error.message });
      return;
    case "TOO_LARGE":
      res.status(413).json({ message: error.message });
      return;
    case "NOT_CONFIGURED":
      res.status(503).json({ message: UPLOAD_NOT_CONFIGURED });
      return;
    case "UPSTREAM":
      res.status(502).json({ message: UPLOAD_UNAVAILABLE });
      return;
  }
}

/** POST /api/admin/uploads — multipart form: file (binary), folder (text). */
export const uploadAdminMedia: RequestHandler = withErrorBoundary(
  async (req: Request, res: Response) => {
    const file = req.file;
    if (!file) {
      res.status(400).json({
        message: "No file was uploaded.",
        errors: { file: "Choose a file to upload." },
      });
      return;
    }

    const rawFolder = typeof req.body?.folder === "string" ? req.body.folder : "misc";
    const folder = isUploadFolder(rawFolder) ? rawFolder : "misc";

    let stored;
    try {
      stored = await uploadObject({
        buffer: file.buffer,
        contentType: file.mimetype,
        folder,
      });
    } catch (error) {
      if (error instanceof StorageError) {
        storageErrorResponse(res, error);
        return;
      }
      throw error;
    }

    // Audit AFTER success (house rule); failures inside recordAudit never
    // break the response. Metadata is scalar-only and secret-free.
    await recordAudit(req, {
      action: "media.uploaded",
      resourceType: "media",
      resourceId: stored.key,
      resourceLabel: folder,
      metadata: { folder, contentType: stored.contentType, size: stored.size },
    });

    res.status(201).json({ data: stored });
  },
  "admin-uploads",
);

/** DELETE /api/admin/uploads?key=<object key> — removes one stored object. */
export const deleteAdminMedia: RequestHandler = withErrorBoundary(
  async (req: Request, res: Response) => {
    const key = typeof req.query.key === "string" ? req.query.key.trim() : "";
    if (!key || !isValidObjectKey(key)) {
      res.status(400).json({ message: "Invalid or missing object key." });
      return;
    }
    // Configured-check first so a misconfigured deployment answers 503
    // instead of deleting nothing while claiming success.
    if (!isStorageConfigured()) {
      res.status(503).json({ message: UPLOAD_NOT_CONFIGURED });
      return;
    }

    try {
      await deleteObject(key);
    } catch (error) {
      if (error instanceof StorageError) {
        storageErrorResponse(res, error);
        return;
      }
      throw error;
    }

    await recordAudit(req, {
      action: "media.deleted",
      resourceType: "media",
      resourceId: key,
    });

    res.status(200).json({ data: { key, deleted: true } });
  },
  "admin-uploads",
);
