"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { I18nProvider, useI18n, type Lang } from "@/lib/i18n";
import { ThemeProvider, useTheme } from "@/lib/theme";

function LanguageSwitch({ variant = "toolbar" }: { variant?: "toolbar" | "drawer" }) {
  const { lang, setLang, t } = useI18n();

  const options: Lang[] = ["en", "ru", "kk"];
  if (variant === "drawer") {
    return (
      <div className="surface-glass-sm flex h-10 w-full gap-1 p-1 text-sm shadow-glassSoft">
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => setLang(opt)}
            className={`h-full flex-1 rounded-xl px-2 py-0 font-semibold leading-none transition ${lang === opt
              ? "bg-[var(--primary)] text-white shadow-sm"
              : "text-[var(--muted)] hover:bg-[color:var(--glass-bg)]"
              }`}
            aria-label={`Switch to ${opt}`}
          >
            {t(`lang.${opt}`)}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="surface-glass-sm flex h-11 shrink-0 items-center gap-1 px-1 text-xs shadow-glassSoft sm:text-sm">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => setLang(opt)}
          className={`flex-1 rounded-xl px-2 py-2.5 font-semibold leading-none transition ${lang === opt
            ? "bg-[var(--primary)] text-white shadow-sm"
            : "text-[var(--muted)] hover:bg-[color:var(--glass-bg)]"
            }`}
          aria-label={`Switch to ${opt}`}
        >
          {t(`lang.${opt}`)}
        </button>
      ))}
    </div>
  );
}

function ThemeSwitch({ variant = "toolbar" }: { variant?: "toolbar" | "drawer" }) {
  const { theme, toggle } = useTheme();
  const { t } = useI18n();
  const label = theme === "dark" ? t("nav.themeDark") : t("nav.themeLight");
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggle}
      className={`hh-theme-switch ${variant === "drawer" ? "hh-theme-switch--drawer" : "hh-theme-switch--toolbar"
        } ${isDark ? "is-dark" : "is-light"}`}
      aria-label={label}
      title={label}
    >
      <span className="hh-theme-switch__icon hh-theme-switch__icon--sun" aria-hidden>
        ☀️
      </span>
      <span className="hh-theme-switch__icon hh-theme-switch__icon--moon" aria-hidden>
        🌙
      </span>
      <span className="hh-theme-switch__knob" aria-hidden />
    </button>
  );
}

