/**
 * Apply a theme change wrapped in a View Transition so the swap cross-fades
 * instead of hard-cutting. `apply` is the actual theme mutation (e.g. a
 * next-themes setTheme call). Uses the browser's default full-page cross-fade.
 *
 * Falls back to an instant apply when View Transitions are unsupported or the
 * user prefers reduced motion.
 */
type ViewTransitionDocument = Document & {
  startViewTransition?: (callback: () => void) => { finished: Promise<void> };
};

export function applyThemeWithTransition(apply: () => void) {
  if (typeof document === "undefined") {
    apply();
    return;
  }
  const doc = document as ViewTransitionDocument;
  const reduceMotion =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  if (!doc.startViewTransition || reduceMotion) {
    apply();
    return;
  }
  doc.startViewTransition(apply);
}
