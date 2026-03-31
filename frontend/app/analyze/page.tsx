"use client";

import { useEffect, useState } from "react";
import { ExportForm } from "@/components/export/export-form";
import type { ExportFormPreset, ExportHistoryEntry, ExportSummary } from "@/lib/export-history";
import { deleteExportHistoryEntry, loadExportHistory } from "@/lib/export-history";
import { useI18n } from "@/lib/i18n";
import { SummaryView } from "@/components/summary/summary-view";

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

      {summary && (
        <section className="mt-6 sm:mt-10">
          <SummaryView summary={summary} />
        </section>
      )}
    </section>
  );
}
