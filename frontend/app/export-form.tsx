"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { createPortal } from "react-dom";
import {
  mergeExportPreset,
  pushExportHistory,
  type ExportFormPreset,
  type ExportSummary,
} from "./export-history";
import { useI18n } from "./i18n";

function TooltipIcon({ text, alt }: { text: string; alt: string }) {
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ left: number; top: number; maxWidth: number } | null>(null);

  function updatePosition() {
    const el = btnRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const margin = 12;
    const maxWidth = Math.min(360, Math.max(220, window.innerWidth - margin * 2));
    const desiredLeft = r.left + r.width / 2;
    const clampedLeft = Math.max(margin, Math.min(window.innerWidth - margin, desiredLeft));
    setPos({ left: clampedLeft, top: r.bottom + 10, maxWidth });
  }

  useEffect(() => {
    if (!open) return;
    updatePosition();
    const onScroll = () => updatePosition();
    const onResize = () => updatePosition();
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
    };
  }, [open]);

  return (
    <span className="relative inline-flex items-center align-middle">
      <button
        type="button"
        className="ml-1 inline-flex h-5 w-5 items-center justify-center rounded-md border border-[var(--glass-border)] bg-[color:var(--glass-bg-strong)] hover:bg-[color:var(--glass-bg)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
        aria-label={alt}
        ref={btnRef}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
      >
        <Image src="/tooltip.png" alt="" width={14} height={14} className="hh-tooltip-icon" />
      </button>
      {open &&
        typeof document !== "undefined" &&
        pos &&
        createPortal(
          <div
            role="tooltip"
            style={{
              position: "fixed",
              left: pos.left,
              top: pos.top,
              transform: "translateX(-50%)",
              width: `min(${pos.maxWidth}px, 80vw)`,
              zIndex: 1000,
              pointerEvents: "none",
              border: "1px solid var(--glass-border)",
              background: "var(--glass-bg-strong)",
              color: "var(--text)",
              borderRadius: "0.75rem",
              padding: "0.75rem",
              fontSize: "0.75rem",
              lineHeight: "1.25rem",
              boxShadow: "0 14px 40px rgba(0,0,0,0.18)",
              backdropFilter: "blur(var(--glass-blur-sm)) saturate(var(--glass-sat))",
              WebkitBackdropFilter: "blur(var(--glass-blur-sm)) saturate(var(--glass-sat))",
            }}
          >
            {text}
          </div>,
          document.body
        )}
    </span>
  );
}

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

function decodeBase64UrlUtf8(input: string): string {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(input.length / 4) * 4, "=");
  const bin = atob(padded);
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function parseApiErrorText(text: string): { code?: string; message?: string; vars?: Record<string, unknown> } {
  try {
    const json = JSON.parse(text);
    // FastAPI usually wraps our body as { detail: ... }
    const detail = json?.detail;
    if (detail && typeof detail === "object") {
      const code = typeof detail.error === "string" ? detail.error : undefined;
      const message = typeof detail.message === "string" ? detail.message : undefined;
      return { code, message, vars: detail };
    }
    if (typeof detail === "string") {
      return { message: detail };
    }
    if (typeof json?.detail?.message === "string") {
      return { message: json.detail.message };
    }
    return { message: text };
  } catch {
    return { message: text };
  }
}

