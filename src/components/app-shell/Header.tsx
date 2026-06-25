import Link from "next/link";
import { AuthButton } from "@/components/app-shell/AuthButton";
import { ThemeToggle } from "@/components/app-shell/ThemeToggle";

export function Header() {
  return (
    <header
      className="sticky top-0 z-30 backdrop-blur-md"
      style={{
        background: "color-mix(in srgb, var(--paper-2) 88%, transparent)",
        borderBottom: "1px solid var(--line)",
      }}
    >
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link
          href="/dashboard"
          className="group flex items-center gap-2.5 transition-opacity hover:opacity-90"
        >
          <span
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-seal to-seal-deep font-cjk-serif text-base font-bold text-white shadow-chop transition-transform group-hover:rotate-[-3deg]"
            aria-hidden="true"
          >
            读
          </span>
          <span className="leading-tight">
            <span
              className="block font-serif text-[15px] font-semibold tracking-tight"
              style={{ color: "var(--ink)" }}
            >
              Chinese Adaptive Reader
            </span>
            <span
              className="block text-[11px] italic"
              style={{ color: "var(--muted)" }}
            >
              a quiet room for real Chinese
            </span>
          </span>
        </Link>
        <div className="flex items-center gap-1.5">
          <ThemeToggle />
          <AuthButton />
        </div>
      </div>
    </header>
  );
}
