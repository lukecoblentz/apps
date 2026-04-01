/** Lightweight celebration when a task is marked done (respects reduced motion). */
export function fireTaskCompleteConfetti(): void {
  if (typeof window === "undefined") return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  void import("canvas-confetti").then((mod) => {
    const c = mod.default;
    c({
      particleCount: 85,
      spread: 72,
      origin: { y: 0.62 },
      scalar: 0.92
    });
    window.setTimeout(() => {
      c({ particleCount: 36, angle: 58, spread: 52, origin: { x: 0 } });
      c({ particleCount: 36, angle: 122, spread: 52, origin: { x: 1 } });
    }, 160);
  });
}
