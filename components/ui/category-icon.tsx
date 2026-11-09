import type { ReactNode } from "react";

// Original line drawings on a 24-unit grid. They inherit the text colour, so they follow the theme.
const ICONS: Record<string, ReactNode> = {
  machinery: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1" />
      <circle cx="12" cy="12" r="6.5" />
    </>
  ),
  electrical: <path d="M13 2.5 4.5 13.5h6.5l-1 8 8.5-11h-6.5z" />,
  furniture: (
    <>
      <path d="M7 3.5h10v8.5H7z" />
      <path d="M4.5 12h15v3h-15zM6.5 15v6M17.5 15v6" />
    </>
  ),
  office: (
    <>
      <path d="M6 2.5h8.5l4.5 4.5v14.5H6z" />
      <path d="M14.5 2.5V7H19M9 12h7M9 15.5h7M9 19h4" />
    </>
  ),
  hardware: (
    <>
      <path d="M12 2.5 20.2 7.2v9.6L12 21.5l-8.2-4.7V7.2z" />
      <circle cx="12" cy="12" r="3.5" />
    </>
  ),
  safety: (
    <>
      <path d="M12 2.5 19.5 5.5v6c0 4.6-3.2 8.3-7.5 10-4.3-1.7-7.5-5.4-7.5-10v-6z" />
      <path d="m8.8 12 2.2 2.2 4.2-4.4" />
    </>
  ),
  agriculture: (
    <>
      <path d="M12 21.5V11" />
      <path d="M12 11C12 6.5 8.7 4 4 4c0 4.4 3.2 7 8 7zM12 14c0-3.8 3-6 8-6 0 3.9-3.2 6-8 6z" />
    </>
  ),
  "raw-materials": (
    <>
      <path d="M12 2.5 20.5 7v10L12 21.5 3.5 17V7z" />
      <path d="M3.5 7 12 11.5 20.5 7M12 11.5v10" />
    </>
  ),
  automobile: (
    <>
      <path d="M2.5 6.5h11v9.5h-11zM13.5 9.5h4.5l3.5 3.8v2.7h-8" />
      <circle cx="6.5" cy="18" r="2" />
      <circle cx="17" cy="18" r="2" />
    </>
  ),
  cleaning: (
    <>
      <path d="M12 3c3 3.8 6 7 6 10.8a6 6 0 0 1-12 0C6 10 9 6.8 12 3z" />
      <path d="M9.5 14.5a2.5 2.5 0 0 0 2.5 2.5" />
    </>
  ),
  "musical-instruments": (
    <>
      <path d="M9 18V5.5l11-2V16" />
      <circle cx="6.5" cy="18" r="2.5" />
      <circle cx="17.5" cy="16" r="2.5" />
    </>
  ),
  garments: (
    <path d="M8.5 3 4 5.8l2 4.2 2-1V21h8V9l2 1 2-4.2L15.5 3c-.8 1.8-2 2.8-3.5 2.8S9.3 4.8 8.5 3z" />
  ),
  food: (
    <>
      <path d="M3.5 11h17a8.5 8.5 0 0 1-17 0z" />
      <path d="M9 7.5c0-1.8 1.5-1.8 1.5-3.5M14 7.5c0-1.8 1.5-1.8 1.5-3.5" />
    </>
  ),
  education: (
    <>
      <path d="m2.5 9 9.5-4.5L21.5 9 12 13.5z" />
      <path d="M6.5 11v5c3 2 8 2 11 0v-5M21.5 9v5" />
    </>
  ),
  hospital: (
    <>
      <rect x="3.5" y="3.5" width="17" height="17" rx="2.5" />
      <path d="M12 7.5v9M7.5 12h9" />
    </>
  ),
  sports: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.8 2.6 2.8 15.4 0 18M12 3c-2.8 2.6-2.8 15.4 0 18" />
    </>
  ),
};

const FALLBACK = (
  <>
    <path d="M3.5 7.5 12 3l8.5 4.5v9L12 21l-8.5-4.5z" />
    <path d="M3.5 7.5 12 12l8.5-4.5M12 12v9" />
  </>
);

type CategoryIconProps = { slug: string; size?: "md" | "lg" };

/** A drawn mark for a main category. It is decorative, because the category name always sits next to it. */
export function CategoryIcon({ slug, size = "md" }: CategoryIconProps) {
  const box = size === "lg" ? "size-14" : "size-11";
  const glyph = size === "lg" ? "size-8" : "size-6";
  return (
    <span
      aria-hidden="true"
      className={`${box} inline-flex shrink-0 items-center justify-center rounded-panel bg-sunk text-brand`}
    >
      <svg
        viewBox="0 0 24 24"
        className={glyph}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {ICONS[slug] ?? FALLBACK}
      </svg>
    </span>
  );
}
