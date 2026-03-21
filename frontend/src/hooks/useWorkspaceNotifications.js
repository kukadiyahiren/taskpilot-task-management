import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { api } from "../api/client.js";
import { WORKSPACE_ID } from "../constants.js";
import { countUnreadNotifications } from "../lib/notificationsStorage.js";

export const notificationsQueryKey = (workspaceId) => ["notifications", workspaceId];

export function useWorkspaceNotifications() {
  const [seenBump, setSeenBump] = useState(0);

  useEffect(() => {
    const onSeen = () => setSeenBump((n) => n + 1);
    window.addEventListener("taskpilot-notifications-seen", onSeen);
    return () => window.removeEventListener("taskpilot-notifications-seen", onSeen);
  }, []);

  const query = useQuery({
    queryKey: notificationsQueryKey(WORKSPACE_ID),
    queryFn: () => api.get(`/notifications?workspace_id=${WORKSPACE_ID}&limit=50`),
    staleTime: 15_000,
    refetchInterval: 45_000,
  });

  const items = query.data ?? [];

  const unreadCount = useMemo(
    () => countUnreadNotifications(items),
    [items, seenBump]
  );

  return {
    items,
    unreadCount,
    isLoading: query.isPending,
    isError: query.isError,
    refetch: query.refetch,
  };
}
