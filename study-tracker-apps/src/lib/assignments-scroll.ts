/**
 * Scrolls the first visible "Mark done" control into view (instant — no smooth scroll).
 * Used after completing an assignment so the next task is in view immediately.
 */
export function scrollFirstMarkDoneIntoView() {
  if (typeof window === "undefined") return;
  requestAnimationFrame(() => {
    const board = document.querySelector(".assignments-board");
    if (!board) return;
    const btns = board.querySelectorAll("button.btn-primary.btn-sm");
    for (const btn of btns) {
      if (btn.textContent?.trim() === "Mark done") {
        (btn as HTMLElement).scrollIntoView({ behavior: "auto", block: "nearest" });
        break;
      }
    }
  });
}
