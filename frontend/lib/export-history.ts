export type ExportFormPreset = {
  mode: "manual" | "auto";
  manualLines: string;
  queriesText: string;
  pages: number;
  perPage: number;
  kwTopN: number;
  kwMaxNgram: number;
  sleepS: number;
  searchSleepS: number;
};

export type ExportSummary = {
  requested: number;
  processed: number;
  errors: number;
  top_skills: Array<{ name: string; count: number }>;
  top_keywords: Array<{ name: string; count: number }>;
  dedup?: {
    input_count: number;
    unique_count: number;
    duplicates_removed: number;
  };
  coverage?: {
    successful: number;
    with_key_skills: number;
    without_key_skills: number;
    without_description: number;
    key_skills_rate: number;
  };
  error_breakdown?: Array<{ reason: string; count: number }>;
};

export type ExportHistoryEntry = {
  id: string;
  at: string;
  mode: "manual" | "auto";
  warnings: number | null;
  fileName?: string;
  summary: Pick<ExportSummary, "requested" | "processed" | "errors">;
  preset: ExportFormPreset;
};

const STORAGE_KEY = "hhResearch.exportHistory";
const MAX_ITEMS = 10;

export function defaultExportPreset(): ExportFormPreset {
  return {
    mode: "manual",
    manualLines: "",
    queriesText: "frontend developer\nfullstack developer",
    pages: 1,
    perPage: 10,
    kwTopN: 30,
    kwMaxNgram: 3,
    sleepS: 0.2,
    searchSleepS: 0.2,
  };
}

export function mergeExportPreset(p?: ExportFormPreset | null): ExportFormPreset {
  const d = defaultExportPreset();
  if (!p) return d;
  return {
    mode: p.mode ?? d.mode,
    manualLines: p.manualLines ?? d.manualLines,
    queriesText: p.queriesText ?? d.queriesText,
    pages: p.pages ?? d.pages,
    perPage: p.perPage ?? d.perPage,
    kwTopN: p.kwTopN ?? d.kwTopN,
    kwMaxNgram: p.kwMaxNgram ?? d.kwMaxNgram,
    sleepS: p.sleepS ?? d.sleepS,
    searchSleepS: p.searchSleepS ?? d.searchSleepS,
  };
}

export function loadExportHistory(): ExportHistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as ExportHistoryEntry[]) : [];
  } catch {
    return [];
  }
}

export function pushExportHistory(entry: Omit<ExportHistoryEntry, "id" | "at">): void {
  if (typeof window === "undefined") return;
  const prev = loadExportHistory();
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `exp-${Date.now()}`;
  const full: ExportHistoryEntry = {
    ...entry,
    id,
    at: new Date().toISOString(),
  };
  const next = [full, ...prev].slice(0, MAX_ITEMS);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

export function deleteExportHistoryEntry(id: string): void {
  if (typeof window === "undefined") return;
  const prev = loadExportHistory();
  const next = prev.filter((e) => e.id !== id);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}
