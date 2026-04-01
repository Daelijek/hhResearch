"use client";

import { useMemo } from "react";
import { useI18n } from "@/lib/i18n";

type Item = { name: string; count: number };

function index(items: Item[]) {
  const m = new Map<string, number>();
  for (const it of items) m.set(it.name, it.count);
  return m;
}

export function DiffTable({
  title,
  aLabel,
  bLabel,
  aItems,
  bItems,
  aSuccessful,
  bSuccessful,
}: {
  title: string;
  aLabel: string;
  bLabel: string;
  aItems: Item[];
  bItems: Item[];
  aSuccessful: number;
  bSuccessful: number;
}) {
  const { t } = useI18n();

  const rows = useMemo(() => {
    const a = index(aItems.slice(0, 50));
    const b = index(bItems.slice(0, 50));
    const names = new Set<string>([...a.keys(), ...b.keys()]);
    const out = [...names].map((name) => {
      const ac = a.get(name) ?? 0;
      const bc = b.get(name) ?? 0;
      const ash = aSuccessful > 0 ? ac / aSuccessful : 0;
      const bsh = bSuccessful > 0 ? bc / bSuccessful : 0;
      return { name, ac, bc, dCount: ac - bc, dShare: ash - bsh };
    });
    out.sort((x, y) => Math.abs(y.dShare) - Math.abs(x.dShare));
    return out.slice(0, 20);
  }, [aItems, bItems, aSuccessful, bSuccessful]);

  return (
    <section className="card-soft glass-shine anim-fade-up p-4 sm:p-5">
      <h2 className="text-base font-semibold lg:text-lg">{title}</h2>
      <p className="mt-1 text-xs text-[var(--muted)]">{t("summary.diff.note")}</p>

      <div className="mt-4 overflow-x-auto rounded-xl border border-[var(--glass-border)] bg-[color:var(--glass-bg-strong)]">
        <table className="min-w-full text-sm">
          <thead className="text-xs text-[var(--muted)]">
            <tr>
              <th className="px-3 py-2 text-left">{t("summary.diff.name")}</th>
              <th className="px-3 py-2 text-right tabular-nums">{aLabel}</th>
              <th className="px-3 py-2 text-right tabular-nums">{bLabel}</th>
              <th className="px-3 py-2 text-right tabular-nums">{t("summary.diff.deltaShare")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const sign = r.dShare >= 0 ? "+" : "";
              const pct = `${sign}${(r.dShare * 100).toFixed(1)}%`;
              return (
                <tr key={r.name} className="border-t border-[var(--glass-border)]">
                  <td className="px-3 py-2 min-w-[260px]">
                    <span className="font-medium" title={r.name}>
                      {r.name}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{r.ac}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{r.bc}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-[var(--muted)]">{pct}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

