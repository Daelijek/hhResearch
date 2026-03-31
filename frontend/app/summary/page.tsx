"use client";

import { useEffect, useMemo, useState } from "react";
import type { ExportSummary } from "@/lib/export-history";
import { useI18n } from "@/lib/i18n";
import { SummaryView } from "@/components/summary/summary-view";

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

  const [queriesText, setQueriesText] = useState("frontend developer\nfullstack developer");
  const [pages, setPages] = useState(2);
  const [perPage, setPerPage] = useState(100);
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

  const filteredAreas = useMemo(() => {
    const q = areaQuery.trim().toLowerCase();
    if (!q) return areaOptions.slice(0, 12);
    return areaOptions.filter((a) => a.name.toLowerCase().includes(q)).slice(0, 12);
  }, [areaOptions, areaQuery]);

  async function runSummary() {
    setError(null);
    setSummary(null);

    if (!baseUrl) {
      setError(t("form.errNoUrl"));
      return;
    }

    const queries = linesFromTextarea(queriesText);
    if (queries.length === 0) {
      setError(t("form.errNoAuto"));
      return;
    }

    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (apiKey.trim()) headers["X-API-Key"] = apiKey.trim();

    const body: Record<string, unknown> = {
      queries,
      pages,
      per_page: perPage,
      kw_top_n: kwTopN,
      kw_max_ngram: kwMaxNgram,
      sleep_s: sleepS,
      search_sleep_s: searchSleepS,
      ...(periodDays !== "" ? { period: periodDays } : {}),
      ...(hhToken.trim() ? { token: hhToken.trim() } : {}),
      ...(employerId ? { employer_id: employerId } : {}),
      ...(experienceId ? { experience: experienceId } : {}),
      ...(areaId ? { area: areaId } : {}),
    };

    setBusy(true);
    try {
      const resp = await fetch(`${baseUrl}/api/v1/summary/auto`, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
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
          setError(t("form.errTooManyVacancies", { search_count, max }));
          return;
        }
        if (code === "search_failed") {
          setError(t("form.errSearchFailed"));
          return;
        }
        setError(apiErr.message || resp.statusText || "Unknown error");
        return;
      }
      const json = (await resp.json()) as any;
      const s = json?.summary as ExportSummary | undefined;
      if (!s) {
        setError("Bad response: missing summary");
        return;
      }
      setSummary(s);
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
                  onChange={(e) => setPages(Number(e.target.value))}
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
                  onChange={(e) => setPerPage(Number(e.target.value))}
                  className="input-ui"
                />
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="form-field relative">
                <span className="form-label inline-flex items-center">{t("summary.companyLabel")}</span>
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
                <span className="form-label inline-flex items-center">{t("summary.levelLabel")}</span>
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
              <span className="form-label inline-flex items-center">{t("summary.locationLabel")}</span>
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
              onClick={() => void runSummary()}
            >
              {busy ? t("summary.btnBusy") : t("summary.btnReady")}
            </button>
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

      {summary && (
        <section className="mt-6 sm:mt-10">
          <SummaryView summary={summary} />
        </section>
      )}
    </section>
  );
}

