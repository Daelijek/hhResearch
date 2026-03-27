"use client";

import { useMemo, useState } from "react";
import { useI18n } from "./i18n";

function filenameFromContentDisposition(header: string | null): string {
  if (!header) return "hh_export.xlsx";
  const quoted = header.match(/filename="([^"]+)"/i);
  if (quoted?.[1]) return quoted[1];
  const plain = header.match(/filename=([^;\s]+)/i);
  if (plain?.[1]) return plain[1].replace(/"/g, "");
  return "hh_export.xlsx";
}

function linesFromTextarea(value: string): string[] {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

export function ExportForm() {
  const { t } = useI18n();
  const baseUrl = useMemo(() => process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "", []);

  const [mode, setMode] = useState<"manual" | "auto">("manual");
  const [manualLines, setManualLines] = useState("");
  const [queriesText, setQueriesText] = useState("frontend developer\nfullstack developer");
  const [pages, setPages] = useState(2);
  const [perPage, setPerPage] = useState(100);
  const [kwTopN, setKwTopN] = useState(30);
  const [kwMaxNgram, setKwMaxNgram] = useState(3);
  const [sleepS, setSleepS] = useState(0.2);
  const [searchSleepS, setSearchSleepS] = useState(0.2);
  const [hhToken, setHhToken] = useState("");
  const [apiKey, setApiKey] = useState(() => process.env.NEXT_PUBLIC_API_KEY ?? "");

  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (!baseUrl) {
      setError(t("form.errNoUrl"));
      return;
    }

    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (apiKey.trim()) headers["X-API-Key"] = apiKey.trim();

    let url = `${baseUrl}/api/v1/export/manual`;
    let body: Record<string, unknown>;

    if (mode === "manual") {
      const vacancyIdsOrUrls = linesFromTextarea(manualLines);
      if (vacancyIdsOrUrls.length === 0) {
        setError(t("form.errNoManual"));
        return;
      }
      body = {
        vacancy_ids_or_urls: vacancyIdsOrUrls,
        kw_top_n: kwTopN,
        kw_max_ngram: kwMaxNgram,
        sleep_s: sleepS,
        ...(hhToken.trim() ? { token: hhToken.trim() } : {}),
      };
    } else {
      url = `${baseUrl}/api/v1/export/auto`;
      const queries = linesFromTextarea(queriesText);
      if (queries.length === 0) {
        setError(t("form.errNoAuto"));
        return;
      }
      body = {
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

    setBusy(true);
    try {
      const response = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });

      const warnings = response.headers.get("X-Export-Warnings");
      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || response.statusText);
      }

      const blob = await response.blob();
      const fileName = filenameFromContentDisposition(response.headers.get("Content-Disposition"));
      const href = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = href;
      anchor.download = fileName;
      anchor.click();
      URL.revokeObjectURL(href);

      setMessage(
        warnings
          ? t("form.successWarn", { n: warnings })
          : t("form.success")
      );
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : String(caughtError));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-6" aria-label={t("analyze.title")}>
      {!baseUrl && (
        <p
          className="rounded-xl border px-4 py-3 text-sm"
          style={{
            background: "var(--warning-bg)",
            color: "var(--warning-text)",
            borderColor: "#ffd8a3",
          }}
        >
          {t("form.noApiUrl")}
        </p>
      )}

      <fieldset className="grid gap-3 sm:grid-cols-2">
        <legend className="mb-2 text-sm font-medium text-[var(--muted)]">{t("form.modeLegend")}</legend>
        <label className="card-soft flex cursor-pointer items-center gap-2 p-3 text-sm">
          <input
            type="radio"
            checked={mode === "manual"}
            onChange={() => setMode("manual")}
            className="accent-[var(--primary)]"
          />
          {t("form.modeManual")}
        </label>
        <label className="card-soft flex cursor-pointer items-center gap-2 p-3 text-sm">
          <input
            type="radio"
            checked={mode === "auto"}
            onChange={() => setMode("auto")}
            className="accent-[var(--primary)]"
          />
          {t("form.modeAuto")}
        </label>
      </fieldset>

      {mode === "manual" ? (
        <label className="form-field">
          <span className="form-label">{t("form.manualLabel")}</span>
          <textarea
            value={manualLines}
            onChange={(e) => setManualLines(e.target.value)}
            placeholder="131474430&#10;https://hh.ru/vacancy/131234053"
            className="input-ui min-h-40 font-mono text-sm"
            spellCheck={false}
          />
        </label>
      ) : (
        <section className="grid gap-4">
          <label className="form-field">
            <span className="form-label">{t("form.autoLabel")}</span>
            <textarea
              value={queriesText}
              onChange={(e) => setQueriesText(e.target.value)}
              className="input-ui min-h-28"
              spellCheck={false}
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="form-field">
              <span className="form-label">{t("form.pages")}</span>
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
              <span className="form-label">{t("form.perPage")}</span>
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
        </section>
      )}

      <section className="grid gap-4 md:grid-cols-2">
        <label className="form-field">
          <span className="form-label">{t("form.kwTopN")}</span>
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
          <span className="form-label">{t("form.kwMaxNgram")}</span>
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
          <span className="form-label">{t("form.sleep")}</span>
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
        {mode === "auto" && (
          <label className="form-field">
            <span className="form-label">{t("form.searchSleep")}</span>
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
        )}
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <label className="form-field">
          <span className="form-label">{t("form.hhToken")}</span>
          <input
            type="password"
            value={hhToken}
            onChange={(e) => setHhToken(e.target.value)}
            className="input-ui"
            autoComplete="off"
          />
        </label>
        <label className="form-field">
          <span className="form-label">{t("form.apiKey")}</span>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            className="input-ui"
            autoComplete="off"
          />
        </label>
      </section>

      {error && (
        <p
          className="rounded-xl border px-4 py-3 text-sm whitespace-pre-wrap"
          style={{
            background: "var(--error-bg)",
            color: "var(--error-text)",
            borderColor: "#ffd0d4",
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
            borderColor: "#bdeacb",
          }}
        >
          {message}
        </p>
      )}

      <button
        type="submit"
        disabled={busy}
        className="rounded-xl bg-[var(--primary)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--primary-700)] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy ? t("form.btnBusy") : t("form.btnReady")}
      </button>
    </form>
  );
}
