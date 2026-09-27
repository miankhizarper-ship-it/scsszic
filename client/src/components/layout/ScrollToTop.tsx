import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * ScrollToTop — restores scroll position on route change so navigations
 * always land at the top of the new page.
 */
export function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [pathname]);

  return null;
}
