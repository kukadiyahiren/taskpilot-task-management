import { Bell, Menu, Plus, Search } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useWorkspaceNotifications } from "../hooks/useWorkspaceNotifications.js";
import { Button } from "./ui/button.jsx";
import ThemeToggle from "./ThemeToggle.jsx";
import { cn } from "../lib/utils.js";

export default function TopNav({ onNewTask, onOpenMobileMenu, newTaskLoading = false }) {
  const { pathname } = useLocation();
  const { unreadCount } = useWorkspaceNotifications();
  const notifLabel = unreadCount > 99 ? "99+" : unreadCount > 0 ? String(unreadCount) : null;
  const boardActive = pathname.startsWith("/board");

  return (
    <header className="flex h-[60px] shrink-0 items-center gap-3 border-b border-border bg-card/95 px-4 backdrop-blur-sm sm:gap-4 lg:px-6">
      <button
        type="button"
        className="inline-flex rounded-xl p-2 text-muted-foreground hover:bg-muted lg:hidden"
        onClick={onOpenMobileMenu}
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="relative min-w-0 max-w-xl flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          placeholder="Search tasks, boards, members… (⌘K)"
          className="w-full rounded-xl border border-input bg-muted/50 py-2.5 pl-10 pr-16 text-sm text-foreground outline-none ring-ring/0 transition placeholder:text-muted-foreground focus:border-ring focus:bg-card focus:ring-4 focus:ring-ring/20"
        />
        <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] font-medium text-muted-foreground sm:inline-block">
          ⌘K
        </kbd>
      </div>

      <Button
        variant="gradient"
        size="md"
        loading={newTaskLoading}
        className="hidden shrink-0 gap-1.5 sm:inline-flex"
        onClick={onNewTask}
      >
        {!newTaskLoading && <Plus className="h-4 w-4" />}
        New Task
      </Button>

      <div className="flex shrink-0 items-center gap-1 sm:gap-2">
        <ThemeToggle />
        <Link
          to="/notifications"
          className="relative rounded-xl p-2.5 text-muted-foreground transition hover:bg-muted"
          aria-label={notifLabel ? `Notifications, ${unreadCount} unread` : "Notifications"}
        >
          <Bell className="h-5 w-5" />
          {notifLabel != null && (
            <span className="absolute right-1 top-1 flex min-h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white ring-2 ring-card">
              {notifLabel}
            </span>
          )}
        </Link>
      </div>

      <div className="hidden shrink-0 items-center rounded-xl border border-border bg-muted/80 p-1 sm:flex">
        <Link
          to="/"
          className={cn(
            "rounded-lg px-3 py-1.5 text-sm font-semibold transition",
            !boardActive ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
          )}
        >
          Dashboard
        </Link>
        <Link
          to="/board"
          className={cn(
            "rounded-lg px-3 py-1.5 text-sm font-semibold transition",
            boardActive ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
          )}
        >
          Board
        </Link>
      </div>
    </header>
  );
}
