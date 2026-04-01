"use client";

export function LongRunningProgress({
  visible,
  label,
  variant,
  done,
  total,
  onCancel,
  cancelLabel,
}: {
  visible: boolean;
  label: string;
  variant: "indeterminate" | "determinate";
  done?: number;
  total?: number;
  onCancel?: () => void;
  cancelLabel?: string;
}) {
  if (!visible) return null;

  const pct =
    variant === "determinate" && typeof done === "number" && typeof total === "number" && total > 0
      ? Math.max(0, Math.min(100, Math.round((done / total) * 100)))
      : null;

  return (
    <div className="surface-glass-sm mt-3 flex flex-col gap-2 rounded-xl p-3">
      <style>{`
        @keyframes hhProgressSlide {
          0% { transform: translateX(-120%); }
          100% { transform: translateX(320%); }
        }
      `}</style>
      <div className="flex items-center justify-between gap-3">
        <span className="min-w-0 truncate text-sm font-medium text-[var(--text)]" title={label}>
          {label}
        </span>
        {onCancel && (
          <button type="button" className="btn-soft px-3 py-2 text-xs font-semibold" onClick={onCancel}>
            {cancelLabel ?? "Cancel"}
          </button>
        )}
      </div>

      <div
        className="h-2 overflow-hidden rounded-full border border-[var(--glass-border)] bg-[color:var(--glass-bg-strong)]"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct ?? undefined}
      >
        {variant === "determinate" && pct != null ? (
          <div className="h-full rounded-full bg-[var(--primary)]" style={{ width: `${pct}%` }} />
        ) : (
          <div className="relative h-full w-full">
            <div
              className="absolute left-0 top-0 h-full w-1/3 rounded-full bg-[var(--primary)]"
              style={{ animation: "hhProgressSlide 1.1s ease-in-out infinite" }}
            />
          </div>
        )}
      </div>

      {variant === "determinate" && typeof done === "number" && typeof total === "number" && (
        <div className="text-xs tabular-nums text-[var(--muted)]">
          {done} / {total}
        </div>
      )}
    </div>
  );
}

