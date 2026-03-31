"use client";

export function HorizontalBarList({
  title,
  items,
  maxItems = 20,
}: {
  title: string;
  items: Array<{ name: string; count: number }>;
  maxItems?: number;
}) {
  const top = items.slice(0, maxItems);
  const max = top[0]?.count ?? 0;

  return (
    <section className="card-soft glass-shine anim-fade-up p-4 sm:p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-base font-semibold lg:text-lg">{title}</h2>
        <span className="text-xs text-[var(--muted)] tabular-nums">{top.length}/{items.length}</span>
      </div>

      {top.length === 0 ? (
        <p className="mt-3 text-sm text-[var(--muted)] lg:text-base">-</p>
      ) : (
        <ol className="mt-4 grid gap-2">
          {top.map((it, idx) => {
            const pct = max ? Math.max(2, Math.round((it.count / max) * 100)) : 0;
            return (
              <li key={it.name} className="grid grid-cols-[28px_1fr_56px] items-center gap-3">
                <span className="text-xs tabular-nums text-[var(--muted)]">{idx + 1}</span>
                <div className="min-w-0">
                  <div className="flex items-center justify-between gap-3">
                    <span className="min-w-0 truncate text-sm font-medium" title={it.name}>
                      {it.name}
                    </span>
                    <span className="shrink-0 text-xs tabular-nums text-[var(--muted)]">{it.count}</span>
                  </div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full border border-[var(--glass-border)] bg-[color:var(--glass-bg-strong)]">
                    <div className="h-full rounded-full bg-[var(--primary)]" style={{ width: `${pct}%` }} />
                  </div>
                </div>
                <span className="text-xs tabular-nums text-[var(--muted)] text-right">{max ? ((it.count / max) * 100).toFixed(0) : "0"}%</span>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}

