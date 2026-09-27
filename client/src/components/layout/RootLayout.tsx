import { useLayoutEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";

import { Footer } from "@/components/layout/Footer";
import { Navbar } from "@/components/layout/Navbar";
import { ScrollToTop } from "@/components/layout/ScrollToTop";

/**
 * RootLayout — shared chrome for every public route:
 * skip link → header (top strip + navbar) → main outlet → footer.
 * The flex column keeps the footer pinned to the bottom on short pages.
 */
export function RootLayout() {
  const { pathname } = useLocation();

  // Move focus to the main region on navigation (keyboard/AT friendliness).
  useLayoutEffect(() => {
    const main = document.getElementById("main-content");
    if (main) {
      main.focus({ preventScroll: true });
    }
  }, [pathname]);

  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

      <Navbar />

      <main id="main-content" tabIndex={-1} className="flex flex-1 flex-col outline-none">
        <Outlet />
      </main>

      <Footer />

      <ScrollToTop />
    </div>
  );
}
