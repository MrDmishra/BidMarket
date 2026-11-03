import Link from "next/link";
import type { ButtonHTMLAttributes, ComponentProps } from "react";

export type ButtonVariant = "primary" | "secondary" | "danger" | "gold";
export type ButtonSize = "default" | "small";

const BASE =
  "inline-flex items-center justify-center gap-2 rounded-control border font-semibold no-underline transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-55";

const SIZES: Record<ButtonSize, string> = {
  default: "min-h-11 px-4 py-2 text-[15px]",
  small: "min-h-11 px-3 py-1 text-sm sm:min-h-9",
};

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "border-accent bg-accent text-accent-ink hover:opacity-90",
  secondary: "border-line bg-surface text-ink hover:border-accent",
  danger: "border-bad bg-transparent text-bad hover:bg-bad-bg",
  gold: "border-gold bg-gold text-gold-ink hover:opacity-90",
};

export function buttonClasses(variant: ButtonVariant = "primary", size: ButtonSize = "default") {
  return `${BASE} ${SIZES[size]} ${VARIANTS[variant]}`;
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
};

export function Button({
  variant = "primary",
  size = "default",
  loading = false,
  className = "",
  disabled,
  children,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`${buttonClasses(variant, size)} ${className}`}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? (
        <span
          className="size-3.5 animate-spin rounded-full border-2 border-current border-t-transparent"
          aria-hidden="true"
        />
      ) : null}
      {children}
    </button>
  );
}

export function ButtonLink({
  variant = "primary",
  size = "default",
  className = "",
  ...props
}: ComponentProps<typeof Link> & { variant?: ButtonVariant; size?: ButtonSize }) {
  return <Link className={`${buttonClasses(variant, size)} ${className}`} {...props} />;
}
