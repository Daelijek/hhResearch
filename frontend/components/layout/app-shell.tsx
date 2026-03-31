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
      <div className="surface-glass-sm flex w-full gap-1 p-1 text-sm shadow-glassSoft">
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => setLang(opt)}
            className={`min-h-10 flex-1 rounded-lg px-2 py-2 font-semibold leading-none transition ${lang === opt
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
    <div className="surface-glass-sm flex h-11 shrink-0 items-stretch text-[10px] shadow-glassSoft sm:text-xs md:h-11">
      {options.map((opt, idx) => {
        const isFirst = idx === 0;
        const isLast = idx === options.length - 1;
        return (
          <button
            key={opt}
            type="button"
            onClick={() => setLang(opt)}
            className={`inline-flex h-full flex-1 items-center justify-center rounded-none px-2 py-0 leading-none transition sm:px-2.5 md:px-2.5 ${lang === opt
                ? "bg-[var(--primary)] text-white"
                : "text-[var(--muted)] hover:bg-[color:var(--glass-bg)]"
              } ${isFirst ? "rounded-l-[0.95rem]" : ""} ${isLast ? "rounded-r-[0.95rem]" : ""
              }`}
            aria-label={`Switch to ${opt}`}
          >
            {t(`lang.${opt}`)}
          </button>
        );
      })}
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

function MobileMenuButton({
  open,
  onToggle,
}: {
  open: boolean;
  onToggle: () => void;
}) {
  const { t } = useI18n();
  return (
    <button
      type="button"
      className="btn-soft relative z-[80] inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-[var(--text)] md:hidden"
      aria-expanded={open}
      aria-controls="mobile-nav-panel"
      aria-label={open ? t("nav.closeMenu") : t("nav.openMenu")}
      onClick={onToggle}
    >
      <span className="flex h-3.5 w-5 flex-col justify-between" aria-hidden>
        <span
          className={`block h-0.5 w-full rounded-full bg-current transition duration-200 ${open ? "translate-y-[7px] rotate-45" : ""
            }`}
        />
        <span
          className={`block h-0.5 w-full rounded-full bg-current transition duration-200 ${open ? "opacity-0" : ""
            }`}
        />
        <span
          className={`block h-0.5 w-full rounded-full bg-current transition duration-200 ${open ? "-translate-y-[7px] -rotate-45" : ""
            }`}
        />
      </span>
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

  const desktopNavInactive =
    "inline-flex items-center rounded-lg px-2.5 py-2 font-semibold leading-none text-[var(--muted)] transition hover:bg-[color:var(--glass-bg-strong)] hover:text-[var(--text)] sm:px-3 sm:py-2.5 md:h-11 md:py-0";
  const desktopNavActive =
    "btn-primary inline-flex shrink-0 items-center justify-center px-3 py-2 text-xs font-semibold leading-none sm:px-3.5 sm:py-2.5 sm:text-sm lg:text-base md:h-11 md:py-0";

  const mobileNavLink =
    "surface-glass-sm block rounded-xl px-3 py-2.5 text-left text-[15px] font-semibold text-[var(--text)] transition hover:bg-[color:var(--glass-bg)]";

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
          </nav>

          <div className="ml-auto flex h-11 shrink-0 items-center justify-center gap-1 sm:gap-2 md:ml-0 md:h-11">
            <div className="hidden items-center gap-1 sm:gap-2 md:flex md:h-11">
              <ThemeSwitch />
              <LanguageSwitch />
            </div>
            <MobileMenuButton open={mobileNavOpen} onToggle={() => setMobileNavOpen((v) => !v)} />
          </div>
        </div>

        {mobileNavOpen && (
          <>
            <button
              type="button"
              className="fixed inset-0 z-[60] bg-black/35 backdrop-blur-[2px] dark:bg-black/50 md:hidden"
              aria-label={t("nav.closeMenu")}
              onClick={closeMobileNav}
            />
            <nav
              id="mobile-nav-panel"
              aria-label="Primary navigation"
              className="hh-mobile-nav-panel fixed left-0 right-0 top-16 z-[70] overflow-hidden border-b border-[var(--glass-border)] bg-[color:var(--glass-bg)] px-4 pb-5 pt-4 shadow-[var(--glass-shadow)] sm:top-20 md:hidden"
            >
              <ul className="flex flex-col gap-2">
                <li>
                  <Link
                    href="/"
                    className={mobileNavLink}
                    onClick={closeMobileNav}
                  >
                    {t("nav.home")}
                  </Link>
                </li>
                <li>
                  <Link
                    href="/analyze"
                    className={mobileNavLink}
                    onClick={closeMobileNav}
                  >
                    {t("nav.analyze")}
                  </Link>
                </li>
              </ul>

              <div className="mt-4 border-t border-[var(--glass-border)] pt-4">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                  {t("nav.themeLabel")}
                </p>
                <ThemeSwitch variant="drawer" />

                <p className="mb-2 mt-4 text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                  {t("nav.languageLabel")}
                </p>
                <LanguageSwitch variant="drawer" />
              </div>
            </nav>
          </>
        )}
      </header>

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
