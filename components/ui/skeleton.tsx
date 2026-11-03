/** Stays invisible for 200 ms, so fast responses never flash a loading state. */
export function SkeletonRows({ rows = 4, label = "Loading" }: { rows?: number; label?: string }) {
  return (
    <div role="status" aria-label={label} className="flex flex-col gap-2">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="skeleton-row h-11 rounded-control bg-sunk" />
      ))}
    </div>
  );
}
