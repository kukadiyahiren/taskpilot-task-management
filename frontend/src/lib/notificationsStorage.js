const KEY = "taskpilot_notifications_last_seen_at";

export function getLastSeenNotificationsAt() {
  const raw = localStorage.getItem(KEY);
  if (!raw) return new Date(0);
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? new Date(0) : d;
}

export function markNotificationsSeenNow() {
  localStorage.setItem(KEY, new Date().toISOString());
  window.dispatchEvent(new CustomEvent("taskpilot-notifications-seen"));
}

/** @param {{ created_at: string }[]} activities */
export function countUnreadNotifications(activities) {
  if (!activities?.length) return 0;
  const seen = getLastSeenNotificationsAt();
  return activities.filter((a) => new Date(a.created_at) > seen).length;
}
