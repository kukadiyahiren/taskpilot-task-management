/** Approximate % change from first vs second half of analytics series (backend-driven). */
export function seriesTrend(points, key) {
  if (!points?.length || points.length < 4) return null;
  const mid = Math.floor(points.length / 2);
  const first = points.slice(0, mid);
  const second = points.slice(mid);
  const avg = (arr) => arr.reduce((a, p) => a + (p[key] ?? 0), 0) / arr.length;
  const a = avg(first);
  const b = avg(second);
  if (a === 0 && b === 0) return 0;
  if (a === 0) return b > 0 ? 100 : 0;
  return ((b - a) / a) * 100;
}

export function formatTrendPct(n) {
  if (n == null || Number.isNaN(n)) return null;
  const sign = n >= 0 ? "+" : "";
  return `${sign}${n.toFixed(1)}%`;
}
