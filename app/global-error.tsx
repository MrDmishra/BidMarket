"use client";

import "./globals.css";

export default function GlobalError({ reset }: { reset: () => void }) {
  return (
    <html lang="en-IN">
      <body>
        <main className="page-wrap py-12">
          <h1 className="text-3xl font-bold">Bid Market is having a problem</h1>
          <p className="my-4 text-muted">Reload the page to try again.</p>
          <button
            className="min-h-11 rounded-control bg-accent px-4 py-2 font-semibold text-accent-ink"
            onClick={reset}
          >
            Reload
          </button>
        </main>
      </body>
    </html>
  );
}
