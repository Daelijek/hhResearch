"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { createPortal } from "react-dom";

export function TooltipIcon({ text, alt }: { text: string; alt: string }) {
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
