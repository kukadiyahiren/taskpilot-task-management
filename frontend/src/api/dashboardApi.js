import { http } from "./http.js";

/** Backend: GET /dashboard/stats */
export function fetchDashboardStats({ workspaceId, boardId }) {
  return http.get("/dashboard/stats", {
    params: { workspace_id: workspaceId, board_id: boardId },
  });
}

/** Backend: GET /analytics/tasks */
export function fetchTaskAnalytics({ boardId, days = 21 }) {
  return http.get("/analytics/tasks", {
    params: { board_id: boardId, days },
  });
}

/** Backend: GET /activity/recent */
export function fetchRecentActivity({ boardId, limit = 20 }) {
  return http.get("/activity/recent", {
    params: { board_id: boardId, limit },
  });
}

/** Backend: GET /boards/{boardId} */
export function fetchBoard(boardId) {
  return http.get(`/boards/${boardId}`);
}

/** Backend: GET /workspaces/{workspaceId} */
export function fetchWorkspace(workspaceId) {
  return http.get(`/workspaces/${workspaceId}`);
}

/** Backend: GET /workspaces/{workspaceId}/meetings */
export function fetchWorkspaceMeetings(workspaceId) {
  return http.get(`/workspaces/${workspaceId}/meetings`);
}

/** Backend: GET /users */
export function fetchUsers() {
  return http.get("/users");
}
