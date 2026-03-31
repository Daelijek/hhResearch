"use client";

import type { ExportSummary } from "@/lib/export-history";
import { useI18n } from "@/lib/i18n";
import { CoverageDonut } from "@/components/summary/coverage-donut";
import { HorizontalBarList } from "@/components/summary/horizontal-bar-list";
import { TopTable } from "@/components/summary/top-table";

export function SummaryView({ summary }: { summary: ExportSummary }) {
  const { t } = useI18n();

  const stats = [
    { label: t("summary.kpi.requested"), value: summary.requested },
    { label: t("summary.kpi.processed"), value: summary.processed },
    { label: t("summary.kpi.errors"), value: summary.errors },
    { label: t("summary.kpi.uniqueSkills"), value: summary.top_skills.length },
  ];

  return (
    <section className="grid gap-4 sm:gap-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="glass-shine surface-glass-sm p-3 sm:p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">{s.label}</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums">{s.value}</p>
          </div>
        ))}
      </div>

      {summary.coverage && (
        <CoverageDonut
          title={t("summary.qualityTitle")}
          successful={summary.coverage.successful}
          withKeySkills={summary.coverage.with_key_skills}
          withoutKeySkills={summary.coverage.without_key_skills}
          emptyDescription={summary.coverage.without_description}
          errors={summary.errors}
        />
      )}

      {summary.dedup && (
        <div className="glass-shine card-soft p-4 sm:p-5">
          <h2 className="text-base font-semibold lg:text-lg">{t("analyze.dedupTitle")}</h2>
          <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-[var(--muted)]">{t("analyze.dedupInput")}</dt>
              <dd className="font-semibold tabular-nums">{summary.dedup.input_count}</dd>
            </div>
            <div>
              <dt className="text-[var(--muted)]">{t("analyze.dedupUnique")}</dt>
              <dd className="font-semibold tabular-nums">{summary.dedup.unique_count}</dd>
            </div>
            <div>
              <dt className="text-[var(--muted)]">{t("analyze.dedupRemoved")}</dt>
              <dd className="font-semibold tabular-nums">{summary.dedup.duplicates_removed}</dd>
            </div>
          </dl>
        </div>
      )}

      {summary.error_breakdown && summary.error_breakdown.length > 0 && (
        <div className="glass-shine card-soft p-4 sm:p-5">
          <h2 className="text-base font-semibold lg:text-lg">{t("analyze.errorsByReason")}</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {summary.error_breakdown.map((row) => (
              <li
                key={row.reason}
                className="flex justify-between gap-3 border-b border-[var(--glass-border)] pb-2 last:border-0"
              >
                <span className="min-w-0 break-words text-[var(--muted)]">{row.reason}</span>
                <span className="shrink-0 tabular-nums font-medium">{row.count}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <HorizontalBarList title={t("summary.topSkillsTitle")} items={summary.top_skills} maxItems={20} />
        <HorizontalBarList title={t("summary.topKeywordsTitle")} items={summary.top_keywords} maxItems={20} />
      </div>

      {summary.coverage && (
        <div className="grid gap-6 lg:grid-cols-2">
          <TopTable
            title={t("summary.table.skillsTitle")}
            items={summary.top_skills}
            successful={summary.coverage.successful}
            filenameStem="skills_top20"
          />
          <TopTable
            title={t("summary.table.keywordsTitle")}
            items={summary.top_keywords}
            successful={summary.coverage.successful}
            filenameStem="phrases_top20"
          />
        </div>
      )}
    </section>
  );
}

