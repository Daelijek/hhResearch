"use client";

import { useEffect, useMemo, useState } from "react";
import type { ExportFormPreset, ExportHistoryEntry, ExportSummary } from "../export-history";
import { deleteExportHistoryEntry, loadExportHistory } from "../export-history";
import { ExportForm } from "../export-form";
import { useI18n } from "../i18n";

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
    <section className="card-soft glass-shine anim-fade-up p-5">
      <h2 className="text-base font-semibold">{title}</h2>
      {top.length === 0 ? (
        <p className="mt-3 text-sm text-[var(--muted)]">-</p>
      ) : (
        <div className="mt-5 grid gap-4">
          <div className="flex h-44 items-end gap-2">
            {top.map((it) => (
              <div key={it.name} className="flex min-w-0 flex-1 flex-col items-center gap-2">
                <div className="text-[10px] tabular-nums text-[var(--muted)]">{it.count}</div>
                <div className="relative h-28 w-full overflow-hidden rounded-lg border border-[var(--glass-border)] bg-[color:var(--glass-bg-strong)]">
                  <div
                    className="absolute bottom-0 left-0 right-0 rounded-lg bg-[var(--primary)]"
                    style={{ height: `${max ? Math.max(6, Math.round((it.count / max) * 100)) : 0}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            {top.map((it) => (
              <div key={it.name} className="min-w-0 flex-1 text-center text-[10px] text-[var(--muted)]">
                <span className="block truncate" title={it.name}>
                  {it.name}
                </span>
              </div>
            ))}
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
    <section className="container-shell py-10 md:py-14">
      <header className="mb-8 anim-fade-up">
        <p className="badge">{t("analyze.badge")}</p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight md:text-4xl">{t("analyze.title")}</h1>
        <p className="mt-3 max-w-2xl text-[var(--muted)]">{t("analyze.subtitle")}</p>
      </header>

      <section className="mb-8">
        <h2 className="text-base font-semibold">{t("analyze.historyTitle")}</h2>
        {history.length === 0 ? (
          <p className="mt-2 text-sm text-[var(--muted)]">{t("analyze.historyEmpty")}</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {history.map((entry) => (
              <li
                key={entry.id}
                className="glass-shine surface-glass-sm flex flex-wrap items-center justify-between gap-3 p-3 text-sm"
              >
                <div className="min-w-0 text-[var(--muted)]">
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
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <button type="button" className="btn-soft px-3 py-1.5 text-xs font-semibold" onClick={() => handleRepeat(entry)}>
                    {t("analyze.historyRepeat")}
                  </button>
                  <button
                    type="button"
                    className="btn-history-delete px-3 py-1.5 text-xs font-semibold"
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

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <article className="card-soft glass-shine anim-fade-up p-5 md:p-7">
          <ExportForm
            key={formKey}
            initialPreset={seedPreset}
            onSummary={setSummary}
            onHistoryChange={refreshHistory}
          />
        </article>
        <aside className="space-y-4">
          <section className="card-soft glass-shine anim-fade-up p-5">
            <h2 className="text-base font-semibold">{t("analyze.limitsTitle")}</h2>
            <ul className="mt-3 space-y-2 text-sm text-[var(--muted)]">
              <li>- {t("analyze.limit1")}</li>
              <li>- {t("analyze.limit2")}</li>
              <li>- {t("analyze.limit3")}</li>
            </ul>
          </section>
          <section className="card-soft glass-shine anim-fade-up p-5">
            <h2 className="text-base font-semibold">{t("analyze.exampleTitle")}</h2>
            <pre className="mt-3 overflow-x-auto rounded-lg border border-[var(--glass-border)] bg-[color:var(--glass-bg-strong)] p-3 text-xs leading-6 text-[var(--text)] backdrop-blur-md">
              131474430
              https://hh.ru/vacancy/131234053
            </pre>
          </section>
        </aside>
      </div>

      {stats && summary && (
        <section className="mt-10 grid gap-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((s) => (
              <div key={s.label} className="glass-shine surface-glass-sm p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">{s.label}</p>
                <p className="mt-2 text-2xl font-semibold tabular-nums">{s.value}</p>
              </div>
            ))}
          </div>

          {summary.dedup && (
            <div className="glass-shine card-soft p-5">
              <h2 className="text-base font-semibold">{t("analyze.dedupTitle")}</h2>
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
            <div className="glass-shine card-soft p-5">
              <h2 className="text-base font-semibold">{t("analyze.coverageTitle")}</h2>
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
            <div className="glass-shine card-soft p-5">
              <h2 className="text-base font-semibold">{t("analyze.errorsByReason")}</h2>
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
