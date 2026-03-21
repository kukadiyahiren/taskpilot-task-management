import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Send, Sparkles } from "lucide-react";
import Layout from "../components/Layout.jsx";
import { Spinner } from "../components/ui/spinner.jsx";
import { api } from "../api/client.js";
import { DEFAULT_BOARD_ID, WORKSPACE_ID } from "../constants.js";
import { buildAssistantReply } from "../lib/aiAssistantReplies.js";
import { cn } from "../lib/utils.js";

const SUGGESTIONS = [
  "How many tasks on the board?",
  "What columns are on the board?",
  "How many overdue tasks?",
  "Help",
];

export default function AiAssistantPage() {
  const navigate = useNavigate();
  const [board, setBoard] = useState(null);
  const [stats, setStats] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [messages, setMessages] = useState(() => [
    {
      role: "assistant",
      text: "Hi — I’m your TaskFlow assistant (demo). I read your live board and stats. Ask anything below or tap a suggestion.",
    },
  ]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const bottomRef = useRef(null);

  const refreshContext = useCallback(async () => {
    setRefreshing(true);
    setLoadError("");
    try {
      const [b, s] = await Promise.all([
        api.get(`/boards/${DEFAULT_BOARD_ID}`),
        api.get(`/dashboard/stats?workspace_id=${WORKSPACE_ID}&board_id=${DEFAULT_BOARD_ID}`),
      ]);
      setBoard(b);
      setStats(s);
    } catch (e) {
      setLoadError(e.message || "Could not load context");
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    refreshContext();
  }, [refreshContext]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, thinking]);

  function pushAssistant(text) {
    setMessages((m) => [...m, { role: "assistant", text }]);
  }

  async function send(textRaw) {
    const text = textRaw.trim();
    if (!text || thinking) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", text }]);
    setThinking(true);
    try {
      const [b, s] = await Promise.all([
        api.get(`/boards/${DEFAULT_BOARD_ID}`),
        api.get(`/dashboard/stats?workspace_id=${WORKSPACE_ID}&board_id=${DEFAULT_BOARD_ID}`),
      ]);
      setBoard(b);
      setStats(s);
      const reply = buildAssistantReply(text, b, s);
      pushAssistant(reply);
    } catch {
      pushAssistant("I couldn’t refresh your board data. Check the API and try again.");
    } finally {
      setThinking(false);
    }
  }

  function onSubmit(e) {
    e.preventDefault();
    send(input);
  }

  return (
    <Layout onNewTask={() => navigate("/board")}>
      <div className="flex min-h-full flex-col bg-gradient-to-b from-violet-50/80 via-[#f8fafc] to-[#f8fafc]">
        <div className="border-b border-violet-200/60 bg-card/80 px-6 py-5 backdrop-blur">
          <div className="mx-auto flex max-w-3xl items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-brand-600 text-white shadow-lg shadow-violet-500/25">
              <Sparkles className="h-5 w-5" strokeWidth={2} />
            </div>
            <div>
              <h1 className="font-display text-xl font-bold text-foreground">AI Assistant</h1>
              <p className="text-sm text-muted-foreground">Board-aware tips · demo rules (no external API)</p>
            </div>
            <button
              type="button"
              disabled={refreshing}
              aria-busy={refreshing}
              onClick={() => void refreshContext()}
              className="ml-auto inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted disabled:opacity-50"
            >
              {refreshing && <Spinner size="sm" />}
              {refreshing ? "Refreshing…" : "Refresh data"}
            </button>
          </div>
        </div>

        <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-6">
          {loadError && (
            <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900">{loadError}</p>
          )}

          <div className="mb-4 flex flex-wrap gap-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => send(s)}
                disabled={thinking}
                className="rounded-full border border-violet-200 bg-card px-3 py-1.5 text-xs font-medium text-violet-800 shadow-sm hover:bg-violet-50 disabled:opacity-50"
              >
                {s}
              </button>
            ))}
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto rounded-2xl border border-border bg-card/90 p-4 shadow-sm">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}
              >
                <div
                  className={cn(
                    "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                    msg.role === "user"
                      ? "bg-brand-600 text-white"
                      : "border border-slate-100 bg-slate-50 text-foreground"
                  )}
                >
                  {msg.text}
                </div>
              </div>
            ))}
            {thinking && (
              <div className="flex justify-start">
                <div className="inline-flex items-center gap-2 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-2.5 text-sm text-muted-foreground">
                  <Spinner size="sm" />
                  Thinking…
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <form onSubmit={onSubmit} className="mt-4 flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about your board, tasks, or columns…"
              className="min-w-0 flex-1 rounded-xl border border-border bg-card px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-brand-400/40"
            />
            <button
              type="submit"
              disabled={thinking || !input.trim()}
              aria-busy={thinking}
              className="flex shrink-0 items-center gap-2 rounded-xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
            >
              {thinking ? <Spinner size="sm" className="text-white" /> : <Send className="h-4 w-4" />}
              {thinking ? "Sending…" : "Send"}
            </button>
          </form>
        </div>
      </div>
    </Layout>
  );
}
