import { Link, useLocation } from "react-router-dom";

export default function TopNav({ onNewTask }) {
  const { pathname } = useLocation();
  const boardActive = pathname.startsWith("/board");

  return (
    <header className="flex h-16 shrink-0 items-center gap-4 border-b border-slate-200/80 bg-white/90 px-6 backdrop-blur">
      <div className="relative max-w-xl flex-1">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">⌕</span>
        <input
          type="search"
          placeholder="Search tasks, boards, members…"
          className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm outline-none ring-brand-500/30 placeholder:text-slate-400 focus:border-brand-400 focus:bg-white focus:ring-2"
        />
      </div>
      <button
        type="button"
        onClick={onNewTask}
        className="rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-brand-600/25 transition hover:bg-brand-700"
      >
        + New Task
      </button>
      <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1">
        <Link
          to="/"
          className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
            !boardActive ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
          }`}
        >
          Dashboard
        </Link>
        <Link
          to="/board"
          className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
            boardActive ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
          }`}
        >
          Board
        </Link>
      </div>
      <button type="button" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Notifications">
        🔔
      </button>
    </header>
  );
}
