"use client";

import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import NavLink from "@/components/NavLink";

const LINKS = [
  { href: "/", label: "Dashboard" },
  { href: "/analytics", label: "Analytics" },
  { href: "/subjects", label: "Subjects" },
  { href: "/invite", label: "Invite" }
] as const;

export default function AppNav() {
  const [open, setOpen] = useState(false);
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);
  const titleId = useId();

  useEffect(() => {
    setPortalRoot(document.body);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  const overlay =
    portalRoot != null
      ? createPortal(
          <>
            <div
              className={open ? "nav-drawer-backdrop nav-drawer-backdrop-visible" : "nav-drawer-backdrop"}
              aria-hidden={!open}
              onClick={() => setOpen(false)}
            />
            <aside
              id="app-nav-drawer"
              className={open ? "nav-drawer nav-drawer-open" : "nav-drawer"}
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
              aria-hidden={!open}
            >
              <div className="nav-drawer-header">
                <span id={titleId} className="nav-drawer-title">
                  Navigate
                </span>
                <button
                  type="button"
                  className="nav-drawer-close"
                  aria-label="Close menu"
                  onClick={() => setOpen(false)}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <nav
                className="nav-drawer-links"
                onClick={(e) => {
                  const t = e.target as HTMLElement;
                  if (t.closest("a")) setOpen(false);
                }}
              >
                {LINKS.map(({ href, label }) => (
                  <NavLink key={href} href={href}>
                    {label}
                  </NavLink>
                ))}
              </nav>
            </aside>
          </>,
          portalRoot
        )
      : null;

  return (
    <>
      <button
        type="button"
        className="nav-menu-btn"
        aria-expanded={open}
        aria-controls="app-nav-drawer"
        aria-haspopup="true"
        onClick={() => setOpen(true)}
      >
        <span className="nav-menu-btn-icon" aria-hidden>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </span>
        <span className="nav-menu-btn-label">Menu</span>
      </button>
      {overlay}
    </>
  );
}
