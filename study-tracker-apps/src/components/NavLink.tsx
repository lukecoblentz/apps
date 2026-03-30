"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type NavLinkProps = {
  href: string;
  children: ReactNode;
};

export default function NavLink({ href, children }: NavLinkProps) {
  const pathname = usePathname();
  const active = pathname === href || (href !== "/" && pathname.startsWith(href));

  return (
    <Link
      href={href}
      className="nav-link"
      style={
        active
          ? { color: "var(--text)", background: "var(--bg-subtle)" }
          : undefined
      }
    >
      {children}
    </Link>
  );
}