export function ExportForm({
  onSummary,
  onHistoryChange,
  initialPreset,
}: {
  onSummary?: (summary: ExportSummary | null) => void;
  onHistoryChange?: () => void;
  initialPreset?: ExportFormPreset | null;
}) {
  const { t } = useI18n();
  const baseUrl = useMemo(() => process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "", []);
  const seed = mergeExportPreset(initialPreset ?? undefined);

  const [mode, setMode] = useState<"manual" | "auto">(seed.mode);
  const [manualLines, setManualLines] = useState(seed.manualLines);
  const [queriesText, setQueriesText] = useState(seed.queriesText);
  const [pages, setPages] = useState(seed.pages);
  const [perPage, setPerPage] = useState(seed.perPage);
  const [kwTopN, setKwTopN] = useState(seed.kwTopN);
  const [kwMaxNgram, setKwMaxNgram] = useState(seed.kwMaxNgram);
  const [sleepS, setSleepS] = useState(seed.sleepS);
  const [searchSleepS, setSearchSleepS] = useState(seed.searchSleepS);
  const [hhToken, setHhToken] = useState("");
  const [apiKey, setApiKey] = useState(() => process.env.NEXT_PUBLIC_API_KEY ?? "");

  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statsStatus, setStatsStatus] = useState<"idle" | "ok" | "missing" | "bad">("idle");

  async function doExport() {
    setError(null);
    setMessage(null);
    setStatsStatus("idle");

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
      const summaryHeader = response.headers.get("X-Export-Summary");
      if (!response.ok) {
        const text = await response.text();
        const apiErr = parseApiErrorText(text);

        const code = apiErr.code;
        const vars = apiErr.vars ?? {};
        const messageFallback = apiErr.message || response.statusText || "Unknown error";

        if (code === "too_many_vacancies") {
          const search_countVal = vars["search_count"];
          const maxVal = vars["max"];
          const search_count = typeof search_countVal === "number" ? String(search_countVal) : undefined;
          const max = typeof maxVal === "number" ? String(maxVal) : undefined;
          setError(
            t("form.errTooManyVacancies", {
              search_count: search_count ?? "0",
              max: max ?? "0",
            })
          );
          return;
        }

        if (code === "invalid_vacancy_ref") {
          setError(t("form.errInvalidVacancyRef"));
          return;
        }

        if (code === "search_failed") {
          setError(t("form.errSearchFailed"));
          return;
        }

        if (code === "export_failed") {
          setError(t("form.errExportFailed"));
          return;
        }

        setError(messageFallback);
        return;
      }

      let parsedSummary: ExportSummary | null = null;
      if (onSummary) {
        try {
          if (summaryHeader) {
            const jsonText = decodeBase64UrlUtf8(summaryHeader);
            parsedSummary = JSON.parse(jsonText) as ExportSummary;
            onSummary(parsedSummary);
            setStatsStatus("ok");
          } else {
            onSummary(null);
            setStatsStatus("missing");
          }
        } catch {
          onSummary(null);
          setStatsStatus(summaryHeader ? "bad" : "missing");
        }
      }

      const blob = await response.blob();
      const fileName = filenameFromContentDisposition(response.headers.get("Content-Disposition"));
      const href = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = href;
      anchor.download = fileName;
      anchor.click();
      URL.revokeObjectURL(href);

      if (parsedSummary) {
        pushExportHistory({
          mode,
          warnings: warnings ? Number(warnings) : null,
          fileName,
          summary: {
            requested: parsedSummary.requested,
            processed: parsedSummary.processed,
            errors: parsedSummary.errors,
          },
          preset: mergeExportPreset({
            mode,
            manualLines,
            queriesText,
            pages,
            perPage,
            kwTopN,
            kwMaxNgram,
            sleepS,
            searchSleepS,
          }),
        });
        onHistoryChange?.();
      }

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await doExport();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6" aria-label={t("analyze.title")}>
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
        <legend className="mb-2 inline-flex items-center text-sm font-medium text-[var(--muted)]">
          {t("form.modeLegend")}
          <TooltipIcon
            text={mode === "manual" ? t("form.modeHelpManual") : t("form.modeHelpAuto")}
            alt={t("form.tooltipAlt")}
          />
        </legend>
        <label className="surface-glass-sm anim-fade-up flex cursor-pointer items-center gap-2 p-3 text-sm">
          <input
            type="radio"
            checked={mode === "manual"}
            onChange={() => setMode("manual")}
            className="accent-[var(--primary)]"
          />
          {t("form.modeManual")}
        </label>
        <label className="surface-glass-sm anim-fade-up flex cursor-pointer items-center gap-2 p-3 text-sm">
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
          <span className="form-label inline-flex items-center">
            {t("form.manualLabel")}
            <TooltipIcon text={t("form.manualLabelHelp")} alt={t("form.tooltipAlt")} />
          </span>
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
            <span className="form-label inline-flex items-center">
              {t("form.autoLabel")}
              <TooltipIcon text={t("form.autoLabelHelp")} alt={t("form.tooltipAlt")} />
            </span>
            <textarea
              value={queriesText}
              onChange={(e) => setQueriesText(e.target.value)}
              className="input-ui min-h-28"
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
                onChange={(e) => setPages(Number(e.target.value))}
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
                onChange={(e) => setPerPage(Number(e.target.value))}
                className="input-ui"
              />
            </label>
          </div>
        </section>
      )}

      <section className="grid gap-4 md:grid-cols-2">
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
        {mode === "auto" && (
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
        )}
      </section>

      <section className="grid gap-4 md:grid-cols-2">
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
      </section>

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
        type="button"
        disabled={busy}
        className="btn-primary w-full px-5 py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
        onClick={() => void doExport()}
      >
        {busy ? t("form.btnBusy") : t("form.btnReady")}
      </button>

      {statsStatus !== "idle" && (
        <p className="text-xs text-[var(--muted)]">
          Stats: {statsStatus === "ok" ? "received" : statsStatus === "missing" ? "missing from API response" : "failed to parse"}
        </p>
      )}
    </form>
  );
}
