"use client";

import { useMemo } from "react";
import { useI18n } from "@/lib/i18n";

type Slice = {
  key: string;
  label: string;
  value: number;
  color: string;
};

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180.0;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function arcPath(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArc = endAngle - startAngle <= 180 ? "0" : "1";
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y}`;
}

export function CoverageDonut({
  title,
  successful,
  withKeySkills,
  withoutKeySkills,
  emptyDescription,
  errors,
}: {
  title: string;
  successful: number;
  withKeySkills: number;
  withoutKeySkills: number;
  emptyDescription: number;
  errors: number;
}) {
  const { t } = useI18n();

  const slices = useMemo<Slice[]>(() => {
    return [
      { key: "withKeySkills", label: t("summary.donut.withKeySkills"), value: withKeySkills, color: "var(--primary)" },
      { key: "noKeySkills", label: t("summary.donut.noKeySkills"), value: withoutKeySkills, color: "color-mix(in srgb, var(--text), transparent 55%)" },
      { key: "emptyDescription", label: t("summary.donut.emptyDescription"), value: emptyDescription, color: "var(--warning-text)" },
      { key: "errors", label: t("summary.donut.errors"), value: errors, color: "var(--error-text)" },
    ].filter((s) => s.value > 0);
  }, [t, withKeySkills, withoutKeySkills, emptyDescription, errors]);

  const total = Math.max(0, successful) + Math.max(0, errors);

  const arcs = useMemo(() => {
    if (total <= 0 || slices.length === 0) return [];
    let angle = 0;
    return slices.map((s) => {
      const portion = s.value / total;
      const sweep = portion * 360;
      const start = angle;
      const end = angle + sweep;
      angle = end;
      return { ...s, startAngle: start, endAngle: end };
    });
  }, [slices, total]);

  const size = 140;
  const cx = size / 2;
  const cy = size / 2;
  const r = 52;
  const stroke = 14;

  return (
    <section className="card-soft glass-shine anim-fade-up p-4 sm:p-5">
      <h2 className="text-base font-semibold lg:text-lg">{title}</h2>
      {total <= 0 ? (
        <p className="mt-3 text-sm text-[var(--muted)] lg:text-base">-</p>
      ) : (
        <div className="mt-4 grid gap-4 sm:grid-cols-[160px_1fr] sm:items-center">
          <div className="surface-glass-sm flex items-center justify-center rounded-2xl p-3">
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={title}>
              <circle
                cx={cx}
                cy={cy}
                r={r}
                fill="none"
                stroke="color-mix(in srgb, var(--glass-border-strong), transparent 20%)"
                strokeWidth={stroke}
              />
              {arcs.map((a) => (
                <path
                  key={a.key}
                  d={arcPath(cx, cy, r, a.startAngle, a.endAngle)}
                  fill="none"
                  stroke={a.color}
                  strokeWidth={stroke}
                  strokeLinecap="round"
                />
              ))}
              <circle cx={cx} cy={cy} r={r - stroke / 2} fill="none" />
              <text x={cx} y={cy - 4} textAnchor="middle" fontSize="18" fontWeight="700" fill="var(--text)">
                {successful}
              </text>
              <text x={cx} y={cy + 16} textAnchor="middle" fontSize="10" fill="var(--muted)">
                {t("summary.donut.successful")}
              </text>
            </svg>
          </div>

          <div className="grid gap-2 text-sm">
            {slices.map((s) => {
              const pct = total ? (s.value / total) * 100 : 0;
              return (
                <div key={s.key} className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: s.color }} />
                    <span className="min-w-0 truncate text-[var(--muted)]" title={s.label}>
                      {s.label}
                    </span>
                  </div>
                  <div className="shrink-0 tabular-nums font-medium">
                    {s.value} <span className="text-[var(--muted)]">({pct.toFixed(1)}%)</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}

