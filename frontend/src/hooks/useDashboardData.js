import { useQuery } from "@tanstack/react-query";
import {
  fetchBoard,
  fetchDashboardStats,
  fetchRecentActivity,
  fetchTaskAnalytics,
  fetchWorkspace,
  fetchWorkspaceMeetings,
} from "../api/dashboardApi.js";
import { DEFAULT_BOARD_ID, WORKSPACE_ID } from "../constants.js";

export const qk = {
  stats: (ws, board) => ["dashboard", "stats", ws, board],
  analytics: (board, days) => ["dashboard", "analytics", board, days],
  activity: (board, limit) => ["dashboard", "activity", board, limit],
  board: (id) => ["boards", id],
  meetings: (ws) => ["workspaces", ws, "meetings"],
  workspace: (id) => ["workspaces", id],
};

export function useDashboardStats(
  workspaceId = WORKSPACE_ID,
  boardId = DEFAULT_BOARD_ID
) {
  return useQuery({
    queryKey: qk.stats(workspaceId, boardId),
    queryFn: () => fetchDashboardStats({ workspaceId, boardId }),
    staleTime: 30_000,
  });
}

export function useTaskAnalytics(boardId = DEFAULT_BOARD_ID, days = 21) {
  return useQuery({
    queryKey: qk.analytics(boardId, days),
    queryFn: () => fetchTaskAnalytics({ boardId, days }),
    staleTime: 30_000,
  });
}

export function useRecentActivity(boardId = DEFAULT_BOARD_ID, limit = 12) {
  return useQuery({
    queryKey: qk.activity(boardId, limit),
    queryFn: () => fetchRecentActivity({ boardId, limit }),
    staleTime: 30_000,
  });
}

export function useBoard(boardId = DEFAULT_BOARD_ID) {
  return useQuery({
    queryKey: qk.board(boardId),
    queryFn: () => fetchBoard(boardId),
    staleTime: 30_000,
  });
}

export function useWorkspaceMeetings(workspaceId = WORKSPACE_ID) {
  return useQuery({
    queryKey: qk.meetings(workspaceId),
    queryFn: () => fetchWorkspaceMeetings(workspaceId),
    staleTime: 30_000,
  });
}

export function useWorkspace(workspaceId = WORKSPACE_ID) {
  return useQuery({
    queryKey: qk.workspace(workspaceId),
    queryFn: () => fetchWorkspace(workspaceId),
    staleTime: 60_000,
  });
}

/** Aliases for clearer naming in UI code */
export { useTaskAnalytics as useAnalytics };
export { useRecentActivity as useActivities };
