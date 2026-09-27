import { useEffect } from "react";

/**
 * Locks body scroll while `locked` is true (mobile menu overlay).
 * Restores the previous overflow state on cleanup.
 */
export function useLockBodyScroll(locked: boolean) {
  useEffect(() => {
    if (!locked) return;

    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [locked]);
}
