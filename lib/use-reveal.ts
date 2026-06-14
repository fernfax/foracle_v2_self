"use client";

import { useEffect, useRef } from "react";

/**
 * Scroll-reveal via IntersectionObserver — adds `.revealed` once the element
 * enters the viewport, then disconnects (reveal is one-shot). Matches the
 * existing pure-CSS animation convention (.hp-*): the CSS class `.reveal`
 * carries the hidden state + transition, `.revealed` is the visible end state.
 *
 * Under prefers-reduced-motion the element is shown immediately (no animation).
 */
export function useReveal<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      el.classList.add("revealed");
      return;
    }

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add("revealed");
          io.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -10% 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return ref;
}
