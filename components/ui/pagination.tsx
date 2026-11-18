import Link from "next/link";

type PaginationProps = {
  page: number;
  totalPages: number;
  /** Builds the link for a page, keeping the current filters. */
  hrefFor: (page: number) => string;
  label: string;
};

/** Numbered pages with Previous and Next. Shows the first, last and nearby pages only. */
export function Pagination({ page, totalPages, hrefFor, label }: PaginationProps) {
  if (totalPages <= 1) return null;
  const shown = Array.from({ length: totalPages }, (_unused, index) => index + 1).filter(
    (number) => number === 1 || number === totalPages || Math.abs(number - page) <= 1,
  );
  const item = "inline-flex min-h-11 min-w-11 items-center justify-center rounded-control px-3";

  return (
    <nav aria-label={label} className="flex flex-wrap items-center gap-1">
      {page > 1 ? (
        <Link className={`${item} border border-line no-underline`} href={hrefFor(page - 1)}>
          Previous
        </Link>
      ) : null}
      {shown.map((number, index) => (
        <span key={number} className="flex items-center gap-1">
          {index > 0 && number - shown[index - 1]! > 1 ? (
            <span className="px-1 text-muted" aria-hidden="true">
              …
            </span>
          ) : null}
          {number === page ? (
            <span aria-current="page" className={`${item} bg-accent font-semibold text-accent-ink`}>
              {number}
            </span>
          ) : (
            <Link className={`${item} border border-line no-underline`} href={hrefFor(number)}>
              {number}
            </Link>
          )}
        </span>
      ))}
      {page < totalPages ? (
        <Link className={`${item} border border-line no-underline`} href={hrefFor(page + 1)}>
          Next
        </Link>
      ) : null}
      <span className="ml-2 text-sm text-muted">
        Page {page} of {totalPages}
      </span>
    </nav>
  );
}
