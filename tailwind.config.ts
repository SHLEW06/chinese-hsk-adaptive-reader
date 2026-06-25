import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  darkMode: ["class", "[data-theme='night']"],
  theme: {
    extend: {
      colors: {
        paper: "#F7F4ED",
        surface: "#FFFFFF",
        surface2: "#FDFBF6",
        ink: "#211C16",
        muted: "#6B6357",
        line: "#E6DFD1",
        seal: { DEFAULT: "#B53A2D", soft: "#F3E2DE", deep: "#8A2B22" },
        celadon: { DEFAULT: "#5E8B7E", soft: "#E2EDE9" },
        gold: { DEFAULT: "#C98A1B", soft: "#F7ECD2" },
        night: {
          paper: "#191512",
          surface: "#221C18",
          surface2: "#2A231E",
          ink: "#EFE6D5",
          muted: "#A89F8E",
          line: "#3A312A",
          sealSoft: "#4A211C",
        },
      },
      fontFamily: {
        sans: [
          "'Inter'", "system-ui", "-apple-system",
          "Segoe UI", "Roboto", "sans-serif",
        ],
        serif: [
          "'Source Serif 4'", "'Source Serif Pro'", "'Lora'",
          "'Iowan Old Style'", "Georgia", "serif",
        ],
        cjk: [
          "'Noto Sans SC'", "'PingFang SC'", "'Hiragino Sans GB'",
          "'Microsoft YaHei'", "system-ui", "sans-serif",
        ],
        "cjk-serif": [
          "'Source Han Serif SC'", "'Noto Serif SC'",
          "'Songti SC'", "'STSong'", "serif",
        ],
      },
      fontSize: {
        "reading-sm": ["1.0625rem", { lineHeight: "2.05" }],
        "reading":    ["1.25rem",   { lineHeight: "2.15" }],
        "reading-lg": ["1.5rem",    { lineHeight: "2.25" }],
        "reading-xl": ["1.75rem",   { lineHeight: "2.35" }],
        "ruby":       ["0.6875rem", { lineHeight: "1" }],
      },
      letterSpacing: {
        cjk: "0.015em",
      },
      boxShadow: {
        paper: "0 1px 2px rgba(33, 28, 22, 0.04), 0 1px 1px rgba(33, 28, 22, 0.03)",
        "paper-md": "0 2px 4px rgba(33, 28, 22, 0.05), 0 4px 12px rgba(33, 28, 22, 0.04)",
        "paper-lg": "0 4px 8px rgba(33, 28, 22, 0.06), 0 12px 32px rgba(33, 28, 22, 0.08)",
        seal: "0 2px 8px rgba(181, 58, 45, 0.18)",
        chop: "0 1px 0 rgba(0,0,0,0.06), 0 2px 6px rgba(181, 58, 45, 0.30)",
        inset: "inset 0 1px 0 rgba(255,255,255,0.7), inset 0 -1px 0 rgba(33,28,22,0.03)",
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "slide-up": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "slide-in-right": {
          "0%": { opacity: "0", transform: "translateX(24px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        "soft-pulse": {
          "0%, 100%": { opacity: "0.55" },
          "50%": { opacity: "1" },
        },
        "refine-in": {
          "0%": { opacity: "0", transform: "translateY(2px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      animation: {
        "fade-in": "fade-in 200ms ease-out",
        "slide-up": "slide-up 260ms cubic-bezier(0.16, 1, 0.3, 1)",
        "slide-in-right": "slide-in-right 280ms cubic-bezier(0.16, 1, 0.3, 1)",
        "soft-pulse": "soft-pulse 1.8s ease-in-out infinite",
        "refine-in": "refine-in 320ms cubic-bezier(0.16, 1, 0.3, 1)",
        shimmer: "shimmer 1.6s linear infinite",
      },
      transitionTimingFunction: {
        soft: "cubic-bezier(0.16, 1, 0.3, 1)",
      },
    },
  },
  plugins: [],
};

export default config;
