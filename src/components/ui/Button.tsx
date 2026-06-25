import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost";

const base =
  "inline-flex items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200 ease-soft disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-seal/40 focus-visible:ring-offset-2 active:translate-y-px";

const variantClass: Record<Variant, string> = {
  primary: "shadow-seal text-white hover:-translate-y-px hover:shadow-paper-md",
  secondary: "shadow-paper hover:-translate-y-px",
  ghost: "",
};

const variantStyle: Record<Variant, CSSProperties> = {
  primary: {
    background: "linear-gradient(180deg, var(--seal), var(--seal-deep))",
  },
  secondary: {
    background: "var(--surface)",
    border: "1px solid var(--line)",
    color: "var(--ink)",
  },
  ghost: {
    color: "var(--muted)",
  },
};

interface CommonProps {
  variant?: Variant;
  className?: string;
  children: ReactNode;
}

interface ButtonAsButton extends CommonProps {
  href?: undefined;
  onClick?: () => void;
  type?: "button" | "submit";
  disabled?: boolean;
}

interface ButtonAsLink extends CommonProps {
  href: string;
}

export function Button(props: ButtonAsButton | ButtonAsLink) {
  const { variant = "primary", className = "", children } = props;
  const cls = `${base} ${variantClass[variant]} ${className}`;
  if ("href" in props && props.href) {
    return (
      <Link href={props.href} className={cls} style={variantStyle[variant]}>
        {children}
      </Link>
    );
  }
  const { onClick, type = "button", disabled } = props as ButtonAsButton;
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cls}
      style={variantStyle[variant]}
    >
      {children}
    </button>
  );
}
