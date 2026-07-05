"use client";

import { useEffect, useState, type RefObject } from "react";

// Tracks whether a horizontally-scrollable element has more content
// hidden to the left/right, so callers can render edge-fade affordances
// instead of relying on the user finding the scrollbar.
export function useScrollShadows(ref: RefObject<HTMLElement | null>) {
  const [showLeft, setShowLeft] = useState(false);
  const [showRight, setShowRight] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    function update() {
      if (!el) return;
      setShowLeft(el.scrollLeft > 0);
      setShowRight(el.scrollWidth - el.scrollLeft - el.clientWidth > 1);
    }

    update();
    el.addEventListener("scroll", update, { passive: true });

    const resizeObserver = new ResizeObserver(update);
    resizeObserver.observe(el);

    return () => {
      el.removeEventListener("scroll", update);
      resizeObserver.disconnect();
    };
  }, [ref]);

  return { showLeft, showRight };
}
