/** Period keys used for mission resets & leaderboard buckets (UTC). */

export const dayKey = (d: Date = new Date()): string =>
  d.toISOString().slice(0, 10); // YYYY-MM-DD

export const monthKey = (d: Date = new Date()): string =>
  d.toISOString().slice(0, 7); // YYYY-MM

/** ISO-8601 week key, e.g. 2026-W21 */
export const isoWeekKey = (date: Date = new Date()): string => {
  const d = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  );
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(
    ((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7
  );
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
};

/** Period key for a mission type (DAILY→date, WEEKLY→iso week, else SPECIAL). */
export const periodKeyFor = (type: string, d: Date = new Date()): string => {
  switch (type) {
    case "DAILY":
      return dayKey(d);
    case "WEEKLY":
      return isoWeekKey(d);
    default:
      return "SPECIAL";
  }
};

/** Start of the current ISO week (Monday 00:00 UTC). */
export const startOfIsoWeek = (date: Date = new Date()): Date => {
  const d = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  );
  const day = d.getUTCDay() || 7; // Sun→7
  if (day !== 1) d.setUTCDate(d.getUTCDate() - (day - 1));
  return d;
};

/** Start of the current calendar month (00:00 UTC). */
export const startOfMonth = (date: Date = new Date()): Date =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));

export const daysBetween = (a: Date | null, b: Date): number => {
  if (!a) return Infinity;
  const da = Date.UTC(a.getUTCFullYear(), a.getUTCMonth(), a.getUTCDate());
  const db = Date.UTC(b.getUTCFullYear(), b.getUTCMonth(), b.getUTCDate());
  return Math.round((db - da) / 86400000);
};
