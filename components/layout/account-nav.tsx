"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type NavLink = { href: string; label: string };

/** The signed-in navigation bar. A link stays highlighted on its sub-pages, such as one order. */
export function AccountNav({ links }: { links: NavLink[] }) {
  const pathname = usePathname();
  const active = links
    .filter((link) => pathname === link.href || pathname.startsWith(`${link.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;

  return (
    <nav aria-label="Account" className="min-w-0 flex-1 overflow-x-auto">
      <div className="flex gap-0.5 whitespace-nowrap">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            aria-current={link.href === active ? "page" : undefined}
            className={`border-b-2 px-3 py-2.5 text-[15px] font-medium no-underline hover:bg-sunk ${
              link.href === active ? "border-accent text-accent" : "border-transparent text-ink"
            }`}
          >
            {link.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
