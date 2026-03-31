type Translate = (key: string, vars?: Record<string, string>) => string;

export function LandingExcelPreview({ t }: { t: Translate }) {
  return (
    <aside className="card-soft anim-fade-up p-4 sm:p-6 md:p-8 lg:p-9">
      <h2 className="text-lg font-semibold lg:text-xl">{t("landing.previewTitle")}</h2>
      <p className="mt-2 text-sm text-[var(--muted)] lg:text-base">{t("landing.previewSubtitle")}</p>
      <div className="mt-5 overflow-x-auto overscroll-x-contain rounded-xl border border-[var(--glass-border)] bg-[color:var(--glass-bg-strong)]">
        <table className="min-w-[720px] w-full border-collapse text-left text-xs lg:text-sm">
          <thead>
            <tr className="text-[10px] uppercase tracking-wide text-[var(--muted)] lg:text-xs">
              <th className="px-3 py-2 font-semibold">{t("landing.colTitle")}</th>
              <th className="px-3 py-2 font-semibold">{t("landing.colKeywords")}</th>
              <th className="px-3 py-2 font-semibold">{t("landing.colSkills")}</th>
              <th className="px-3 py-2 font-semibold">
                <span className="rounded-md bg-[color:var(--warning-bg)] px-2 py-1 text-[color:var(--warning-text)]">
                  {t("landing.colUniqueKeywords")}
                </span>
              </th>
              <th className="px-3 py-2 font-semibold">
                <span className="rounded-md bg-[color:var(--warning-bg)] px-2 py-1 text-[color:var(--warning-text)]">
                  {t("landing.colUniqueSkills")}
                </span>
              </th>
            </tr>
          </thead>
          <tbody className="text-[var(--text)]">
            <tr className="border-t border-[var(--glass-border)]">
              <td className="px-3 py-2">
                <span className="font-medium">{t("landing.row1Title")}</span>
              </td>
              <td className="px-3 py-2">{t("landing.row1Keyword")}</td>
              <td className="px-3 py-2">{t("landing.row1Skill")}</td>
              <td className="px-3 py-2">{t("landing.row1UniqueKeyword")}</td>
              <td className="px-3 py-2">{t("landing.row1UniqueSkill")}</td>
            </tr>
            <tr className="border-t border-[var(--glass-border)]">
              <td className="px-3 py-2 text-[var(--muted)]">{t("landing.row2Title")}</td>
              <td className="px-3 py-2">{t("landing.row2Keyword")}</td>
              <td className="px-3 py-2">{t("landing.row2Skill")}</td>
              <td className="px-3 py-2 text-[var(--muted)]">{t("landing.row2UniqueKeyword")}</td>
              <td className="px-3 py-2 text-[var(--muted)]">{t("landing.row2UniqueSkill")}</td>
            </tr>
            <tr className="border-t border-[var(--glass-border)]">
              <td className="px-3 py-2 text-[var(--muted)]">{t("landing.row3Title")}</td>
              <td className="px-3 py-2">{t("landing.row3Keyword")}</td>
              <td className="px-3 py-2">{t("landing.row3Skill")}</td>
              <td className="px-3 py-2 text-[var(--muted)]">{t("landing.row3UniqueKeyword")}</td>
              <td className="px-3 py-2 text-[var(--muted)]">{t("landing.row3UniqueSkill")}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-[var(--muted)] lg:text-sm">{t("landing.previewNote")}</p>
    </aside>
  );
}
