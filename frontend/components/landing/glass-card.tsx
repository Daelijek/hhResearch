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
        shine
          ? "landing-glass-card card-soft glass-shine anim-fade-up p-5 lg:p-6"
          : "landing-glass-card card-soft anim-fade-up p-5 lg:p-6"
      }
    >
      <span className="landing-glass-card__wash" aria-hidden />
      <div className="landing-glass-card__body">
        {leading}
        <h3 className="mt-3 text-base font-semibold leading-snug text-[var(--text)] lg:text-lg">
          {title}
        </h3>
        <p className="mt-2 text-sm leading-6 text-[var(--muted)] lg:mt-2.5 lg:text-base lg:leading-7">
          {description}
        </p>
      </div>
      <span className="landing-glass-card__shine-line" aria-hidden />
    </article>
  );
}
