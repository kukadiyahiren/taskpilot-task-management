import { useEffect, useRef } from "react";
import { getAccessToken } from "../lib/authStorage.js";

const API_BASE = import.meta.env.VITE_API_BASE ?? "/api";

function boardWebSocketUrl(boardId, token) {
  const qs = token ? `?token=${encodeURIComponent(token)}` : "";
  const path = `${API_BASE.replace(/\/$/, "")}/ws/boards/${boardId}${qs}`;
  if (path.startsWith("http://") || path.startsWith("https://")) {
    const u = new URL(path);
    const proto = u.protocol === "https:" ? "wss:" : "ws:";
    return `${proto}//${u.host}${u.pathname}${u.search}`;
  }
  const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${proto}//${window.location.host}${path}`;
}

/**
 * Subscribe to board collaboration events; refetch when the server broadcasts changes.
 * @param {number} boardId
 * @param {{ loadBoard: (id: number) => void | Promise<void>, draggingRef: React.MutableRefObject<boolean>, enabled?: boolean }} opts
 */
export function useBoardWebSocket(boardId, { loadBoard, draggingRef, enabled = true }) {
  const loadRef = useRef(loadBoard);
  loadRef.current = loadBoard;
  const dragRef = draggingRef;

  useEffect(() => {
    if (!enabled || boardId == null) return;

    let stopped = false;
    let reconnectAttempt = 0;
    /** @type {ReturnType<typeof setTimeout> | undefined} */
    let reconnectTimer;
    /** @type {WebSocket | null} */
    let socket = null;

    const connect = () => {
      if (stopped) return;
      const token = getAccessToken();
      const url = boardWebSocketUrl(boardId, token);

      try {
        socket = new WebSocket(url);
      } catch {
        scheduleReconnect();
        return;
      }

      socket.onopen = () => {
        reconnectAttempt = 0;
      };

      socket.onmessage = (ev) => {
        try {
          const data = JSON.parse(ev.data);
          if (data.type !== "board_changed" || Number(data.board_id) !== Number(boardId)) return;
          if (dragRef?.current) return;
          if (document.visibilityState !== "visible") return;
          void loadRef.current(boardId);
        } catch {
          /* ignore malformed */
        }
      };

      socket.onerror = () => {
        /* onclose will reconnect */
      };

      socket.onclose = () => {
        socket = null;
        if (stopped) return;
        scheduleReconnect();
      };
    };

    function scheduleReconnect() {
      if (stopped) return;
      const base = Math.min(30_000, 800 * 2 ** reconnectAttempt);
      const jitter = Math.floor(Math.random() * 400);
      reconnectAttempt += 1;
      reconnectTimer = window.setTimeout(connect, base + jitter);
    }

    connect();

    return () => {
      stopped = true;
      if (reconnectTimer != null) window.clearTimeout(reconnectTimer);
      if (socket && socket.readyState === WebSocket.OPEN) socket.close();
      socket = null;
    };
  }, [boardId, enabled, dragRef]);
}
