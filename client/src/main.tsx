import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { MotionConfig } from "framer-motion";

import App from "@/App";
import { AuthProvider } from "@/context/AuthProvider";
import { queryClient } from "@/lib/queryClient";
import "@/styles/globals.css";

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Root element #root not found");
}

createRoot(rootElement).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      {/* AuthProvider: session restore via GET /api/auth/me on startup —
          the SERVER decides authentication state, never client storage. */}
      <AuthProvider>
        {/* reducedMotion="user" → every Framer Motion animation respects
            the visitor's prefers-reduced-motion OS setting. */}
        <MotionConfig reducedMotion="user">
          <App />
        </MotionConfig>
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>,
);
