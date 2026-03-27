"use client";

import Link from "next/link";
import { I18nProvider, useI18n, type Lang } from "./i18n";
import { ThemeProvider, useTheme } from "./theme";

function LanguageSwitch() {
  const { lang, setLang, t } = useI18n();

  const options: Lang[] = ["en", "ru", "kk"];
  return (
    <div className="surface-glass-sm flex items-center gap-1 p-1 text-xs shadow-glassSoft">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => setLang(opt)}
          className={`rounded-md px-2 py-1 transition ${lang === opt ? "bg-[var(--primary)] text-white shadow-sm" : "text-[var(--muted)] hover:bg-[color:var(--glass-bg)]"
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
      className="btn-soft inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold text-[var(--text)]"
      aria-label="Toggle theme"
      title={theme === "dark" ? "Switch to light" : "Switch to dark"}
    >
      <span aria-hidden>{theme === "dark" ? "🌙" : "☀️"}</span>
      <span className="hidden sm:inline">{theme === "dark" ? "Dark" : "Light"}</span>
    </button>
  );
}

function ShellContent({ children }: { children: React.ReactNode }) {
  const { t } = useI18n();

  return (
    <>
      <header className="bar-glass sticky top-0 z-40 border-b">
        <div className="container-shell flex h-20 items-center justify-between gap-3">
          <Link href="/" className="text-xl font-semibold tracking-tight text-[var(--text)] transition hover:text-[var(--primary)]">
            hhResearch
          </Link>
          <nav aria-label="Primary navigation" className="flex items-center gap-2 text-base text-[var(--muted)]">
            <Link href="/" className="rounded-lg px-3 py-2.5 transition hover:bg-[color:var(--glass-bg-strong)] hover:text-[var(--text)]">
              {t("nav.home")}
            </Link>
            <Link
              href="/analyze"
              className="btn-primary px-3 py-2.5 text-sm font-semibold"
            >
              {t("nav.analyze")}
            </Link>
          </nav>
          <div className="flex items-center gap-2">
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