function ShellContent({ children }: { children: React.ReactNode }) {
  const { t } = useI18n();
  const pathname = usePathname();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileNavOpen) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileNavOpen]);

  useEffect(() => {
    if (!mobileNavOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileNavOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileNavOpen]);

  function closeMobileNav() {
    setMobileNavOpen(false);
  }

  const path = pathname ?? "";
  const isHomeActive = path === "/" || path === "";
  const isAnalyzeActive = path === "/analyze" || path.startsWith("/analyze/");
  const isSummaryActive = path === "/summary" || path.startsWith("/summary/");

  const desktopNavInactive =
    "inline-flex items-center rounded-lg px-2.5 py-2 font-semibold leading-none text-[var(--muted)] transition hover:bg-[color:var(--glass-bg-strong)] hover:text-[var(--text)] sm:px-3 sm:py-2.5 md:h-11 md:py-0";
  const desktopNavActive =
    "btn-primary inline-flex shrink-0 items-center justify-center px-3 py-2 text-xs font-semibold leading-none sm:px-3.5 sm:py-2.5 sm:text-sm lg:text-base md:h-11 md:py-0";

  const mobileNavLink =
    "surface-glass-sm flex min-h-10 items-center rounded-xl px-3 py-2 text-left text-[15px] font-semibold text-[var(--text)] transition hover:bg-[color:var(--glass-bg)]";

  return (
    <>
      <header className="bar-glass sticky top-0 z-50 border-b">
        <div className="container-shell relative z-[80] flex h-16 min-h-16 flex-nowrap items-center gap-2 py-1 sm:h-20 sm:min-h-20 sm:gap-3 sm:py-0 md:h-[5.25rem] md:min-h-[5.25rem] md:overflow-x-auto md:overflow-y-hidden md:[-ms-overflow-style:none] md:[scrollbar-width:none] md:[&::-webkit-scrollbar]:hidden">
          <Link
            href="/"
            className="inline-flex h-11 shrink-0 items-center truncate text-base font-semibold leading-none tracking-tight text-[var(--text)] transition hover:text-[var(--primary)] sm:text-lg md:text-xl lg:text-2xl md:h-11"
          >
            hhResearch
          </Link>

          {/* Desktop navigation */}
          <nav
            aria-label="Primary navigation"
            className="hidden min-h-0 min-w-0 flex-1 items-center justify-center gap-1 whitespace-nowrap text-xs text-[var(--muted)] sm:gap-2 sm:text-sm md:flex md:text-base lg:text-[1.0625rem]"
          >
            <Link
              href="/"
              className={isHomeActive ? desktopNavActive : desktopNavInactive}
              aria-current={isHomeActive ? "page" : undefined}
            >
              {t("nav.home")}
            </Link>
            <Link
              href="/analyze"
              className={isAnalyzeActive ? desktopNavActive : desktopNavInactive}
              aria-current={isAnalyzeActive ? "page" : undefined}
            >
              {t("nav.analyze")}
            </Link>
            <Link
              href="/summary"
              className={isSummaryActive ? desktopNavActive : desktopNavInactive}
              aria-current={isSummaryActive ? "page" : undefined}
            >
              {t("nav.summary")}
            </Link>
          </nav>

          <div className="ml-auto flex h-11 shrink-0 items-center justify-center gap-1 sm:gap-2 md:ml-0 md:h-11">
            {/* Desktop theme & language */}
            <div className="hidden items-center gap-1 sm:gap-2 md:flex md:h-11">
              <ThemeSwitch />
              <LanguageSwitch />
            </div>

            {/* Mobile burger button */}
            <button
              type="button"
              className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg-strong)] text-[var(--text)] shadow-glassSoft transition hover:border-[var(--glass-border-strong)] hover:bg-[var(--glass-bg)] md:hidden"
              aria-label={mobileNavOpen ? "Close navigation menu" : "Open navigation menu"}
              aria-expanded={mobileNavOpen}
              aria-controls="hh-mobile-nav"
              onClick={() => setMobileNavOpen((open) => !open)}
            >
              <span className="relative block h-4 w-5">
                <span
                  className={`absolute left-0 h-[2px] w-full rounded-full bg-[var(--text)] transition-transform duration-200 ${mobileNavOpen ? "top-1/2 -translate-y-1/2 rotate-45" : "top-0"
                    }`}
                />
                <span
                  className={`absolute left-0 h-[2px] w-full rounded-full bg-[var(--text)] transition-opacity duration-150 ${mobileNavOpen ? "top-1/2 -translate-y-1/2 opacity-0" : "top-1/2 -translate-y-1/2 opacity-100"
                    }`}
                />
                <span
                  className={`absolute left-0 h-[2px] w-full rounded-full bg-[var(--text)] transition-transform duration-200 ${mobileNavOpen ? "bottom-1/2 translate-y-1/2 -rotate-45" : "bottom-0"
                    }`}
                />
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile navigation drawer */}
      {mobileNavOpen && (
        <div
          className="fixed inset-0 z-40 flex md:hidden"
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/30"
            aria-label="Close navigation menu"
            onClick={closeMobileNav}
          />
          <div
            id="hh-mobile-nav"
            className="hh-mobile-nav-panel relative ml-auto flex h-full w-full max-w-xs flex-col border-l border-[var(--glass-border)] bg-[color:var(--glass-bg)] px-4 pb-6 pt-4 shadow-2xl"
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="text-base font-semibold text-[var(--text)]">
                hhResearch
              </span>
              <button
                type="button"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg-strong)] text-[var(--text)] shadow-glassSoft transition hover:border-[var(--glass-border-strong)] hover:bg-[var(--glass-bg)]"
                aria-label="Close navigation menu"
                onClick={closeMobileNav}
              >
                <span className="sr-only">Close</span>
                <span className="block text-lg leading-none">×</span>
              </button>
            </div>

            <nav aria-label="Mobile primary navigation" className="mt-4 flex flex-col gap-2">
              <Link
                href="/"
                className={mobileNavLink}
                aria-current={isHomeActive ? "page" : undefined}
              >
                {t("nav.home")}
              </Link>
              <Link
                href="/analyze"
                className={mobileNavLink}
                aria-current={isAnalyzeActive ? "page" : undefined}
              >
                {t("nav.analyze")}
              </Link>
              <Link
                href="/summary"
                className={mobileNavLink}
                aria-current={isSummaryActive ? "page" : undefined}
              >
                {t("nav.summary")}
              </Link>
            </nav>
            <div className="flex flex-col gap-2 mt-4 border-t border-[var(--glass-border)] pt-4">
              <ThemeSwitch variant="drawer" />
              <LanguageSwitch variant="drawer" />
            </div>
          </div>
        </div>
      )}

      <main>{children}</main>

      <footer className="bar-glass relative mt-20 border-t py-10">
        <div className="container-shell grid gap-8 md:grid-cols-3">
          <section>
            <h2 className="text-base font-semibold lg:text-lg">hhResearch</h2>
            <p className="mt-2 text-sm text-[var(--muted)] lg:text-base">{t("footer.about")}</p>
          </section>
          <nav aria-label="Footer links">
            <h2 className="text-base font-semibold lg:text-lg">{t("footer.navigation")}</h2>
            <ul className="mt-2 space-y-2 text-sm text-[var(--muted)] lg:text-base">
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
              <li>
                <Link href="/summary" className="hover:text-[var(--text)]">
                  {t("nav.summary")}
                </Link>
              </li>
            </ul>
          </nav>
          <section>
            <h2 className="text-base font-semibold lg:text-lg">{t("footer.contacts")}</h2>
            <ul className="mt-2 space-y-2 text-sm text-[var(--muted)] lg:text-base">
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
