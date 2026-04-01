"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ExportSummary } from "@/lib/export-history";
import { useI18n } from "@/lib/i18n";
import { SummaryView } from "@/components/summary/summary-view";
import { Sparkline } from "@/components/summary/sparkline";
import { DiffTable } from "@/components/summary/compare/diff-table";
import { LongRunningProgress } from "@/components/ui/long-running-progress";

type ExperienceItem = { id: string; name: string };
type EmployerItem = { id: string; name: string; open_vacancies?: number };
type AreaNode = { id: string; name: string; areas?: AreaNode[] };

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

function flattenAreas(nodes: AreaNode[], out: Array<{ id: string; name: string }> = []) {
  for (const n of nodes) {
    if (n?.id && n?.name) out.push({ id: String(n.id), name: String(n.name) });
    if (Array.isArray(n.areas) && n.areas.length > 0) flattenAreas(n.areas, out);
  }
  return out;
}

export default function SummaryPage() {
  const { t } = useI18n();
  const baseUrl = useMemo(() => process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "", []);

  const [viewMode, setViewMode] = useState<"aggregate" | "byQuery" | "compareSegments" | "comparePeriod">("aggregate");

  const [queriesText, setQueriesText] = useState("frontend developer\nfullstack developer");
  const [pages, setPages] = useState<number | "">(1);
  const [perPage, setPerPage] = useState<number | "">(10);
  const [kwTopN, setKwTopN] = useState(30);
  const [kwMaxNgram, setKwMaxNgram] = useState(3);
  const [sleepS, setSleepS] = useState(0.2);
  const [searchSleepS, setSearchSleepS] = useState(0.2);
  const [periodDays, setPeriodDays] = useState<number | "">("");
  const [hhToken, setHhToken] = useState("");
  const [apiKey, setApiKey] = useState(() => process.env.NEXT_PUBLIC_API_KEY ?? "");

  const [experienceId, setExperienceId] = useState<string>("");
  const [experienceOptions, setExperienceOptions] = useState<ExperienceItem[]>([]);

  const [areaQuery, setAreaQuery] = useState("");
  const [areaId, setAreaId] = useState<string>("");
  const [areaOptions, setAreaOptions] = useState<Array<{ id: string; name: string }>>([]);
  const [areaDropdownOpen, setAreaDropdownOpen] = useState(false);

  const [companyQuery, setCompanyQuery] = useState("");
  const [employerId, setEmployerId] = useState<string>("");
  const [employerOptions, setEmployerOptions] = useState<EmployerItem[]>([]);
  const [companyDropdownOpen, setCompanyDropdownOpen] = useState(false);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<ExportSummary | null>(null);
  const [byQuery, setByQuery] = useState<Array<{ query: string; summary: ExportSummary }>>([]);
  const [byQueryDone, setByQueryDone] = useState(0);
  const [byQueryTotal, setByQueryTotal] = useState(0);
  const [compareA, setCompareA] = useState<ExportSummary | null>(null);
  const [compareB, setCompareB] = useState<ExportSummary | null>(null);
  const [comparePeriod, setComparePeriod] = useState<Array<{ period: number; summary: ExportSummary }>>([]);
  const byQueryAbortRef = useRef<AbortController | null>(null);

  // Segment B filter state (A uses the existing area/experience/employer)
  const [experienceIdB, setExperienceIdB] = useState<string>("");
  const [areaQueryB, setAreaQueryB] = useState("");
  const [areaIdB, setAreaIdB] = useState<string>("");
  const [areaDropdownOpenB, setAreaDropdownOpenB] = useState(false);
  const [companyQueryB, setCompanyQueryB] = useState("");
  const [employerIdB, setEmployerIdB] = useState<string>("");
  const [employerOptionsB, setEmployerOptionsB] = useState<EmployerItem[]>([]);
  const [companyDropdownOpenB, setCompanyDropdownOpenB] = useState(false);
  const [periodPreset, setPeriodPreset] = useState<1 | 7 | 30>(7);

  useEffect(() => {
    if (!baseUrl) return;
    let cancelled = false;
    (async () => {
      try {
        const headers: Record<string, string> = {};
        if (apiKey.trim()) headers["X-API-Key"] = apiKey.trim();

        const [dictResp, areasResp] = await Promise.all([
          fetch(`${baseUrl}/api/v1/meta/dictionaries`, { headers }),
          fetch(`${baseUrl}/api/v1/meta/areas`, { headers }),
        ]);

        const dictJson = dictResp.ok ? ((await dictResp.json()) as any) : null;
        const areasJson = areasResp.ok ? ((await areasResp.json()) as any) : null;

        if (cancelled) return;

        const exp = Array.isArray(dictJson?.experience) ? (dictJson.experience as ExperienceItem[]) : [];
        setExperienceOptions(exp);

        const flat = Array.isArray(areasJson) ? flattenAreas(areasJson as AreaNode[]) : [];
        setAreaOptions(flat);
      } catch {
        // ignore meta load failures; user can still run without filters
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [baseUrl, apiKey]);

  useEffect(() => {
    if (!baseUrl) return;
    const q = companyQuery.trim();
    if (q.length < 2) {
      setEmployerOptions([]);
      return;
    }

    const ctrl = new AbortController();
    const tmr = window.setTimeout(async () => {
      try {
        const headers: Record<string, string> = {};
        if (apiKey.trim()) headers["X-API-Key"] = apiKey.trim();
        const url = new URL(`${baseUrl}/api/v1/meta/employers`);
        url.searchParams.set("text", q);
        const resp = await fetch(url.toString(), { headers, signal: ctrl.signal });
        if (!resp.ok) return;
        const json = (await resp.json()) as any;
        const items = Array.isArray(json?.items) ? (json.items as EmployerItem[]) : [];
        setEmployerOptions(items.slice(0, 12));
      } catch {
        // ignore
      }
    }, 250);

    return () => {
      window.clearTimeout(tmr);
      ctrl.abort();
    };
  }, [baseUrl, apiKey, companyQuery]);

  useEffect(() => {
    if (!baseUrl) return;
    const q = companyQueryB.trim();
    if (q.length < 2) {
      setEmployerOptionsB([]);
      return;
    }

    const ctrl = new AbortController();
    const tmr = window.setTimeout(async () => {
      try {
        const headers: Record<string, string> = {};
        if (apiKey.trim()) headers["X-API-Key"] = apiKey.trim();
        const url = new URL(`${baseUrl}/api/v1/meta/employers`);
        url.searchParams.set("text", q);
        const resp = await fetch(url.toString(), { headers, signal: ctrl.signal });
        if (!resp.ok) return;
        const json = (await resp.json()) as any;
        const items = Array.isArray(json?.items) ? (json.items as EmployerItem[]) : [];
        setEmployerOptionsB(items.slice(0, 12));
      } catch {
        // ignore
      }
    }, 250);

    return () => {
      window.clearTimeout(tmr);
      ctrl.abort();
    };
  }, [baseUrl, apiKey, companyQueryB]);

  const filteredAreas = useMemo(() => {
    const q = areaQuery.trim().toLowerCase();
    if (!q) return areaOptions.slice(0, 12);
    return areaOptions.filter((a) => a.name.toLowerCase().includes(q)).slice(0, 12);
  }, [areaOptions, areaQuery]);

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
    const json = (await resp.json()) as any;
    const s = json?.summary as ExportSummary | undefined;
    if (!s) throw new Error(t("summary.errBadResponse"));
    return s;
  }

  function basePayload(queries: string[]) {
    return {
      queries,
      pages,
      per_page: perPage,
      kw_top_n: kwTopN,
      kw_max_ngram: kwMaxNgram,
      sleep_s: sleepS,
      search_sleep_s: searchSleepS,
      ...(periodDays !== "" ? { period: periodDays } : {}),
      ...(hhToken.trim() ? { token: hhToken.trim() } : {}),
    } as Record<string, unknown>;
  }

  function payloadForSegment(
    queries: string[],
    seg: { employer_id?: string; experience?: string; area?: string }
  ): Record<string, unknown> {
    return {
      ...basePayload(queries),
      ...(seg.employer_id ? { employer_id: seg.employer_id } : {}),
      ...(seg.experience ? { experience: seg.experience } : {}),
      ...(seg.area ? { area: seg.area } : {}),
    };
  }

  async function runAggregate() {
    setError(null);
    setSummary(null);
    setByQuery([]);
    setByQueryDone(0);
    setByQueryTotal(0);
    setCompareA(null);
    setCompareB(null);
    setComparePeriod([]);

    const queries = linesFromTextarea(queriesText);
    if (queries.length === 0) {
      setError(t("form.errNoAuto"));
      return;
    }
    if (pages === "" || pages <= 0) {
      setError(t("form.errPagesRequired"));
      return;
    }
    if (perPage === "" || perPage <= 0) {
      setError(t("form.errPerPageRequired"));
      return;
    }

    setBusy(true);
    try {
      const s = await fetchSummary(
        payloadForSegment(queries, { employer_id: employerId, experience: experienceId, area: areaId })
      );
      setSummary(s);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function runByQuery() {
    setError(null);
    setSummary(null);
    setByQuery([]);
    setByQueryDone(0);
    setByQueryTotal(0);
    setCompareA(null);
    setCompareB(null);
    setComparePeriod([]);

    const queries = linesFromTextarea(queriesText);
    if (queries.length === 0) {
      setError(t("form.errNoAuto"));
      return;
    }
    if (pages === "" || pages <= 0) {
      setError(t("form.errPagesRequired"));
      return;
    }
    if (perPage === "" || perPage <= 0) {
      setError(t("form.errPerPageRequired"));
      return;
    }

    const seg = { employer_id: employerId, experience: experienceId, area: areaId };

    setBusy(true);
    const ac = new AbortController();
    byQueryAbortRef.current = ac;
    setByQueryTotal(queries.length);
    try {
      // Concurrency limit: 3
      const limit = 3;
      const results: Array<{ query: string; summary: ExportSummary }> = [];
      let i = 0;
      async function worker() {
        while (i < queries.length) {
          if (ac.signal.aborted) return;
          const idx = i++;
          const q = queries[idx];
          const s = await fetchSummary(payloadForSegment([q], seg), ac.signal);
          results.push({ query: q, summary: s });
          setByQuery([...results].sort((a, b) => a.query.localeCompare(b.query)));
          setByQueryDone(results.length);
        }
      }
      await Promise.all(Array.from({ length: Math.min(limit, queries.length) }, () => worker()));
      setByQuery(results);
    } catch (e) {
      const isAbort =
        (e instanceof DOMException && e.name === "AbortError") || (e instanceof Error && e.name === "AbortError");
      if (isAbort) {
        setError(null);
        setByQuery([]);
        setByQueryDone(0);
        setByQueryTotal(0);
        return;
      }
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
      byQueryAbortRef.current = null;
    }
  }

  async function runCompareSegments() {
    setError(null);
    setSummary(null);
    setByQuery([]);
    setCompareA(null);
    setCompareB(null);
    setComparePeriod([]);

    const queries = linesFromTextarea(queriesText);
    if (queries.length === 0) {
      setError(t("form.errNoAuto"));
      return;
    }
    if (pages === "" || pages <= 0) {
      setError(t("form.errPagesRequired"));
      return;
    }
    if (perPage === "" || perPage <= 0) {
      setError(t("form.errPerPageRequired"));
      return;
    }

    const segA = { employer_id: employerId, experience: experienceId, area: areaId };
    const segB = { employer_id: employerIdB, experience: experienceIdB, area: areaIdB };

    setBusy(true);
    try {
      const [a, b] = await Promise.all([
        fetchSummary(payloadForSegment(queries, segA)),
        fetchSummary(payloadForSegment(queries, segB)),
      ]);
      setCompareA(a);
      setCompareB(b);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function runComparePeriod() {
    setError(null);
    setSummary(null);
    setByQuery([]);
    setCompareA(null);
    setCompareB(null);
    setComparePeriod([]);

    const queries = linesFromTextarea(queriesText);
    if (queries.length === 0) {
      setError(t("form.errNoAuto"));
      return;
    }
    if (pages === "" || pages <= 0) {
      setError(t("form.errPagesRequired"));
      return;
    }
    if (perPage === "" || perPage <= 0) {
      setError(t("form.errPerPageRequired"));
      return;
    }

    const seg = { employer_id: employerId, experience: experienceId, area: areaId };
    const periods = [1, 7, 30];

    setBusy(true);
    try {
      const results: Array<{ period: number; summary: ExportSummary }> = [];
      for (const p of periods) {
        const payload = { ...payloadForSegment(queries, seg), period: p };
        const s = await fetchSummary(payload);
        results.push({ period: p, summary: s });
        setComparePeriod([...results]);
      }
      setComparePeriod(results);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  function clearCompany() {
    setEmployerId("");
    setCompanyQuery("");
    setEmployerOptions([]);
  }

  function clearArea() {
    setAreaId("");
    setAreaQuery("");
  }

  return (
    <section className="container-shell py-6 sm:py-10 md:py-14">
      <header className="mb-6 anim-fade-up sm:mb-8">
        <p className="badge">{t("summary.badge")}</p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight md:text-4xl lg:text-5xl">
          {t("summary.title")}
        </h1>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-[var(--muted)] lg:max-w-3xl lg:text-lg">
          {t("summary.subtitle")}
        </p>
      </header>

      <div className="grid gap-4 sm:gap-6 lg:grid-cols-[1fr_360px]">
        <article className="card-soft glass-shine anim-fade-up p-4 sm:p-5 md:p-7">
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

          <div className="grid gap-4">
            <fieldset className="grid gap-2">
              <legend className="text-sm font-semibold text-[var(--text)]">{t("summary.modes.title")}</legend>
              <div className="grid gap-2 sm:grid-cols-2">
                {(
                  [
                    ["aggregate", t("summary.modes.aggregate")],
                    ["byQuery", t("summary.modes.byQuery")],
                    ["compareSegments", t("summary.modes.compareSegments")],
                    ["comparePeriod", t("summary.modes.comparePeriod")],
                  ] as const
                ).map(([id, label]) => (
                  <label key={id} className="surface-glass-sm flex cursor-pointer items-center gap-2 p-3 text-sm">
                    <input
                      type="radio"
                      checked={viewMode === id}
                      onChange={() => setViewMode(id)}
                      className="accent-[var(--primary)]"
                    />
                    {label}
                  </label>
                ))}
              </div>
            </fieldset>

            <label className="form-field">
              <span className="form-label inline-flex items-center">{t("summary.queriesLabel")}</span>
              <textarea
                value={queriesText}
                onChange={(e) => setQueriesText(e.target.value)}
                className="input-ui min-h-28 text-sm lg:text-base"
                spellCheck={false}
              />
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="form-field">
                <span className="form-label inline-flex items-center">{t("form.pages")}</span>
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
                <span className="form-label inline-flex items-center">{t("form.perPage")}</span>
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

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="form-field relative">
                <span className="form-label inline-flex items-center">
                  {t("summary.companyLabel")}{" "}
                  <span className="text-xs text-[var(--muted)]">({t("summary.segmentA")})</span>
                </span>
                <input
                  value={companyQuery}
                  onChange={(e) => {
                    setCompanyQuery(e.target.value);
                    setEmployerId("");
                    setCompanyDropdownOpen(true);
                  }}
                  onFocus={() => setCompanyDropdownOpen(true)}
                  onBlur={() => window.setTimeout(() => setCompanyDropdownOpen(false), 150)}
                  className="input-ui"
                  placeholder={t("summary.companyPlaceholder")}
                />
                {(employerId || companyQuery) && (
                  <button
                    type="button"
                    className="btn-soft mt-2 w-full px-3 py-2 text-xs font-semibold"
                    onClick={clearCompany}
                  >
                    {t("summary.clearCompany")}
                  </button>
                )}
                {companyDropdownOpen && employerOptions.length > 0 && (
                  <div className="mt-2 overflow-hidden rounded-xl border border-[var(--glass-border)] bg-[color:var(--glass-bg)] shadow-2xl">
                    <ul className="max-h-72 overflow-auto py-1 text-sm">
                      {employerOptions.map((it) => (
                        <li key={it.id}>
                          <button
                            type="button"
                            className="w-full px-3 py-2 text-left hover:bg-[color:var(--glass-bg-strong)]"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => {
                              setEmployerId(String(it.id));
                              setCompanyQuery(it.name);
                              setCompanyDropdownOpen(false);
                            }}
                          >
                            <span className="font-medium">{it.name}</span>
                            {typeof it.open_vacancies === "number" && (
                              <span className="ml-2 text-xs text-[var(--muted)] tabular-nums">
                                {t("summary.openVacancies", { n: String(it.open_vacancies) })}
                              </span>
                            )}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {employerId && (
                  <p className="mt-2 text-xs text-[var(--muted)]">
                    {t("summary.selectedEmployerId", { id: employerId })}
                  </p>
                )}
              </label>

              <label className="form-field">
                <span className="form-label inline-flex items-center">
                  {t("summary.levelLabel")}{" "}
                  <span className="text-xs text-[var(--muted)]">({t("summary.segmentA")})</span>
                </span>
                <select
                  value={experienceId}
                  onChange={(e) => setExperienceId(e.target.value)}
                  className="input-ui"
                >
                  <option value="">{t("summary.anyOption")}</option>
                  {experienceOptions.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="form-field relative">
              <span className="form-label inline-flex items-center">
                {t("summary.locationLabel")}{" "}
                <span className="text-xs text-[var(--muted)]">({t("summary.segmentA")})</span>
              </span>
              <input
                value={areaQuery}
                onChange={(e) => {
                  setAreaQuery(e.target.value);
                  setAreaId("");
                  setAreaDropdownOpen(true);
                }}
                onFocus={() => setAreaDropdownOpen(true)}
                onBlur={() => window.setTimeout(() => setAreaDropdownOpen(false), 150)}
                className="input-ui"
                placeholder={t("summary.locationPlaceholder")}
              />
              {(areaId || areaQuery) && (
                <button
                  type="button"
                  className="btn-soft mt-2 w-full px-3 py-2 text-xs font-semibold"
                  onClick={clearArea}
                >
                  {t("summary.clearLocation")}
                </button>
              )}
              {areaDropdownOpen && filteredAreas.length > 0 && (
                <div className="mt-2 overflow-hidden rounded-xl border border-[var(--glass-border)] bg-[color:var(--glass-bg)] shadow-2xl">
                  <ul className="max-h-72 overflow-auto py-1 text-sm">
                    {filteredAreas.map((it) => (
                      <li key={it.id}>
                        <button
                          type="button"
                          className="w-full px-3 py-2 text-left hover:bg-[color:var(--glass-bg-strong)]"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => {
                            setAreaId(String(it.id));
                            setAreaQuery(it.name);
                            setAreaDropdownOpen(false);
                          }}
                        >
                          <span className="font-medium">{it.name}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {areaId && <p className="mt-2 text-xs text-[var(--muted)]">{t("summary.selectedAreaId", { id: areaId })}</p>}
            </label>

            <details className="surface-glass-sm rounded-xl p-3">
              <summary className="cursor-pointer text-sm font-semibold text-[var(--text)]">
                {t("summary.advanced")}
              </summary>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <label className="form-field">
                  <span className="form-label inline-flex items-center">{t("summary.periodLabel")}</span>
                  <input
                    type="number"
                    min={1}
                    max={30}
                    value={periodDays}
                    onChange={(e) => setPeriodDays(e.target.value === "" ? "" : Number(e.target.value))}
                    className="input-ui"
                    placeholder={t("summary.periodPh")}
                  />
                </label>
                <label className="form-field">
                  <span className="form-label inline-flex items-center">{t("form.kwTopN")}</span>
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
                  <span className="form-label inline-flex items-center">{t("form.kwMaxNgram")}</span>
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
                  <span className="form-label inline-flex items-center">{t("form.sleep")}</span>
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
                  <span className="form-label inline-flex items-center">{t("form.searchSleep")}</span>
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
                  <span className="form-label inline-flex items-center">{t("form.hhToken")}</span>
                  <input
                    type="password"
                    value={hhToken}
                    onChange={(e) => setHhToken(e.target.value)}
                    className="input-ui"
                    autoComplete="off"
                  />
                </label>
                <label className="form-field">
                  <span className="form-label inline-flex items-center">{t("form.apiKey")}</span>
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

            <button
              type="button"
              disabled={busy}
              className="btn-primary w-full px-5 py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto lg:px-6 lg:py-3.5 lg:text-base"
              onClick={() => {
                if (viewMode === "aggregate") return void runAggregate();
                if (viewMode === "byQuery") return void runByQuery();
                if (viewMode === "compareSegments") return void runCompareSegments();
                return void runComparePeriod();
              }}
            >
              {busy ? t("summary.btnBusy") : t("summary.btnReady")}
            </button>

            <LongRunningProgress
              visible={busy && viewMode === "byQuery"}
              variant="determinate"
              label={t("summary.byQuery.progress", { done: String(byQueryDone), total: String(byQueryTotal) })}
              done={byQueryDone}
              total={byQueryTotal}
              cancelLabel={t("form.btnCancel")}
              onCancel={() => byQueryAbortRef.current?.abort()}
            />
          </div>
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
        <section className="mt-6 sm:mt-10">
          <SummaryView summary={summary} />
        </section>
      )}

      {viewMode === "byQuery" && byQuery.length > 0 && (
        <section className="mt-6 grid gap-4 sm:mt-10 sm:gap-6">
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

      {viewMode === "compareSegments" && (
        <section className="mt-6 grid gap-6 sm:mt-10">
          <h2 className="text-base font-semibold lg:text-lg">{t("summary.compareSegments.title")}</h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="card-soft glass-shine p-4 sm:p-5">
              <h3 className="font-semibold">{t("summary.segmentA")}</h3>
              <p className="mt-1 text-xs text-[var(--muted)]">{t("summary.compareSegments.usesMainFilters")}</p>
            </div>
            <div className="card-soft glass-shine p-4 sm:p-5">
              <h3 className="font-semibold">{t("summary.segmentB")}</h3>
              <div className="mt-4 grid gap-3">
                <label className="form-field relative">
                  <span className="form-label inline-flex items-center">{t("summary.companyLabel")}</span>
                  <input
                    value={companyQueryB}
                    onChange={(e) => {
                      setCompanyQueryB(e.target.value);
                      setEmployerIdB("");
                      setCompanyDropdownOpenB(true);
                    }}
                    onFocus={() => setCompanyDropdownOpenB(true)}
                    onBlur={() => window.setTimeout(() => setCompanyDropdownOpenB(false), 150)}
                    className="input-ui"
                    placeholder={t("summary.companyPlaceholder")}
                  />
                  {companyDropdownOpenB && employerOptionsB.length > 0 && (
                    <div className="mt-2 overflow-hidden rounded-xl border border-[var(--glass-border)] bg-[color:var(--glass-bg)] shadow-2xl">
                      <ul className="max-h-72 overflow-auto py-1 text-sm">
                        {employerOptionsB.map((it) => (
                          <li key={it.id}>
                            <button
                              type="button"
                              className="w-full px-3 py-2 text-left hover:bg-[color:var(--glass-bg-strong)]"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => {
                                setEmployerIdB(String(it.id));
                                setCompanyQueryB(it.name);
                                setCompanyDropdownOpenB(false);
                              }}
                            >
                              <span className="font-medium">{it.name}</span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </label>

                <label className="form-field">
                  <span className="form-label inline-flex items-center">{t("summary.levelLabel")}</span>
                  <select value={experienceIdB} onChange={(e) => setExperienceIdB(e.target.value)} className="input-ui">
                    <option value="">{t("summary.anyOption")}</option>
                    {experienceOptions.map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        {opt.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="form-field relative">
                  <span className="form-label inline-flex items-center">{t("summary.locationLabel")}</span>
                  <input
                    value={areaQueryB}
                    onChange={(e) => {
                      setAreaQueryB(e.target.value);
                      setAreaIdB("");
                      setAreaDropdownOpenB(true);
                    }}
                    onFocus={() => setAreaDropdownOpenB(true)}
                    onBlur={() => window.setTimeout(() => setAreaDropdownOpenB(false), 150)}
                    className="input-ui"
                    placeholder={t("summary.locationPlaceholder")}
                  />
                  {areaDropdownOpenB && filteredAreas.length > 0 && (
                    <div className="mt-2 overflow-hidden rounded-xl border border-[var(--glass-border)] bg-[color:var(--glass-bg)] shadow-2xl">
                      <ul className="max-h-72 overflow-auto py-1 text-sm">
                        {filteredAreas.map((it) => (
                          <li key={it.id}>
                            <button
                              type="button"
                              className="w-full px-3 py-2 text-left hover:bg-[color:var(--glass-bg-strong)]"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => {
                                setAreaIdB(String(it.id));
                                setAreaQueryB(it.name);
                                setAreaDropdownOpenB(false);
                              }}
                            >
                              <span className="font-medium">{it.name}</span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </label>
              </div>
            </div>
          </div>

          {compareA && compareB && (
            <>
              <div className="grid gap-6 lg:grid-cols-2">
                <div className="grid gap-4">
                  <div className="surface-glass-sm p-3 font-semibold">{t("summary.segmentA")}</div>
                  <SummaryView summary={compareA} />
                </div>
                <div className="grid gap-4">
                  <div className="surface-glass-sm p-3 font-semibold">{t("summary.segmentB")}</div>
                  <SummaryView summary={compareB} />
                </div>
              </div>

              {compareA.coverage && compareB.coverage && (
                <div className="grid gap-6 lg:grid-cols-2">
                  <DiffTable
                    title={t("summary.diff.skillsTitle")}
                    aLabel={t("summary.segmentA")}
                    bLabel={t("summary.segmentB")}
                    aItems={compareA.top_skills}
                    bItems={compareB.top_skills}
                    aSuccessful={compareA.coverage.successful}
                    bSuccessful={compareB.coverage.successful}
                  />
                  <DiffTable
                    title={t("summary.diff.keywordsTitle")}
                    aLabel={t("summary.segmentA")}
                    bLabel={t("summary.segmentB")}
                    aItems={compareA.top_keywords}
                    bItems={compareB.top_keywords}
                    aSuccessful={compareA.coverage.successful}
                    bSuccessful={compareB.coverage.successful}
                  />
                </div>
              )}
            </>
          )}
        </section>
      )}

      {viewMode === "comparePeriod" && (
        <section className="mt-6 grid gap-6 sm:mt-10">
          <h2 className="text-base font-semibold lg:text-lg">{t("summary.comparePeriod.title")}</h2>
          {comparePeriod.length > 0 && (
            <div className="card-soft glass-shine p-4 sm:p-5">
              <h3 className="font-semibold">{t("summary.comparePeriod.sparklinesTitle")}</h3>
              <div className="mt-4 grid gap-4 sm:grid-cols-3">
                <div className="surface-glass-sm p-3">
                  <p className="text-xs text-[var(--muted)]">{t("summary.comparePeriod.metricKeySkillsRate")}</p>
                  <Sparkline values={comparePeriod.map((r) => (r.summary.coverage?.key_skills_rate ?? 0) * 100)} />
                </div>
                <div className="surface-glass-sm p-3">
                  <p className="text-xs text-[var(--muted)]">{t("summary.comparePeriod.metricErrors")}</p>
                  <Sparkline values={comparePeriod.map((r) => r.summary.errors)} />
                </div>
                <div className="surface-glass-sm p-3">
                  <p className="text-xs text-[var(--muted)]">{t("summary.comparePeriod.metricEmptyDesc")}</p>
                  <Sparkline values={comparePeriod.map((r) => r.summary.coverage?.without_description ?? 0)} />
                </div>
              </div>
              <p className="mt-3 text-xs text-[var(--muted)]">
                {t("summary.comparePeriod.periodsNote")}
              </p>
            </div>
          )}

          {comparePeriod.length > 0 && (
            <div className="grid gap-6 lg:grid-cols-3">
              {comparePeriod.map((row) => (
                <div key={row.period} className="grid gap-4">
                  <div className="surface-glass-sm p-3">
                    <p className="text-xs text-[var(--muted)]">{t("summary.comparePeriod.periodLabel")}</p>
                    <p className="mt-1 font-semibold tabular-nums">{row.period}</p>
                  </div>
                  <SummaryView summary={row.summary} />
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </section>
  );
}

