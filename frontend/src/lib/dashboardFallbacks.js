/**
 * Static fallbacks when the API is down or returns nothing.
 * Shapes match FastAPI response models (DashboardStats, AnalyticsPoint[], etc.).
 */

const isoDaysAgo = (d) => {
  const x = new Date();
  x.setDate(x.getDate() - d);
  return x.toISOString();
};

const dayStr = (d) => {
  const x = new Date();
  x.setDate(x.getDate() - d);
  return x.toISOString().slice(0, 10);
};

/** Build ~21 daily points for charts */
export function buildFallbackAnalytics(days = 21) {
  const out = [];
  const end = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(end);
    d.setDate(d.getDate() - i);
    const iso = d.toISOString().slice(0, 10);
    const idx = days - 1 - i;
    out.push({
      day: iso,
      completed: 2 + (idx % 4),
      created: 1 + (idx % 3),
      overdue: Math.max(0, (idx % 5) - 2),
    });
  }
  return out;
}

export const FALLBACK_STATS = {
  team_tasks: 44,
  overdue_tasks: 6,
  overdue_urgent: 2,
  completion_rate_pct: 68,
  my_tasks: 9,
  my_due_this_week: 3,
  meetings_this_week: 3,
  ai_tasks_generated: 12,
};

const demoUser = (id, name, role = "Member") => ({
  id,
  email: `${name.toLowerCase().replace(/\s+/g, ".")}@acme.test`,
  name,
  avatar_url: null,
  role,
  created_at: isoDaysAgo(30),
});

export const FALLBACK_ACTIVITIES = [
  {
    id: 1,
    board_id: 1,
    user_id: 2,
    action: "move",
    detail: "moved 'Auth Flow' to In Review",
    created_at: new Date(Date.now() - 4 * 60 * 1000).toISOString(),
    user: demoUser(2, "Sara Okonkwo", "Designer"),
  },
  {
    id: 2,
    board_id: 1,
    user_id: 3,
    action: "comment",
    detail: "commented on 'Realtime sync for task board'",
    created_at: new Date(Date.now() - 26 * 60 * 1000).toISOString(),
    user: demoUser(3, "Marcus Chen", "Engineer"),
  },
  {
    id: 3,
    board_id: 1,
    user_id: 4,
    action: "checklist",
    detail: "completed items on 'OAuth2 SSO integration'",
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    user: demoUser(4, "Priya Nair", "Engineer"),
  },
  {
    id: 4,
    board_id: 1,
    user_id: 1,
    action: "create",
    detail: "created task 'Dashboard analytics chart'",
    created_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    user: demoUser(1, "Jamie Kim", "Manager"),
  },
  {
    id: 5,
    board_id: 1,
    user_id: 2,
    action: "label",
    detail: "added label Frontend to 'Auth flow copy review'",
    created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    user: demoUser(2, "Sara Okonkwo", "Designer"),
  },
];

export const FALLBACK_MEETINGS = [
  {
    id: 1,
    workspace_id: 1,
    title: "Sprint Planning Q2 2026",
    start_time: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
    end_time: null,
    status: "scheduled",
    participant_count: 8,
  },
  {
    id: 2,
    workspace_id: 1,
    title: "Design critique — onboarding",
    start_time: new Date(Date.now() + 26 * 60 * 60 * 1000).toISOString(),
    end_time: null,
    status: "scheduled",
    participant_count: 4,
  },
];

/** Minimal task row for overdue table + priority tab */
function taskRow(id, title, priority, dueDaysAgo, assigneeName) {
  const uid = 10 + id;
  return {
    id,
    list_id: 1,
    title,
    priority,
    position: 0,
    due_date: dayStr(dueDaysAgo),
    estimate_hours: null,
    logged_hours: 0,
    remaining_estimate_hours: null,
    attachment_count: 0,
    comment_count: 0,
    checklist_done: 0,
    checklist_total: 0,
    assignees: [
      demoUser(uid, assigneeName, assigneeName.includes("Priya") ? "Engineer" : "Designer"),
    ],
    labels: [],
  };
}

export const FALLBACK_BOARD = {
  id: 1,
  workspace_id: 1,
  name: "Q1 2026 Product Sprint",
  description: "Demo board (offline)",
  sprint_end: null,
  created_at: new Date().toISOString(),
  lists: [
    {
      id: 1,
      board_id: 1,
      name: "In Progress",
      position: 1,
      accent: "orange",
      tasks: [
        taskRow(101, "Client onboarding checklist update", "high", 4, "Priya Nair"),
        taskRow(102, "Auth flow copy review", "urgent", 1, "Sara Okonkwo"),
        taskRow(103, "API rate limit alerts", "medium", 2, "Marcus Chen"),
      ],
    },
  ],
  labels: [],
};

/** Sidebar badge defaults when API unavailable */
export const FALLBACK_SIDEBAR = {
  taskBoardTasks: 12,
  myTasks: FALLBACK_STATS.my_tasks,
  meetings: FALLBACK_MEETINGS.length,
};
