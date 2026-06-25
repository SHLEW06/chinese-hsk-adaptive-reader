"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  BookOpen,
  Library,
  Bookmark,
  GraduationCap,
  ListOrdered,
  Search,
} from "lucide-react";

const items = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/reader", label: "Reader", icon: BookOpen },
  { href: "/library", label: "Library", icon: Library },
  { href: "/vocabulary", label: "Vocabulary", icon: ListOrdered },
  { href: "/dictionary", label: "Dictionary", icon: Search },
  { href: "/saved-words", label: "Saved", icon: Bookmark },
  { href: "/placement", label: "Placement", icon: GraduationCap },
];

export function Nav() {
  const pathname = usePathname();
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 backdrop-blur-md sm:static sm:border-0 sm:bg-transparent sm:backdrop-blur-none"
      style={{
        background: "color-mix(in srgb, var(--paper-2) 95%, transparent)",
        borderTop: "1px solid var(--line)",
      }}
    >
      <div className="mx-auto grid max-w-5xl grid-cols-7 sm:flex sm:gap-1 sm:px-4 sm:py-2.5">
        {items.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className="group relative flex flex-col items-center gap-0.5 py-2 text-[10.5px] transition-colors sm:flex-row sm:gap-1.5 sm:rounded-full sm:px-3.5 sm:py-1.5 sm:text-sm"
              style={
                active
                  ? {
                      color: "var(--seal)",
                      fontWeight: 500,
                      background: "color-mix(in srgb, var(--seal) 10%, transparent)",
                    }
                  : { color: "var(--muted)" }
              }
            >
              <Icon
                size={20}
                className={`sm:h-4 sm:w-4 transition-transform ${
                  active ? "" : "group-hover:scale-110"
                }`}
              />
              <span>{label}</span>
              {active && (
                <span
                  className="absolute -top-px left-1/2 h-0.5 w-8 -translate-x-1/2 rounded-b-full sm:hidden"
                  style={{ background: "var(--seal)" }}
                  aria-hidden="true"
                />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
