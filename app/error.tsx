"use client";

import { Button } from "@/components/ui/button";
import { NoticePage } from "@/components/ui/notice-page";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <NoticePage
      title="Something went wrong"
      body="Try again. If this keeps happening, contact support."
    >
      {error.digest ? (
        <p className="font-mono text-sm text-muted">Reference: {error.digest}</p>
      ) : null}
      <Button onClick={reset}>Try again</Button>
    </NoticePage>
  );
}
