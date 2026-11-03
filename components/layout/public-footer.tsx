import Link from "next/link";
import { Wordmark } from "@/components/ui/wordmark";

const GROUPS = [
  {
    title: "Marketplace",
    links: [
      { href: "/categories", label: "Categories" },
      { href: "/products", label: "Products" },
      { href: "/tenders", label: "Tenders" },
      { href: "/fees", label: "Fees" },
    ],
  },
  {
    title: "Learn",
    links: [
      { href: "/how-it-works", label: "How it works" },
      { href: "/guides", label: "Guides" },
      { href: "/faqs", label: "FAQs" },
      { href: "/about", label: "About" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/terms", label: "Terms" },
      { href: "/privacy", label: "Privacy" },
      { href: "/refund-policy", label: "Refund policy" },
      { href: "/cancellation-policy", label: "Cancellation policy" },
    ],
  },
];

export function PublicFooter() {
  return (
    <footer className="bg-band text-band-muted">
      <div className="page-wrap grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-6 py-8 text-sm">
        <div className="flex flex-col gap-2">
          <Wordmark onBand />
          <p>A private B2B marketplace for India.</p>
          <p>© 2026 Bid Market</p>
        </div>
        {GROUPS.map((group) => (
          <nav key={group.title} aria-label={group.title} className="flex flex-col gap-1">
            <h2 className="font-display text-base font-bold text-band-ink">{group.title}</h2>
            {group.links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="py-0.5 text-band-ink no-underline hover:underline"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        ))}
      </div>
    </footer>
  );
}
