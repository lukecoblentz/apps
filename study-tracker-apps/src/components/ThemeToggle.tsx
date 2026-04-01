"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "study-tracker-theme";

export type ThemePreference = "system" | "light" | "dark";

function readStored(): ThemePreference {
  if (typeof window === "undefined") return "system";
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === "light" || v === "dark" || v === "system") return v;
  } catch {
    /* ignore */
  }
  return "system";
}

function applyToDocument(pref: ThemePreference) {
  const root = document.documentElement;
  if (pref === "light") {
    root.setAttribute("data-theme", "light");
  } else if (pref === "dark") {
    root.setAttribute("data-theme", "dark");
  } else {
    root.removeAttribute("data-theme");
  }
}

export default function ThemeToggle() {
  const [pref, setPref] = useState<ThemePreference>("system");

  useEffect(() => {
    const p = readStored();
    setPref(p);
    applyToDocument(p);
  }, []);

  const cycle = useCallback(() => {
    const next: ThemePreference =
      pref === "system" ? "light" : pref === "light" ? "dark" : "system";
    setPref(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
    applyToDocument(next);
  }, [pref]);

  const label =
    pref === "system"
      ? "Theme: system (matches device)"
      : pref === "light"
        ? "Theme: light"
        : "Theme: dark";

  const Icon =
    pref === "light" ? SunIcon : pref === "dark" ? MoonIcon : SystemIcon;

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={cycle}
      title={label}
      aria-label={label}
    >
      <Icon />
    </button>
  );
}

function SunIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.75" />
      <path
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"
      />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M21 14.5A8.5 8.5 0 0 1 9.5 3a8.5 8.5 0 1 0 11.5 11.5Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SystemIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect
        x="3"
        y="4"
        width="18"
        height="13"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.75"
      />
      <path stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" d="M8 21h8M12 17v4" />
    </svg>
  );
}
