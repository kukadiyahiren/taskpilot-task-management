import { Bell, Menu, Moon, Plus, Search, Sun } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "./ui/button.jsx";
import { cn } from "../lib/utils.js";

export default function TopNav({ onNewTask, onOpenMobileMenu, dark, onToggleDark }) {
  const { pathname } = useLocation();
  const boardActive = pathname.startsWith("/board");

  return (
    <header className="flex h-[60px] shrink-0 items-center gap-3 border-b border-slate-200/80 bg-white/95 px-4 backdrop-blur-sm sm:gap-4 lg:px-6">
      <button
        type="button"
        className="inline-flex rounded-xl p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
        onClick={onOpenMobileMenu}
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="relative min-w-0 max-w-xl flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="search"
          placeholder="Search tasks, boards, members… (⌘K)"
          className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-16 text-sm text-slate-900 outline-none ring-[#7C3AED]/0 transition placeholder:text-slate-400 focus:border-violet-300 focus:bg-white focus:ring-4 focus:ring-violet-500/15"
        />
        <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded border border-slate-200 bg-white px-1.5 py-0.5 font-mono text-[10px] font-medium text-slate-400 sm:inline-block">
          ⌘K
        </kbd>
      </div>

      <Button variant="gradient" size="md" className="hidden shrink-0 gap-1.5 sm:inline-flex" onClick={onNewTask}>
        <Plus className="h-4 w-4" />
        New Task
      </Button>

      <div className="flex shrink-0 items-center gap-1 sm:gap-2">
        <button
          type="button"
          onClick={onToggleDark}
          className="rounded-xl p-2.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
          aria-label="Toggle dark mode"
        >
          {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>
        <button
          type="button"
          className="relative rounded-xl p-2.5 text-slate-500 transition hover:bg-slate-100"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
        </button>
      </div>

      <div className="hidden shrink-0 items-center rounded-xl border border-slate-200 bg-slate-50 p-1 sm:flex">
        <Link
          to="/"
          className={cn(
            "rounded-lg px-3 py-1.5 text-sm font-semibold transition",
            !boardActive ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
          )}
        >
          Dashboard
        </Link>
        <Link
          to="/board"
          className={cn(
            "rounded-lg px-3 py-1.5 text-sm font-semibold transition",
            boardActive ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
          )}
        >
          Board
        </Link>
      </div>
    </header>
  );
}
