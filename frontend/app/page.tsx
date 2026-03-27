"use client";

import Link from "next/link";
import { useI18n } from "./i18n";

export default function Home() {
  const { t } = useI18n();
  const advantages = [
    { icon: "01", title: t("landing.adv1Title"), text: t("landing.adv1Text") },
    { icon: "02", title: t("landing.adv2Title"), text: t("landing.adv2Text") },
    { icon: "03", title: t("landing.adv3Title"), text: t("landing.adv3Text") },
    { icon: "04", title: t("landing.adv4Title"), text: t("landing.adv4Text") },
  ];

  return (
    <>
      <section className="container-shell py-16 md:py-24">
        <div className="grid items-center gap-10 lg:grid-cols-[1.15fr_0.85fr]">
          <div>
            <p className="badge">{t("landing.badge")}</p>
            <h1 className="mt-5 text-4xl font-semibold leading-tight tracking-tight text-[var(--text)] md:text-6xl">
              {t("landing.title")}
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-[var(--muted)] md:text-lg">
              {t("landing.subtitle")}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/analyze"
                className="rounded-xl bg-[var(--primary)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--primary-700)]"
              >
                {t("landing.ctaStart")}
              </Link>
              <a
                href="#how"
                className="rounded-xl border border-[var(--border)] bg-white px-5 py-3 text-sm font-semibold text-[var(--text)] transition hover:bg-[var(--surface-soft)]"
              >
                {t("landing.ctaHow")}
              </a>
            </div>
          </div>
          <aside className="card-soft p-6 md:p-8">
            <h2 className="text-lg font-semibold">{t("landing.whatYouGet")}</h2>
            <ul className="mt-4 space-y-3 text-sm text-[var(--muted)]">
              <li>- {t("landing.out1")}</li>
              <li>- {t("landing.out2")}</li>
              <li>- {t("landing.out3")}</li>
            </ul>
          </aside>
        </div>
      </section>

      <section id="advantages" className="container-shell py-8 md:py-12">
        <h2 className="section-title">{t("landing.advantagesTitle")}</h2>
        <p className="section-subtitle">{t("landing.advantagesSubtitle")}</p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {advantages.map((item) => (
            <article key={item.title} className="card-soft p-5">
              <div className="text-2xl font-semibold text-[var(--primary)]" aria-hidden>
                {item.icon}
              </div>
              <h3 className="mt-3 text-base font-semibold">{item.title}</h3>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{item.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="how" className="container-shell py-12 md:py-16">
        <h2 className="section-title">{t("landing.howTitle")}</h2>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {[
            ["1", t("landing.step1Title"), t("landing.step1Text")],
            ["2", t("landing.step2Title"), t("landing.step2Text")],
            ["3", t("landing.step3Title"), t("landing.step3Text")],
          ].map(([step, title, text]) => (
            <article key={step} className="card-soft p-5">
              <p className="text-sm font-semibold text-[var(--primary)]">Step {step}</p>
              <h3 className="mt-2 text-base font-semibold">{title}</h3>
              <p className="mt-2 text-sm text-[var(--muted)]">{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="container-shell py-10 md:py-16">
        <div className="card-soft px-6 py-8 md:px-10 md:py-10">
          <h2 className="section-title">{t("landing.faqTitle")}</h2>
          <div className="mt-6 space-y-4">
            <details className="rounded-lg border border-[var(--border)] bg-white p-4">
              <summary className="cursor-pointer font-medium">{t("landing.faqQ1")}</summary>
              <p className="mt-2 text-sm text-[var(--muted)]">{t("landing.faqA1")}</p>
            </details>
            <details className="rounded-lg border border-[var(--border)] bg-white p-4">
              <summary className="cursor-pointer font-medium">{t("landing.faqQ2")}</summary>
              <p className="mt-2 text-sm text-[var(--muted)]">{t("landing.faqA2")}</p>
            </details>
          </div>
          <div className="mt-8">
            <Link
              href="/analyze"
              className="rounded-xl bg-[var(--primary)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--primary-700)]"
            >
              {t("landing.faqCta")}
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
