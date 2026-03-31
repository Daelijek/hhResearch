"use client";

import Link from "next/link";
import { FaqDisclosure } from "@/components/landing/faq-disclosure";
import { LandingExcelPreview } from "@/components/landing/excel-preview";
import { LandingGlassCard } from "@/components/landing/glass-card";
import { useI18n } from "@/lib/i18n";

const FAQ_KEYS = [
  ["landing.faqQ1", "landing.faqA1"],
  ["landing.faqQ2", "landing.faqA2"],
  ["landing.faqQ3", "landing.faqA3"],
  ["landing.faqQ4", "landing.faqA4"],
  ["landing.faqQ5", "landing.faqA5"],
  ["landing.faqQ6", "landing.faqA6"],
] as const;

const REPORT_HOW_CARDS = [
  ["01", "landing.reportHowCard1Title", "landing.reportHow1"],
  ["02", "landing.reportHowCard2Title", "landing.reportHow2"],
  ["03", "landing.reportHowCard3Title", "landing.reportHow3"],
  ["04", "landing.reportHowCard4Title", "landing.reportHow4"],
] as const;

export default function Home() {
  const { t } = useI18n();
  const advantages = [
    { num: "01", title: t("landing.adv1Title"), text: t("landing.adv1Text") },
    { num: "02", title: t("landing.adv2Title"), text: t("landing.adv2Text") },
    { num: "03", title: t("landing.adv3Title"), text: t("landing.adv3Text") },
    { num: "04", title: t("landing.adv4Title"), text: t("landing.adv4Text") },
  ];

  return (
    <>
      <section className="hero-glow py-12 sm:py-16 md:py-24">
        <div className="container-shell">
          <div className="grid items-center gap-10 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="anim-fade-up">
              <p className="badge">{t("landing.badge")}</p>
              <h1 className="mt-5 text-4xl font-semibold leading-tight tracking-tight text-[var(--text)] sm:text-5xl md:text-6xl lg:text-[3.35rem] lg:leading-[1.08]">
                {t("landing.title")}
              </h1>
              <p className="mt-5 max-w-xl text-base leading-7 text-[var(--muted)] md:text-lg lg:max-w-2xl lg:text-xl lg:leading-8">
                {t("landing.subtitle")}
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/analyze"
                  className="btn-primary px-5 py-3 text-sm font-semibold lg:px-6 lg:py-3.5 lg:text-base"
                >
                  {t("landing.ctaStart")}
                </Link>
                <a
                  href="#how"
                  className="btn-soft px-5 py-3 text-sm font-semibold text-[var(--text)] lg:px-6 lg:py-3.5 lg:text-base"
                >
                  {t("landing.ctaHow")}
                </a>
              </div>
            </div>
            <LandingExcelPreview t={t} />
          </div>
        </div>
      </section>

      <section id="report-how" className="container-shell py-12 md:py-16">
        <h2 className="section-title">{t("landing.reportHowTitle")}</h2>
        <p className="section-subtitle">{t("landing.reportHowSubtitle")}</p>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {REPORT_HOW_CARDS.map(([num, titleKey, textKey]) => (
            <LandingGlassCard
              key={num}
              shine
              leading={
                <div
                  className="text-2xl font-semibold text-[var(--primary)] tabular-nums lg:text-3xl"
                  aria-hidden
                >
                  {num}
                </div>
              }
              title={t(titleKey)}
              description={t(textKey)}
            />
          ))}
        </div>
      </section>

      <section id="advantages" className="container-shell py-8 md:py-12">
        <h2 className="section-title">{t("landing.advantagesTitle")}</h2>
        <p className="section-subtitle">{t("landing.advantagesSubtitle")}</p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {advantages.map((item) => (
            <LandingGlassCard
              key={item.title}
              leading={
                <div className="text-2xl font-semibold text-[var(--primary)] lg:text-3xl" aria-hidden>
                  {item.num}
                </div>
              }
              title={item.title}
              description={item.text}
            />
          ))}
        </div>
      </section>

      <section id="how" className="container-shell py-12 md:py-16">
        <h2 className="section-title">{t("landing.howTitle")}</h2>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {(
            [
              ["1", t("landing.step1Title"), t("landing.step1Text")],
              ["2", t("landing.step2Title"), t("landing.step2Text")],
              ["3", t("landing.step3Title"), t("landing.step3Text")],
            ] as const
          ).map(([step, title, text]) => (
            <LandingGlassCard
              key={step}
              leading={
                <p className="text-sm font-semibold text-[var(--primary)] lg:text-base">
                  {t("landing.stepBadge", { n: step })}
                </p>
              }
              title={title}
              description={text}
            />
          ))}
        </div>
      </section>

      <section className="container-shell py-10 md:py-16">
        <div className="card-soft faq-no-lift px-4 py-6 sm:px-6 sm:py-8 md:px-10 md:py-10">
          <h2 className="section-title">{t("landing.faqTitle")}</h2>
          <div className="mt-6 space-y-4">
            {FAQ_KEYS.map(([qKey, aKey]) => (
              <FaqDisclosure key={qKey} question={t(qKey)} answer={t(aKey)} />
            ))}
          </div>
          <div className="mt-8">
            <Link
              href="/analyze"
              className="btn-primary px-5 py-3 text-sm font-semibold lg:px-6 lg:py-3.5 lg:text-base"
            >
              {t("landing.faqCta")}
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
