"use client";

import { useEffect, type RefObject } from "react";

// Auto-scrolls a horizontally-scrollable container while the mouse rests
// in a narrow zone right at its left/right edge — lets users reach hidden
// columns without hunting for the scrollbar. Deliberately narrow (not the
// whole table) and speed-ramped by how deep into the zone the cursor is,
// so it only engages right at the boundary rather than firing off drift
// while someone's just reading a cell near the edge.
const EDGE_ZONE_PX = 48;
const MAX_SPEED_PX_PER_FRAME = 14;

export function useEdgeHoverAutoScroll(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let direction = 0; // -1 left, 0 idle, 1 right
    let speed = 0;
    let frameId: number | null = null;

    function tick() {
      if (!el || direction === 0) {
        frameId = null;
        return;
      }
      el.scrollLeft += direction * speed;
      frameId = requestAnimationFrame(tick);
    }

    function startIfNeeded() {
      if (frameId === null) frameId = requestAnimationFrame(tick);
    }

    function handleMouseMove(e: MouseEvent) {
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const xInEl = e.clientX - rect.left;

      const atLeftEdge = xInEl <= EDGE_ZONE_PX && el.scrollLeft > 0;
      const atRightEdge =
        xInEl >= rect.width - EDGE_ZONE_PX && el.scrollWidth - el.scrollLeft - el.clientWidth > 1;

      if (atLeftEdge) {
        direction = -1;
        speed = MAX_SPEED_PX_PER_FRAME * (1 - xInEl / EDGE_ZONE_PX);
        startIfNeeded();
      } else if (atRightEdge) {
        direction = 1;
        const depth = rect.width - xInEl;
        speed = MAX_SPEED_PX_PER_FRAME * (1 - depth / EDGE_ZONE_PX);
        startIfNeeded();
      } else {
        direction = 0;
      }
    }

    function handleMouseLeave() {
      direction = 0;
    }

    el.addEventListener("mousemove", handleMouseMove);
    el.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      el.removeEventListener("mousemove", handleMouseMove);
      el.removeEventListener("mouseleave", handleMouseLeave);
      if (frameId !== null) cancelAnimationFrame(frameId);
    };
  }, [ref]);
}
