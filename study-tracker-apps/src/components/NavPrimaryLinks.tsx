"use client";

import NavLink from "@/components/NavLink";

const PRIMARY_LINKS = [
  { href: "/classes", label: "Classes" },
  { href: "/assignments", label: "Assignments" },
  { href: "/calendar", label: "Calendar" }
] as const;

export default function NavPrimaryLinks() {
  return (
    <nav className="nav-primary-links" aria-label="Primary">
      {PRIMARY_LINKS.map(({ href, label }) => (
        <NavLink key={href} href={href}>
          {label}
        </NavLink>
      ))}
    </nav>
  );
}
