"use client";

import { useMemo, useState } from "react";
import { useI18n } from "@/lib/i18n";

function toCsv(rows: string[][]): string {
  const esc = (v: string) => {
    const needs = /[",\n\r]/.test(v);
    const inner = v.replace(/"/g, '""');
    return needs ? `"${inner}"` : inner;
  };
  return rows.map((r) => r.map((c) => esc(c)).join(",")).join("\n");
}

function toTsv(rows: string[][]): string {
  return rows.map((r) => r.join("\t")).join("\n");
}

function downloadText(filename: string, text: string, mime: string) {
  const blob = new Blob([text], { type: mime });
  const href = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(href);
}

export function TopTable({
  title,
  items,
  successful,
  filenameStem,
}: {
  title: string;
  items: Array<{ name: string; count: number }>;
  successful: number;
  filenameStem: string;
}) {
  const { t } = useI18n();
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    const base = items.slice(0, 20);
    if (!query) return base;
    return base.filter((it) => it.name.toLowerCase().includes(query));
  }, [items, q]);

  const rows = useMemo(() => {
    const header = [t("summary.table.rank"), t("summary.table.name"), t("summary.table.count"), t("summary.table.share")];
    const body = filtered.map((it, i) => {
      const share = successful > 0 ? (it.count / successful) * 100 : 0;
      return [String(i + 1), it.name, String(it.count), `${share.toFixed(1)}%`];
    });
    return [header, ...body];
  }, [filtered, successful, t]);

  async function copyTsv() {
    const text = toTsv(rows);
    await navigator.clipboard.writeText(text);
  }

  return (
    <section className="card-soft glass-shine anim-fade-up p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-base font-semibold lg:text-lg">{title}</h2>
          <p className="mt-1 text-xs text-[var(--muted)]">
            {t("summary.table.note", { n: String(Math.min(20, items.length)) })}
          </p>
        </div>
        <div className="flex flex-wrap items-stretch gap-2">
          <button type="button" className="btn-soft px-3 py-2 text-xs font-semibold" onClick={() => void copyTsv()}>
            {t("summary.table.copy")}
          </button>
          <button
            type="button"
            className="btn-soft px-3 py-2 text-xs font-semibold"
            onClick={() => downloadText(`${filenameStem}.csv`, toCsv(rows), "text/csv;charset=utf-8")}
          >
            {t("summary.table.csv")}
          </button>
        </div>
      </div>

      <div className="mt-4 grid gap-2">
        <label className="form-field">
          <span className="form-label">{t("summary.table.search")}</span>
          <input value={q} onChange={(e) => setQ(e.target.value)} className="input-ui" placeholder={t("summary.table.searchPh")} />
        </label>
      </div>

      <div className="mt-4 overflow-x-auto rounded-xl border border-[var(--glass-border)] bg-[color:var(--glass-bg-strong)]">
        <table className="min-w-full text-sm">
          <thead className="text-xs text-[var(--muted)]">
            <tr>
              <th className="px-3 py-2 text-left">{t("summary.table.rank")}</th>
              <th className="px-3 py-2 text-left">{t("summary.table.name")}</th>
              <th className="px-3 py-2 text-right">{t("summary.table.count")}</th>
              <th className="px-3 py-2 text-right">{t("summary.table.share")}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td className="px-3 py-3 text-[var(--muted)]" colSpan={4}>
                  {t("summary.table.empty")}
                </td>
              </tr>
            ) : (
              filtered.map((it, i) => {
                const share = successful > 0 ? (it.count / successful) * 100 : 0;
                return (
                  <tr key={it.name} className="border-t border-[var(--glass-border)]">
                    <td className="px-3 py-2 tabular-nums text-[var(--muted)]">{i + 1}</td>
                    <td className="px-3 py-2 min-w-[260px]">
                      <span className="font-medium" title={it.name}>
                        {it.name}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">{it.count}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-[var(--muted)]">{share.toFixed(1)}%</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

