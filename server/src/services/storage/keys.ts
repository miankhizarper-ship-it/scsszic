import { randomUUID } from "node:crypto";

import { isValidObjectKey } from "./validation.js";

export { isValidObjectKey };

/**
 * Server-generated object keys (Phase 10A).
 *
 * Shape: uploads/<folder>/<yyyy>/<mm>/<uuid>.<ext>
 *  - the UUID (not the original filename) prevents collisions and path
 *    traversal; the folder is a validated enum member; the extension is
 *    derived from the validated MIME type.
 *  - the year/month segments keep object listings navigable in the R2 UI.
 */
export function buildObjectKey(folder: string, ext: string): string {
  const now = new Date();
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  return `uploads/${folder}/${yyyy}/${mm}/${randomUUID()}.${ext}`;
}
