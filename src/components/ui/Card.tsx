import type { ReactNode } from "react";

export function Card({
  children,
  className = "",
  interactive = false,
}: {
  children: ReactNode;
  className?: string;
  interactive?: boolean;
}) {
  const interactiveCls = interactive
    ? "transition-all duration-200 ease-soft hover:-translate-y-0.5 hover:shadow-paper-md"
    : "";
  return (
    <div
      className={`rounded-xl shadow-paper ${interactiveCls} ${className}`}
      style={{
        border: "1px solid var(--line)",
        background: "var(--surface)",
      }}
    >
      {children}
    </div>
  );
}
