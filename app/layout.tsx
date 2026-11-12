import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "@fontsource-variable/bricolage-grotesque/wght.css";
import "@fontsource-variable/instrument-sans/wght.css";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/500.css";
import "@fontsource/ibm-plex-mono/600.css";
import "./globals.css";
import { RecoveryForwarder } from "@/components/layout/recovery-forwarder";

export const metadata: Metadata = {
  title: { default: "Bid Market", template: "%s | Bid Market" },
  description: "A private B2B marketplace for direct orders, tenders and reverse auctions.",
  // Only the launched site is indexed. Previews and test builds stay out of search results.
  robots: process.env.APP_ENV === "production" ? undefined : { index: false, follow: false },
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
      <body>
        <RecoveryForwarder />
        {children}
      </body>
    </html>
  );
}
