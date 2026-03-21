/** Format decimal hours for display (Jira-style workload). */
export function formatHours(h) {
  if (h == null || Number.isNaN(Number(h))) return "—";
  const n = Number(h);
  if (n === 0) return "0h";
  return Number.isInteger(n) ? `${n}h` : `${n.toFixed(1)}h`;
}
