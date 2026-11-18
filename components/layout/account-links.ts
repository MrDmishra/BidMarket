import type { NavLink } from "@/components/layout/account-nav";

type AccountKind = "buyer" | "seller" | "admin";

/** Where each kind of account can go from any signed-in page. */
export const ACCOUNT_LINKS: Record<AccountKind, NavLink[]> = {
  seller: [
    { href: "/seller", label: "Dashboard" },
    { href: "/seller/orders", label: "Orders" },
    { href: "/seller/tenders", label: "Tenders" },
    { href: "/seller/products", label: "My products" },
    { href: "/seller/billing", label: "Billing" },
    { href: "/products", label: "Marketplace" },
    { href: "/support", label: "Support" },
  ],
  buyer: [
    { href: "/buyer", label: "Dashboard" },
    { href: "/products", label: "Marketplace" },
    { href: "/buyer/orders", label: "Orders" },
    { href: "/buyer/tenders", label: "Tenders" },
    { href: "/buyer/billing", label: "Billing" },
    { href: "/support", label: "Support" },
  ],
  admin: [
    { href: "/admin", label: "Overview" },
    { href: "/admin/organisations", label: "Organisations" },
    { href: "/admin/incidents", label: "Incidents" },
    { href: "/admin/tickets", label: "Tickets" },
    { href: "/admin/tenders", label: "Tenders" },
    { href: "/admin/orders", label: "Orders" },
    { href: "/admin/audit", label: "Audit log" },
    { href: "/admin/categories", label: "Categories" },
    { href: "/admin/settings", label: "Fees and settings" },
    { href: "/products", label: "Marketplace" },
  ],
};

export function dashboardHref(kind: AccountKind | null) {
  return kind === "admin" ? "/admin" : kind ? `/${kind}` : "/onboarding";
}
