export type SemesterType = 's' | 'w';

export const SEMESTER_RE = /^(\d{4})([wsWS])$/;

export function normalizeSemesterId(id: string): string {
  const m = String(id).trim().match(SEMESTER_RE);
  if (!m) throw new Error(`Ungültige Semester-ID: ${id}`);
  const year = m[1];
  const t = m[2].toLowerCase() as SemesterType;
  return `${year}${t}`;
}

export function isValidSemesterId(id: string): boolean {
  return SEMESTER_RE.test(String(id).trim());
}

export function parseSemesterId(id: string): { year: number; type: SemesterType } {
  const n = normalizeSemesterId(id);
  return { year: Number(n.slice(0, 4)), type: n[4] as SemesterType };
}

export function semesterLabel(id: string): string {
  const { year, type } = parseSemesterId(id);
  return type === 'w' ? `WS ${year}` : `SS ${year}`;
}

export function decadeLabel(id: string): string {
  const { year } = parseSemesterId(id);
  const d = Math.floor(year / 10) * 10;
  return `${d}–${d + 9}`;
}

/** Sortiert chronologisch (SS vor WS im selben Jahr) */
export function compareSemester(a: string, b: string): number {
  const A = parseSemesterId(a), B = parseSemesterId(b);
  if (A.year !== B.year) return A.year - B.year;
  const w = (t: SemesterType) => (t === 's' ? 0 : 1);
  return w(A.type) - w(B.type);
}

/** Gruppiert Semester-IDs nach Jahrzehnt-Label. */
export function groupByDecade(ids: string[]): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const id of ids) {
    if (!isValidSemesterId(id)) continue;
    const key = decadeLabel(id);
    (out[key] ??= []).push(normalizeSemesterId(id));
  }
  for (const key of Object.keys(out)) out[key].sort(compareSemester);
  return out;
}
