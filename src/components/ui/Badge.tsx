import type { ReactNode } from "react";
import { hskColor, hskLabel } from "@/lib/dictionary/hsk";

export function Badge({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${className}`}
    >
      {children}
    </span>
  );
}

export function HskBadge({ level, label }: { level?: number | "7-9"; label?: string }) {
  if (level === undefined) return null;
  const color = hskColor(level);
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-wide text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_1px_2px_rgba(0,0,0,0.08)]"
      style={{ backgroundColor: color }}
    >
      {label ?? hskLabel(level)}
    </span>
  );
}
