"use client";

import { useEffect, useMemo, useState } from "react";
import { ExportForm } from "@/components/export/export-form";
import type { ExportFormPreset, ExportHistoryEntry, ExportSummary } from "@/lib/export-history";
import { deleteExportHistoryEntry, loadExportHistory } from "@/lib/export-history";
import { useI18n } from "@/lib/i18n";

function VerticalBarChart({
  title,
  items,
}: {
  title: string;
  items: Array<{ name: string; count: number }>;
}) {
  const top = items.slice(0, 10);
  const max = top[0]?.count ?? 0;
  return (
    <section className="card-soft glass-shine anim-fade-up p-4 sm:p-5">
      <h2 className="text-base font-semibold lg:text-lg">{title}</h2>
      {top.length === 0 ? (
        <p className="mt-3 text-sm text-[var(--muted)] lg:text-base">-</p>
      ) : (
        <div className="mt-5 grid gap-4">
          <div className="-mx-1 overflow-x-auto overscroll-x-contain pb-1 sm:mx-0">
            <div className="min-w-[min(100%,320px)] px-1 sm:min-w-0 sm:px-0">
              <div className="flex h-44 items-end gap-2">
                {top.map((it) => (
                  <div key={it.name} className="flex min-w-0 flex-1 basis-0 flex-col items-center gap-2">
                    <div className="text-[10px] tabular-nums text-[var(--muted)]">{it.count}</div>
                    <div className="relative h-28 w-full overflow-hidden rounded-md border border-[var(--glass-border)] bg-[color:var(--glass-bg-strong)] sm:rounded-lg">
                      <div
                        className="absolute bottom-0 left-0 right-0 rounded-md bg-[var(--primary)] sm:rounded-lg"
                        style={{ height: `${max ? Math.max(6, Math.round((it.count / max) * 100)) : 0}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-2 flex gap-2">
                {top.map((it) => (
                  <div
                    key={it.name}
                    className="flex min-w-0 flex-1 basis-0 flex-col items-center text-[10px] text-[var(--muted)]"
                  >
                    <span className="block max-w-full truncate text-center" title={it.name}>
                      {it.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export default function AnalyzePage() {
  const { t } = useI18n();
  const [summary, setSummary] = useState<ExportSummary | null>(null);
  const [formKey, setFormKey] = useState(0);
  const [seedPreset, setSeedPreset] = useState<ExportFormPreset | undefined>(undefined);
  /* Empty on first paint so SSR and client markup match; localStorage only after mount. */
  const [history, setHistory] = useState<ExportHistoryEntry[]>([]);

  useEffect(() => {
    setHistory(loadExportHistory());
  }, []);

  function refreshHistory() {
    setHistory(loadExportHistory());
  }

  function handleRepeat(entry: ExportHistoryEntry) {
    setSeedPreset(entry.preset);
    setFormKey((k) => k + 1);
  }

  function handleDeleteHistoryEntry(id: string) {
    deleteExportHistoryEntry(id);
    setHistory((prev) => prev.filter((e) => e.id !== id));
  }

  const stats = useMemo(() => {
    if (!summary) return null;
    return [
      { label: "Requested", value: summary.requested },
      { label: "Processed", value: summary.processed },
      { label: "Errors", value: summary.errors },
      { label: "Unique skills (top20)", value: summary.top_skills.length },
    ];
  }, [summary]);

  return (
    <section className="container-shell py-6 sm:py-10 md:py-14">
      <header className="mb-6 anim-fade-up sm:mb-8">
        <p className="badge">{t("analyze.badge")}</p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight md:text-4xl lg:text-5xl">
          {t("analyze.title")}
        </h1>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-[var(--muted)] lg:max-w-3xl lg:text-lg">
          {t("analyze.subtitle")}
        </p>
      </header>

      <section className="mb-8">
        <h2 className="text-base font-semibold lg:text-lg">{t("analyze.historyTitle")}</h2>
        {history.length === 0 ? (
          <p className="mt-2 text-sm text-[var(--muted)] lg:text-base">{t("analyze.historyEmpty")}</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {history.map((entry) => (
              <li
                key={entry.id}
                className="glass-shine surface-glass-sm flex flex-col gap-3 p-3 text-sm sm:flex-row sm:flex-wrap sm:items-center sm:justify-between"
              >
                <div className="min-w-0 text-[var(--muted)] sm:pr-2">
                  <span className="font-medium text-[var(--text)]">{entry.mode === "manual" ? "Manual" : "Auto"}</span>
                  <span className="mx-2">{"\u00B7"}</span>
                  <span>{t("analyze.historyVacancies", { n: String(entry.summary.requested) })}</span>
                  {entry.warnings != null && entry.warnings > 0 && (
                    <>
                      <span className="mx-2">{"\u00B7"}</span>
                      <span>{t("analyze.historyWarnings", { n: String(entry.warnings) })}</span>
                    </>
                  )}
                  <span className="mx-2">{"\u00B7"}</span>
                  <span className="tabular-nums">
                    {new Date(entry.at).toLocaleString(undefined, {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                  </span>
                  {entry.fileName && (
                    <>
                      <span className="mx-2">{"\u00B7"}</span>
                      <span className="truncate" title={entry.fileName}>
                        {entry.fileName}
                      </span>
                    </>
                  )}
                </div>
                <div className="flex w-full shrink-0 flex-wrap items-stretch gap-2 sm:w-auto sm:justify-end">
                  <button
                    type="button"
                    className="btn-soft min-h-10 flex-1 px-3 py-2 text-xs font-semibold sm:min-h-0 sm:flex-none sm:py-1.5"
                    onClick={() => handleRepeat(entry)}
                  >
                    {t("analyze.historyRepeat")}
                  </button>
                  <button
                    type="button"
                    className="btn-history-delete min-h-10 flex-1 px-3 py-2 text-xs font-semibold sm:min-h-0 sm:flex-none sm:py-1.5"
                    onClick={() => handleDeleteHistoryEntry(entry.id)}
                  >
                    {t("analyze.historyDelete")}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="grid gap-4 sm:gap-6 lg:grid-cols-[1fr_320px]">
        <article className="card-soft glass-shine anim-fade-up p-4 sm:p-5 md:p-7">
          <ExportForm
            key={formKey}
            initialPreset={seedPreset}
            onSummary={setSummary}
            onHistoryChange={refreshHistory}
          />
        </article>
        <aside className="space-y-4">
          <section className="card-soft glass-shine anim-fade-up p-4 sm:p-5">
            <h2 className="text-base font-semibold lg:text-lg">{t("analyze.limitsTitle")}</h2>
            <ul className="mt-3 space-y-2 text-sm text-[var(--muted)] lg:space-y-2.5 lg:text-base">
              <li>- {t("analyze.limit1")}</li>
              <li>- {t("analyze.limit2")}</li>
              <li>- {t("analyze.limit3")}</li>
            </ul>
          </section>
          <section className="card-soft glass-shine anim-fade-up p-4 sm:p-5">
            <h2 className="text-base font-semibold lg:text-lg">{t("analyze.exampleTitle")}</h2>
            <pre className="mt-3 overflow-x-auto rounded-lg border border-[var(--glass-border)] bg-[color:var(--glass-bg-strong)] p-3 text-xs leading-6 text-[var(--text)] backdrop-blur-md lg:p-4 lg:text-sm lg:leading-7">
              131474430
              https://hh.ru/vacancy/131234053
            </pre>
          </section>
        </aside>
      </div>

      {stats && summary && (
        <section className="mt-6 grid gap-4 sm:mt-10 sm:gap-6">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
            {stats.map((s) => (
              <div key={s.label} className="glass-shine surface-glass-sm p-3 sm:p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">{s.label}</p>
                <p className="mt-2 text-2xl font-semibold tabular-nums">{s.value}</p>
              </div>
            ))}
          </div>

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

          {summary.coverage && (
            <div className="glass-shine card-soft p-4 sm:p-5">
              <h2 className="text-base font-semibold lg:text-lg">{t("analyze.coverageTitle")}</h2>
              <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-[var(--muted)]">{t("analyze.coverageKeySkillsPct")}</dt>
                  <dd className="font-semibold tabular-nums">
                    {(summary.coverage.key_skills_rate * 100).toFixed(1)}% ({summary.coverage.with_key_skills} / {summary.coverage.successful})
                  </dd>
                </div>
                <div>
                  <dt className="text-[var(--muted)]">{t("analyze.coverageNoSkills")}</dt>
                  <dd className="font-semibold tabular-nums">{summary.coverage.without_key_skills}</dd>
                </div>
                <div>
                  <dt className="text-[var(--muted)]">{t("analyze.coverageNoDescription")}</dt>
                  <dd className="font-semibold tabular-nums">{summary.coverage.without_description}</dd>
                </div>
              </dl>
            </div>
          )}

          {summary.error_breakdown && summary.error_breakdown.length > 0 && (
            <div className="glass-shine card-soft p-4 sm:p-5">
              <h2 className="text-base font-semibold lg:text-lg">{t("analyze.errorsByReason")}</h2>
              <ul className="mt-3 space-y-2 text-sm">
                {summary.error_breakdown.map((row) => (
                  <li key={row.reason} className="flex justify-between gap-3 border-b border-[var(--glass-border)] pb-2 last:border-0">
                    <span className="min-w-0 break-words text-[var(--muted)]">{row.reason}</span>
                    <span className="shrink-0 tabular-nums font-medium">{row.count}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="grid gap-6 lg:grid-cols-2">
            <VerticalBarChart title="Top skills" items={summary.top_skills} />
            <VerticalBarChart title="Top keywords" items={summary.top_keywords} />
          </div>
        </section>
      )}
    </section>
  );
}
