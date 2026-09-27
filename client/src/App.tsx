import { RouterProvider } from "react-router-dom";
import { appRouter } from "@/routes/AppRoutes";

/**
 * Application shell. Providers live in main.tsx:
 *  - QueryClientProvider (TanStack Query — server state, Phase 2+)
 *  - MotionConfig (Framer Motion, reduced-motion aware)
 */
export default function App() {
  return <RouterProvider router={appRouter} />;
}
