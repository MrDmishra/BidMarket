import Link from "next/link";

const LINKS = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/organisations", label: "Organisations" },
  { href: "/admin/incidents", label: "Incidents" },
  { href: "/admin/tickets", label: "Tickets" },
  { href: "/admin/tenders", label: "Tenders" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/audit", label: "Audit log" },
  { href: "/admin/categories", label: "Categories" },
  { href: "/admin/settings", label: "Fees and settings" },
];

export function AdminNav({ current }: { current: string }) {
  return (
    <nav
      aria-label="Admin"
      className="flex flex-wrap gap-x-4 gap-y-2 border-b border-line pb-3 text-sm"
    >
      {LINKS.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          aria-current={link.href === current ? "page" : undefined}
          className={
            link.href === current ? "font-bold text-ink underline" : "text-muted hover:text-ink"
          }
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
