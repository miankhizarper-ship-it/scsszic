/**
 * Express request augmentation for the authentication context.
 *
 * `req.user` is ALWAYS the secret-free PublicAuthUser DTO (set exclusively by
 * requireAuth/optionalAuth — see authMiddleware.ts). Password hashes and raw
 * AuthUser records must never be attached to the request object.
 */

import type { PublicAuthUser } from "../auth/types.js";

declare global {
  namespace Express {
    interface Request {
      /** Safe authenticated user context — undefined when anonymous. */
      user?: PublicAuthUser;
    }
  }
}

export {};
