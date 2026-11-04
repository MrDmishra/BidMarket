import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "@fontsource-variable/bricolage-grotesque/wght.css";
import "@fontsource-variable/instrument-sans/wght.css";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/500.css";
import "@fontsource/ibm-plex-mono/600.css";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Bid Market", template: "%s | Bid Market" },
  description: "A private B2B marketplace for direct orders, tenders and reverse auctions.",
  // Remove at launch. Unfinished builds must stay out of search results.
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover" };

// Runs before the first paint, so a saved choice never flashes the wrong theme.
const APPLY_SAVED_THEME = `try{var t=localStorage.getItem("theme");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en-IN" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: APPLY_SAVED_THEME }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
