"use client";

import { ExportForm } from "../export-form";
import { useI18n } from "../i18n";

export default function AnalyzePage() {
  const { t } = useI18n();

  return (
    <section className="container-shell py-10 md:py-14">
      <header className="mb-8">
        <p className="badge">{t("analyze.badge")}</p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight md:text-4xl">{t("analyze.title")}</h1>
        <p className="mt-3 max-w-2xl text-[var(--muted)]">
          {t("analyze.subtitle")}
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <article className="card-soft p-5 md:p-7">
          <ExportForm />
        </article>
        <aside className="space-y-4">
          <section className="card-soft p-5">
            <h2 className="text-base font-semibold">{t("analyze.limitsTitle")}</h2>
            <ul className="mt-3 space-y-2 text-sm text-[var(--muted)]">
              <li>- {t("analyze.limit1")}</li>
              <li>- {t("analyze.limit2")}</li>
              <li>- {t("analyze.limit3")}</li>
            </ul>
          </section>
          <section className="card-soft p-5">
            <h2 className="text-base font-semibold">{t("analyze.exampleTitle")}</h2>
            <pre className="mt-3 overflow-x-auto rounded-lg bg-[var(--surface-soft)] p-3 text-xs leading-6 text-[#1f3b73]">
131474430
https://hh.ru/vacancy/131234053
            </pre>
          </section>
        </aside>
      </div>
    </section>
  );
}
