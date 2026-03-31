import type { ReactNode } from "react";

type Props = {
  leading: ReactNode;
  title: string;
  description: string;
  /** Совпадает с блоком «Как пользоваться отчётом» */
  shine?: boolean;
};

export function LandingGlassCard({ leading, title, description, shine = false }: Props) {
  return (
    <article
      className={
        shine ? "card-soft glass-shine anim-fade-up p-5" : "card-soft anim-fade-up p-5"
      }
    >
      {leading}
      <h3 className="mt-3 text-base font-semibold leading-snug text-[var(--text)]">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{description}</p>
    </article>
  );
}
