"use client";

import Link from "next/link";
import { I18nProvider, useI18n, type Lang } from "@/lib/i18n";
import { ThemeProvider, useTheme } from "@/lib/theme";

function LanguageSwitch() {
  const { lang, setLang, t } = useI18n();

  const options: Lang[] = ["en", "ru", "kk"];
  return (
    <div className="surface-glass-sm flex shrink-0 items-center gap-0.5 p-1 text-[10px] shadow-glassSoft sm:gap-1 sm:text-xs">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => setLang(opt)}
          className={`inline-flex items-center justify-center rounded-md px-2 py-1 leading-none transition sm:px-2.5 sm:py-1.5 ${lang === opt ? "bg-[var(--primary)] text-white shadow-sm" : "text-[var(--muted)] hover:bg-[color:var(--glass-bg)]"
            }`}
          aria-label={`Switch to ${opt}`}
        >
          {t(`lang.${opt}`)}
        </button>
      ))}
    </div>
  );
}

function ThemeSwitch() {
  const { theme, toggle } = useTheme();
  return (
    <button
      type="button"
      onClick={toggle}
      className="btn-soft inline-flex shrink-0 items-center justify-center gap-1.5 px-2.5 py-2 text-xs font-semibold leading-none text-[var(--text)] sm:gap-2 sm:px-3 sm:py-2.5"
      aria-label="Toggle theme"
      title={theme === "dark" ? "Switch to light" : "Switch to dark"}
    >
      <span aria-hidden className="text-base leading-none sm:text-sm">
        {theme === "dark" ? "🌙" : "☀️"}
      </span>
      <span className="hidden sm:inline">{theme === "dark" ? "Dark" : "Light"}</span>
    </button>
  );
}

function ShellContent({ children }: { children: React.ReactNode }) {
  const { t } = useI18n();

  return (
    <>
      <header className="bar-glass sticky top-0 z-40 border-b">
        <div className="container-shell flex h-16 min-h-16 flex-nowrap items-center gap-2 overflow-x-auto overflow-y-hidden py-1 [-ms-overflow-style:none] [scrollbar-width:none] sm:h-20 sm:min-h-20 sm:gap-3 sm:py-0 md:h-[5.25rem] md:min-h-[5.25rem] [&::-webkit-scrollbar]:hidden">
          <Link
            href="/"
            className="inline-flex shrink-0 items-center truncate text-base font-semibold leading-none tracking-tight text-[var(--text)] transition hover:text-[var(--primary)] sm:text-lg md:text-xl"
          >
            hhResearch
          </Link>
          <nav
            aria-label="Primary navigation"
            className="flex min-h-0 min-w-0 flex-1 items-center justify-center gap-1 whitespace-nowrap text-xs text-[var(--muted)] sm:gap-2 sm:text-sm md:text-base"
          >
            <Link
              href="/"
              className="inline-flex items-center rounded-lg px-2.5 py-2 leading-none transition hover:bg-[color:var(--glass-bg-strong)] hover:text-[var(--text)] sm:px-3 sm:py-2.5"
            >
              {t("nav.home")}
            </Link>
            <Link
              href="/analyze"
              className="btn-primary inline-flex shrink-0 items-center justify-center px-3 py-2 text-xs font-semibold leading-none sm:px-3.5 sm:py-2.5 sm:text-sm"
            >
              {t("nav.analyze")}
            </Link>
          </nav>
          <div className="flex shrink-0 items-center justify-center gap-1 sm:gap-2">
            <ThemeSwitch />
            <LanguageSwitch />
          </div>
        </div>
      </header>

      <main>{children}</main>

      <footer className="bar-glass relative mt-20 border-t py-10">
        <div className="container-shell grid gap-8 md:grid-cols-3">
          <section>
            <h2 className="text-base font-semibold">hhResearch</h2>
            <p className="mt-2 text-sm text-[var(--muted)]">{t("footer.about")}</p>
          </section>
          <nav aria-label="Footer links">
            <h2 className="text-base font-semibold">{t("footer.navigation")}</h2>
            <ul className="mt-2 space-y-2 text-sm text-[var(--muted)]">
              <li>
                <Link href="/" className="hover:text-[var(--text)]">
                  {t("nav.home")}
                </Link>
              </li>
              <li>
                <Link href="/analyze" className="hover:text-[var(--text)]">
                  {t("nav.analyze")}
                </Link>
              </li>
            </ul>
          </nav>
          <section>
            <h2 className="text-base font-semibold">{t("footer.contacts")}</h2>
            <ul className="mt-2 space-y-2 text-sm text-[var(--muted)]">
              <li>
                Email:{" "}
                <a href="mailto:dias1605ermek@gmail.com" className="hover:text-[var(--text)]">
                  dias1605ermek@gmail.com
                </a>
              </li>
              <li>
                Telegram:{" "}
                <a href="https://t.me/daelijek_og" className="hover:text-[var(--text)]">
                  @daelijek_og
                </a>
              </li>
              <li>
                GitHub:{" "}
                <a href="https://github.com/Daelijek" className="hover:text-[var(--text)]">
                  Daelijek
                </a>
              </li>
            </ul>
          </section>
        </div>
      </footer>
    </>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <I18nProvider>
        <ShellContent>{children}</ShellContent>
      </I18nProvider>
    </ThemeProvider>
  );
}
