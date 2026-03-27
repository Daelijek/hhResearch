"use client";

import Link from "next/link";
import { I18nProvider, useI18n, type Lang } from "./i18n";

function LanguageSwitch() {
  const { lang, setLang, t } = useI18n();

  const options: Lang[] = ["en", "ru", "kk"];
  return (
    <div className="flex items-center gap-1 rounded-md border border-[var(--border)] bg-white p-1 text-xs">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => setLang(opt)}
          className={`rounded px-2 py-1 transition ${lang === opt ? "bg-[var(--primary)] text-white" : "text-[var(--muted)] hover:bg-[var(--surface-soft)]"
            }`}
          aria-label={`Switch to ${opt}`}
        >
          {t(`lang.${opt}`)}
        </button>
      ))}
    </div>
  );
}

function ShellContent({ children }: { children: React.ReactNode }) {
  const { t } = useI18n();

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-white/85 backdrop-blur">
        <div className="container-shell flex h-20 items-center justify-between gap-3">
          <Link href="/" className="text-xl font-semibold tracking-tight text-[var(--text)]">
            hhResearch
          </Link>
          <nav aria-label="Primary navigation" className="flex items-center gap-2 text-base text-[var(--muted)]">
            <Link href="/" className="rounded-md px-3 py-2.5 transition hover:bg-[var(--surface-soft)] hover:text-[var(--text)]">
              {t("nav.home")}
            </Link>
            <Link
              href="/analyze"
              className="rounded-md bg-[var(--primary)] px-3 py-2.5 font-medium text-white transition hover:bg-[var(--primary-700)]"
            >
              {t("nav.analyze")}
            </Link>
          </nav>
          <LanguageSwitch />
        </div>
      </header>

      <main>{children}</main>

      <footer className="mt-20 border-t border-[var(--border)] bg-white/80 py-10">
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
                <a href="mailto:you@example.com" className="hover:text-[var(--text)]">
                  you@example.com
                </a>
              </li>
              <li>
                Telegram:{" "}
                <a href="https://t.me/your_username" className="hover:text-[var(--text)]">
                  @your_username
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
    <I18nProvider>
      <ShellContent>{children}</ShellContent>
    </I18nProvider>
  );
}

