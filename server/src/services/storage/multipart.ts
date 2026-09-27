import type { NextFunction, Request, Response } from "express";
import multer from "multer";

import { MAX_UPLOAD_BYTES } from "./validation.js";

/**
 * Multipart handling for media uploads (Phase 10A).
 *
 *  - memory storage ONLY: bytes live in `req.file.buffer` for the duration of
 *    one request/invocation — nothing is ever written to the serverless
 *    filesystem (Vercel requirement);
 *  - hard caps: exactly one file, ≤ MAX_UPLOAD_BYTES, small number of form
 *    fields — a request that exceeds a cap is answered here (413/400) instead
 *    of bubbling into the generic 500;
 *  - errors are mapped to the house `{ message }` envelope with honest
 *    statuses; unknown errors keep flowing to the central handler.
 */

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_UPLOAD_BYTES,
    files: 1,
    fields: 8,
    fieldNameSize: 100,
  },
});

function bytesToMb(bytes: number): string {
  return `${Math.round((bytes / (1024 * 1024)) * 10) / 10} MB`;
}

export function uploadSingleFile(fieldName: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    upload.single(fieldName)(req, res, (error: unknown) => {
      if (error === undefined) {
        next();
        return;
      }

      if (error instanceof multer.MulterError) {
        switch (error.code) {
          case "LIMIT_FILE_SIZE":
            res.status(413).json({
              message: `File is too large. Maximum size is ${bytesToMb(MAX_UPLOAD_BYTES)}.`,
            });
            return;
          case "LIMIT_UNEXPECTED_FILE":
            res.status(400).json({
              message: `Unexpected upload field. Use the "${fieldName}" field.`,
            });
            return;
          default:
            res.status(400).json({ message: "The upload could not be processed." });
            return;
        }
      }

      next(error);
    });
  };
}
