"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/categories", label: "Categories" },
  { href: "/products", label: "Products" },
  { href: "/tenders", label: "Tenders" },
  { href: "/how-it-works", label: "How it works" },
  { href: "/fees", label: "Fees" },
  { href: "/contact", label: "Support" },
];

export function MainNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Main" className="min-w-0 flex-1 overflow-x-auto">
      <div className="flex gap-0.5 whitespace-nowrap">
        {LINKS.map((link) => {
          const active = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              aria-current={active ? "page" : undefined}
              className={`border-b-2 px-3 py-2.5 text-[15px] font-medium no-underline hover:bg-sunk ${
                active ? "border-accent text-accent" : "border-transparent text-ink"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
