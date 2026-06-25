import type { Metadata } from "next";
import "./globals.css";
import { Header } from "@/components/app-shell/Header";
import { Nav } from "@/components/app-shell/Nav";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { DictionaryProvider } from "@/components/dictionary/DictionaryProvider";
import { ReadingThemeProvider } from "@/components/app-shell/ReadingThemeProvider";
import { FirebaseDebugPanel } from "@/components/app-shell/FirebaseDebugPanel";

export const metadata: Metadata = {
  title: "Chinese Adaptive Reader",
  description:
    "A quiet reading room for Mandarin. Read real Chinese, tap any word, and grow your level — without the noise.",
};

// Set the initial theme before paint so the first frame is never the wrong palette.
const themeBootstrap = `
try {
  var raw = localStorage.getItem('car.reading.prefs.v1');
  var theme = raw ? (JSON.parse(raw).theme || 'paper') : 'paper';
  document.documentElement.dataset.theme = theme;
} catch (e) { document.documentElement.dataset.theme = 'paper'; }
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="paper">
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrap }} />
      </head>
      <body
        className="min-h-screen font-sans antialiased"
        style={{ backgroundColor: "var(--paper)", color: "var(--ink)" }}
      >
        <ReadingThemeProvider>
          <AuthProvider>
            <DictionaryProvider>
              <Header />
              <Nav />
              <main className="mx-auto max-w-5xl px-4 pb-24 pt-6 sm:pb-10">{children}</main>
              <footer
                className="mx-auto max-w-5xl px-4 pb-20 pt-4 text-center text-[11px] sm:pb-4"
                style={{ color: "color-mix(in srgb, var(--muted) 65%, transparent)" }}
              >
                Dictionary:{" "}
                <a href="https://cc-cedict.org/wiki/" target="_blank" rel="noopener noreferrer" className="underline">CC-CEDICT</a>{" "}
                (CC-BY-SA 4.0) ·{" "}
                <a href="https://github.com/drkameleon/complete-hsk-vocabulary" target="_blank" rel="noopener noreferrer" className="underline">HSK 3.0 vocabulary</a>
              </footer>
              {process.env.NODE_ENV === "development" && <FirebaseDebugPanel />}
            </DictionaryProvider>
          </AuthProvider>
        </ReadingThemeProvider>
      </body>
    </html>
  );
}
