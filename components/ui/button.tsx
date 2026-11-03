import Link from "next/link";
import type { ButtonHTMLAttributes, ComponentProps } from "react";

export type ButtonVariant = "primary" | "secondary" | "gold";

const BASE =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-control border px-4 py-2 text-[15px] font-semibold no-underline transition-colors duration-150";

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "border-accent bg-accent text-accent-ink hover:opacity-90",
  secondary: "border-line bg-surface text-ink hover:border-accent",
  gold: "border-gold bg-gold text-gold-ink hover:opacity-90",
};

export function buttonClasses(variant: ButtonVariant = "primary") {
  return `${BASE} ${VARIANTS[variant]}`;
}

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  return <button className={`${buttonClasses(variant)} ${className}`} {...props} />;
}

export function ButtonLink({
  variant = "primary",
  className = "",
  ...props
}: ComponentProps<typeof Link> & { variant?: ButtonVariant }) {
  return <Link className={`${buttonClasses(variant)} ${className}`} {...props} />;
}
