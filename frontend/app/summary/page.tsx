"use client";

import { useMemo, useRef, useState } from "react";
import { LongRunningProgress } from "@/components/ui/long-running-progress";
import { TooltipIcon } from "@/components/ui/tooltip-icon";
import { SummaryView } from "@/components/summary/summary-view";
import { defaultExportPreset, mergeExportPreset, type ExportSummary } from "@/lib/export-history";
import { useI18n } from "@/lib/i18n";

function linesFromTextarea(value: string): string[] {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function parseApiErrorText(text: string): { code?: string; message?: string; vars?: Record<string, unknown> } {
  try {
    const json = JSON.parse(text);
    const detail = json?.detail;
    if (detail && typeof detail === "object") {
      const code = typeof detail.error === "string" ? detail.error : undefined;
      const message = typeof detail.message === "string" ? detail.message : undefined;
      return { code, message, vars: detail };
    }
    if (typeof detail === "string") return { message: detail };
    return { message: text };
  } catch {
    return { message: text };
  }
}

export default function SummaryPage() {
  const { t } = useI18n();
  const baseUrl = useMemo(() => process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "", []);
  const seed = mergeExportPreset(defaultExportPreset());

  const [viewMode, setViewMode] = useState<"aggregate" | "byQuery">("aggregate");
  const [queriesText, setQueriesText] = useState(seed.queriesText);
  const [pages, setPages] = useState<number | "">(seed.pages);
  const [perPage, setPerPage] = useState<number | "">(seed.perPage);
  const [kwTopN, setKwTopN] = useState(seed.kwTopN);
  const [kwMaxNgram, setKwMaxNgram] = useState(seed.kwMaxNgram);
  const [sleepS, setSleepS] = useState(seed.sleepS);
  const [searchSleepS, setSearchSleepS] = useState(seed.searchSleepS);
  const [hhToken, setHhToken] = useState("");
  const [apiKey, setApiKey] = useState(() => process.env.NEXT_PUBLIC_API_KEY ?? "");

  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  /** Same role as ExportForm jobProgress: determinate scan only in «By query» mode. */
  const [jobProgress, setJobProgress] = useState<{ done: number; total: number } | null>(null);
  const [summary, setSummary] = useState<ExportSummary | null>(null);
  const [byQuery, setByQuery] = useState<Array<{ query: string; summary: ExportSummary }>>([]);
  const byQueryAbortRef = useRef<AbortController | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const pollAbortRef = useRef<AbortController | null>(null);

  type JobStatus = {
    job_id: string;
    status: string;
    kind?: string | null;
    progress_done?: number | null;
    progress_total?: number | null;
    warnings_count?: number | null;
    summary?: ExportSummary | null;
  };

  function stopAllRequests() {
    abortRef.current?.abort();
    pollAbortRef.current?.abort();
    byQueryAbortRef.current?.abort();
  }

  function basePayload(queries: string[]): Record<string, unknown> {
    return {
      queries,
      pages,
      per_page: perPage,
      kw_top_n: kwTopN,
      kw_max_ngram: kwMaxNgram,
      sleep_s: sleepS,
      search_sleep_s: searchSleepS,
      ...(hhToken.trim() ? { token: hhToken.trim() } : {}),
    };
  }

  async function fetchSummary(payload: Record<string, unknown>, signal?: AbortSignal): Promise<ExportSummary> {
    if (!baseUrl) throw new Error(t("form.errNoUrl"));
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (apiKey.trim()) headers["X-API-Key"] = apiKey.trim();
    const resp = await fetch(`${baseUrl}/api/v1/summary/auto`, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      signal,
    });
    if (!resp.ok) {
      const text = await resp.text();
      const apiErr = parseApiErrorText(text);
      const code = apiErr.code;
      const vars = apiErr.vars ?? {};
      if (code === "too_many_vacancies") {
        const search_countVal = vars["search_count"];
        const maxVal = vars["max"];
        const search_count = typeof search_countVal === "number" ? String(search_countVal) : "0";
        const max = typeof maxVal === "number" ? String(maxVal) : "0";
        throw new Error(t("form.errTooManyVacancies", { search_count, max }));
      }
      if (code === "search_failed") throw new Error(t("form.errSearchFailed"));
      throw new Error(apiErr.message || resp.statusText || t("summary.errUnknown"));
    }
    const json = (await resp.json()) as { summary?: ExportSummary };
    const s = json?.summary;
    if (!s) throw new Error(t("summary.errBadResponse"));
    return s;
  }

  function validateCommon(): boolean {
    const queries = linesFromTextarea(queriesText);
    if (queries.length === 0) {
      setError(t("form.errNoAuto"));
      return false;
    }
    if (pages === "" || pages <= 0) {
      setError(t("form.errPagesRequired"));
      return false;
    }
    if (perPage === "" || perPage <= 0) {
      setError(t("form.errPerPageRequired"));
      return false;
    }
    return true;
  }

  async function runAggregate() {
    setError(null);
    setMessage(null);
    setJobProgress(null);
    setSummary(null);
    setByQuery([]);
    if (!baseUrl) {
      setError(t("form.errNoUrl"));
      return;
    }
    if (!validateCommon()) return;

    const queries = linesFromTextarea(queriesText);
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (apiKey.trim()) headers["X-API-Key"] = apiKey.trim();

    setBusy(true);
    const ac = new AbortController();
    abortRef.current = ac;
    const pollAc = new AbortController();
    pollAbortRef.current = pollAc;

    try {
      const startResp = await fetch(`${baseUrl}/api/v1/summary/auto/async`, {
        method: "POST",
        headers,
        body: JSON.stringify(basePayload(queries)),
        signal: ac.signal,
      });
      if (!startResp.ok) {
        const text = await startResp.text();
        const apiErr = parseApiErrorText(text);
        throw new Error(apiErr.message || startResp.statusText || t("summary.errUnknown"));
      }
      const started = (await startResp.json()) as any;
      const jobId = typeof started?.job_id === "string" ? started.job_id : "";
      if (!jobId) {
        setError(t("form.errBadJob"));
        return;
      }

      setMessage(t("form.jobStarted"));

      let last: JobStatus | null = null;
      for (let attempt = 0; attempt < 10_000; attempt++) {
        if (pollAc.signal.aborted) throw new DOMException("Aborted", "AbortError");
        const stResp = await fetch(`${baseUrl}/api/v1/jobs/${jobId}`, {
          method: "GET",
          headers: apiKey.trim() ? { "X-API-Key": apiKey.trim() } : undefined,
          signal: pollAc.signal,
        });
        if (!stResp.ok) throw new Error(t("form.errJobStatus"));
        const st = (await stResp.json()) as JobStatus;
        last = st;

        const done = typeof st.progress_done === "number" ? st.progress_done : 0;
        const total = typeof st.progress_total === "number" ? st.progress_total : 0;
        if (total > 0) setJobProgress({ done, total });

        if (st.status === "succeeded") break;
        if (st.status === "failed") throw new Error(t("form.errJobFailed"));
        await new Promise((r) => setTimeout(r, 800));
      }

      const s = last?.summary ?? null;
      if (!s) throw new Error(t("summary.errBadResponse"));
      setSummary(s);
      setMessage(t("form.summaryReady"));
    } catch (e) {
      const isAbort =
        (e instanceof DOMException && e.name === "AbortError") || (e instanceof Error && e.name === "AbortError");
      if (isAbort) {
        setMessage(t("form.exportAborted"));
        setError(null);
        setSummary(null);
        return;
      }
      setMessage(null);
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
      setJobProgress(null);
      abortRef.current = null;
      pollAbortRef.current = null;
    }
  }

  async function runByQuery() {
    setError(null);
    setMessage(null);
    setJobProgress(null);
    setSummary(null);
    setByQuery([]);
    if (!baseUrl) {
      setError(t("form.errNoUrl"));
      return;
    }
    if (!validateCommon()) return;

    const queries = linesFromTextarea(queriesText);
    setMessage(t("form.jobStarted"));
    setBusy(true);
    const ac = new AbortController();
    byQueryAbortRef.current = ac;
    setJobProgress({ done: 0, total: queries.length });

    try {
      const limit = 3;
      const results: Array<{ query: string; summary: ExportSummary }> = [];
      let i = 0;
      async function worker() {
        while (i < queries.length) {
          if (ac.signal.aborted) return;
          const idx = i++;
          const q = queries[idx];
          const s = await fetchSummary(basePayload([q]), ac.signal);
          results.push({ query: q, summary: s });
          setByQuery([...results].sort((a, b) => a.query.localeCompare(b.query)));
          setJobProgress({ done: results.length, total: queries.length });
        }
      }
      await Promise.all(Array.from({ length: Math.min(limit, queries.length) }, () => worker()));
      setByQuery(results);
      setMessage(t("form.summaryReady"));
    } catch (e) {
      const isAbort =
        (e instanceof DOMException && e.name === "AbortError") || (e instanceof Error && e.name === "AbortError");
      if (isAbort) {
        setError(null);
        setByQuery([]);
        setMessage(t("form.exportAborted"));
        return;
      }
      setMessage(null);
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
      setJobProgress(null);
      byQueryAbortRef.current = null;
    }
  }

  function onSubmit() {
    if (viewMode === "aggregate") void runAggregate();
    else void runByQuery();
  }

  return (
    <section className="container-shell py-6 sm:py-10 md:py-14">
      <header className="mb-6 anim-fade-up sm:mb-8">
        <p className="badge">{t("summary.badge")}</p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight md:text-4xl lg:text-5xl">{t("summary.title")}</h1>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-[var(--muted)] lg:max-w-3xl lg:text-lg">
          {t("summary.subtitle")}
        </p>
      </header>

      <div className="grid gap-4 sm:gap-6 lg:grid-cols-[1fr_360px]">
        <article className="card-soft glass-shine anim-fade-up p-4 sm:p-5 md:p-7">
          <form
            className="flex flex-col gap-6"
            onSubmit={(e) => {
              e.preventDefault();
              onSubmit();
            }}
            aria-label={t("summary.title")}
          >
            {!baseUrl && (
              <p
                className="rounded-xl border px-4 py-3 text-sm"
                style={{
                  background: "var(--warning-bg)",
                  color: "var(--warning-text)",
                  borderColor: "color-mix(in srgb, var(--warning-text), transparent 55%)",
                }}
              >
                {t("form.noApiUrl")}
              </p>
            )}

            <fieldset className="grid gap-3 sm:grid-cols-2">
              <legend className="mb-2 text-sm font-medium text-[var(--muted)] lg:text-base">{t("summary.modes.title")}</legend>
              <label className="surface-glass-sm anim-fade-up flex cursor-pointer items-center gap-2 p-3 text-sm lg:p-3.5 lg:text-base">
                <input
                  type="radio"
                  className="accent-[var(--primary)]"
                  checked={viewMode === "aggregate"}
                  onChange={() => setViewMode("aggregate")}
                />
                {t("summary.modes.aggregate")}
              </label>
              <label className="surface-glass-sm anim-fade-up flex cursor-pointer items-center gap-2 p-3 text-sm lg:p-3.5 lg:text-base">
                <input
                  type="radio"
                  className="accent-[var(--primary)]"
                  checked={viewMode === "byQuery"}
                  onChange={() => setViewMode("byQuery")}
                />
                {t("summary.modes.byQuery")}
              </label>
            </fieldset>

            <section className="grid gap-4">
              <label className="form-field">
                <span className="form-label inline-flex items-center">
                  {t("summary.queriesLabel")}
                  <TooltipIcon text={t("form.autoLabelHelp")} alt={t("form.tooltipAlt")} />
                </span>
                <textarea
                  value={queriesText}
                  onChange={(e) => setQueriesText(e.target.value)}
                  className="input-ui min-h-28 text-sm lg:text-base"
                  spellCheck={false}
                />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="form-field">
                  <span className="form-label inline-flex items-center">
                    {t("form.pages")}
                    <TooltipIcon text={t("form.pagesHelp")} alt={t("form.tooltipAlt")} />
                  </span>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={pages}
                    onChange={(e) => setPages(e.target.value === "" ? "" : Number(e.target.value))}
                    className="input-ui"
                  />
                </label>
                <label className="form-field">
                  <span className="form-label inline-flex items-center">
                    {t("form.perPage")}
                    <TooltipIcon text={t("form.perPageHelp")} alt={t("form.tooltipAlt")} />
                  </span>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={perPage}
                    onChange={(e) => setPerPage(e.target.value === "" ? "" : Number(e.target.value))}
                    className="input-ui"
                  />
                </label>
              </div>
            </section>

            <details className="surface-glass-sm rounded-xl p-3">
              <summary className="cursor-pointer text-sm font-semibold text-[var(--text)]">{t("summary.advanced")}</summary>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <label className="form-field">
                  <span className="form-label inline-flex items-center">
                    {t("form.kwTopN")}
                    <TooltipIcon text={t("form.kwTopNHelp")} alt={t("form.tooltipAlt")} />
                  </span>
                  <input
                    type="number"
                    min={1}
                    max={200}
                    value={kwTopN}
                    onChange={(e) => setKwTopN(Number(e.target.value))}
                    className="input-ui"
                  />
                </label>
                <label className="form-field">
                  <span className="form-label inline-flex items-center">
                    {t("form.kwMaxNgram")}
                    <TooltipIcon text={t("form.kwMaxNgramHelp")} alt={t("form.tooltipAlt")} />
                  </span>
                  <input
                    type="number"
                    min={1}
                    max={5}
                    value={kwMaxNgram}
                    onChange={(e) => setKwMaxNgram(Number(e.target.value))}
                    className="input-ui"
                  />
                </label>
                <label className="form-field">
                  <span className="form-label inline-flex items-center">
                    {t("form.sleep")}
                    <TooltipIcon text={t("form.sleepHelp")} alt={t("form.tooltipAlt")} />
                  </span>
                  <input
                    type="number"
                    min={0}
                    max={5}
                    step={0.05}
                    value={sleepS}
                    onChange={(e) => setSleepS(Number(e.target.value))}
                    className="input-ui"
                  />
                </label>
                <label className="form-field">
                  <span className="form-label inline-flex items-center">
                    {t("form.searchSleep")}
                    <TooltipIcon text={t("form.searchSleepHelp")} alt={t("form.tooltipAlt")} />
                  </span>
                  <input
                    type="number"
                    min={0}
                    max={5}
                    step={0.05}
                    value={searchSleepS}
                    onChange={(e) => setSearchSleepS(Number(e.target.value))}
                    className="input-ui"
                  />
                </label>
                <label className="form-field">
                  <span className="form-label inline-flex items-center">
                    {t("form.hhToken")}
                    <TooltipIcon text={t("form.hhTokenHelp")} alt={t("form.tooltipAlt")} />
                  </span>
                  <input
                    type="password"
                    value={hhToken}
                    onChange={(e) => setHhToken(e.target.value)}
                    className="input-ui"
                    autoComplete="off"
                  />
                </label>
                <label className="form-field">
                  <span className="form-label inline-flex items-center">
                    {t("form.apiKey")}
                    <TooltipIcon text={t("form.apiKeyHelp")} alt={t("form.tooltipAlt")} />
                  </span>
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    className="input-ui"
                    autoComplete="off"
                  />
                </label>
              </div>
            </details>

            {error && (
              <p
                className="rounded-xl border px-4 py-3 text-sm whitespace-pre-wrap"
                style={{
                  background: "var(--error-bg)",
                  color: "var(--error-text)",
                  borderColor: "color-mix(in srgb, var(--error-text), transparent 60%)",
                }}
              >
                {error}
              </p>
            )}

            {message && (
              <p
                className="rounded-xl border px-4 py-3 text-sm"
                style={{
                  background: "var(--success-bg)",
                  color: "var(--success-text)",
                  borderColor: "color-mix(in srgb, var(--success-text), transparent 65%)",
                }}
              >
                {message}
              </p>
            )}

            <button
              type="submit"
              disabled={busy}
              className="btn-primary w-full px-5 py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto lg:px-6 lg:py-3.5 lg:text-base"
            >
              {busy ? t("form.btnBusy") : t("summary.btnReady")}
            </button>

            <LongRunningProgress
              visible={busy}
              variant={jobProgress ? "determinate" : "indeterminate"}
              label={
                jobProgress
                  ? t("form.progressExportPct", {
                      done: String(jobProgress.done),
                      total: String(jobProgress.total),
                    })
                  : t("form.progressExport")
              }
              done={jobProgress?.done}
              total={jobProgress?.total}
              cancelLabel={t("form.btnCancel")}
              onCancel={busy ? () => stopAllRequests() : undefined}
            />
          </form>
        </article>

        <aside className="space-y-4">
          <section className="card-soft glass-shine anim-fade-up p-4 sm:p-5">
            <h2 className="text-base font-semibold lg:text-lg">{t("summary.filtersTitle")}</h2>
            <ul className="mt-3 space-y-2 text-sm text-[var(--muted)] lg:space-y-2.5 lg:text-base">
              <li>- {t("summary.filtersTip1")}</li>
              <li>- {t("summary.filtersTip2")}</li>
              <li>- {t("summary.filtersTip3")}</li>
            </ul>
          </section>
        </aside>
      </div>

      {summary && viewMode === "aggregate" && (
        <section className="mt-6 anim-fade-up sm:mt-10">
          <SummaryView summary={summary} />
        </section>
      )}

      {viewMode === "byQuery" && byQuery.length > 0 && (
        <section className="mt-6 grid gap-4 anim-fade-up sm:mt-10 sm:gap-6">
          <h2 className="text-base font-semibold lg:text-lg">{t("summary.byQuery.title")}</h2>
          <div className="grid gap-6 lg:grid-cols-2">
            {byQuery.map((row) => (
              <div key={row.query} className="grid gap-3">
                <div className="surface-glass-sm p-3">
                  <p className="text-xs text-[var(--muted)]">{t("summary.byQuery.query")}</p>
                  <p className="mt-1 font-semibold">{row.query}</p>
                </div>
                <SummaryView summary={row.summary} />
              </div>
            ))}
          </div>
        </section>
      )}
    </section>
  );
}
