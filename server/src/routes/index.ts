import { Router } from "express";

import { healthRouter } from "./health.routes.js";
import { authRouter } from "./auth.routes.js";
import { contentRouter } from "./content.routes.js";
import { adminRouter } from "./admin.routes.js";

/**
 * API root router.
 *
 *   /api/health   liveness + database probe        (Phase 1)
 *   /api/auth/*   HTTP-only cookie authentication  (Phase 7)
 *   /api/<resource>  MongoDB-backed public content (Phase 8)
 *   /api/admin/*   admin-only surface (requireAdmin)  (Phase 9)
 */
export const apiRouter = Router();

apiRouter.use(healthRouter);
apiRouter.use(authRouter);
apiRouter.use(contentRouter);
apiRouter.use(adminRouter);
