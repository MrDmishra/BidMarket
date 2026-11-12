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
    { href: "/admin", label: "Admin" },
    { href: "/products", label: "Marketplace" },
    { href: "/tenders", label: "Public tenders" },
  ],
};

export function dashboardHref(kind: AccountKind | null) {
  return kind === "admin" ? "/admin" : kind ? `/${kind}` : "/onboarding";
}
