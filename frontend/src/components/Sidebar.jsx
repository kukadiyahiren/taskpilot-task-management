import {
  Bell,
  Building2,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  FileText,
  LayoutDashboard,
  LayoutGrid,
  ListTodo,
  LogOut,
  Search,
  Settings,
  Sparkles,
  Target,
  User,
  Users,
  Video,
  Briefcase,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  useBoard,
  useDashboardStats,
  useWorkspace,
  useWorkspaceMeetings,
} from "../hooks/useDashboardData.js";
import { authMeQueryKey, useCurrentUser } from "../hooks/useCurrentUser.js";
import { useWorkspaceNotifications } from "../hooks/useWorkspaceNotifications.js";
import { DEFAULT_BOARD_ID, WORKSPACE_ID } from "../constants.js";
import { FALLBACK_BOARD, FALLBACK_MEETINGS, FALLBACK_STATS } from "../lib/dashboardFallbacks.js";
import { clearAccessToken } from "../lib/authStorage.js";
import { resolveQueryData } from "../lib/resolveQueryData.js";
import { hasPermission, ROLE_LABELS } from "../lib/rbac.js";
import { initialsFromName } from "../lib/userDisplay.js";
import { cn } from "../lib/utils.js";

function countBoardTasks(board) {
  if (!board?.lists) return 0;
  return board.lists.reduce((n, c) => n + c.tasks.length, 0);
}

function NavItem({ to, end, icon: Icon, label, badge, tag, collapsed }) {
  return (
    <NavLink
      to={to}
      end={end}
      title={label}
      className={({ isActive }) =>
        cn(
          "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
          collapsed && "justify-center px-2",
          isActive
            ? "bg-primary/15 text-primary shadow-sm"
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
        )
      }
    >
      <Icon className="h-[18px] w-[18px] shrink-0 opacity-90" strokeWidth={1.75} />
      {!collapsed && <span className="flex-1">{label}</span>}
      {!collapsed && tag && (
        <span className="rounded bg-primary px-1.5 py-0.5 text-[10px] font-bold uppercase text-primary-foreground">
          {tag}
        </span>
      )}
      {!collapsed && badge != null && (
        <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold tabular-nums text-muted-foreground">
          {badge}
        </span>
      )}
    </NavLink>
  );
}

function PlaceholderItem({ icon: Icon, label, badge, tag, collapsed }) {
  return (
    <span
      title={label}
      className={cn(
        "flex cursor-not-allowed items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-muted-foreground/70",
        collapsed && "justify-center px-2"
      )}
    >
      <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={1.75} />
      {!collapsed && <span className="flex-1">{label}</span>}
      {!collapsed && tag && (
        <span className="rounded bg-primary/15 px-1.5 py-0.5 text-[10px] font-bold text-primary">{tag}</span>
      )}
      {!collapsed && badge != null && (
        <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] tabular-nums text-muted-foreground">
          {badge}
        </span>
      )}
    </span>
  );
}

export default function Sidebar({ collapsed, onToggleCollapse, mobileOpen, onCloseMobile }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const queryClient = useQueryClient();
  const meQ = useCurrentUser();
  const user = meQ.data;
  const initials = user ? initialsFromName(user.name) : meQ.isPending ? "…" : "?";
  const displayName = user?.name ?? (meQ.isPending ? "Loading…" : "Account");
  const roleLabel = user ? ROLE_LABELS[user.role] ?? user.role : "…";

  const workspaceRef = useRef(null);
  const accountRef = useRef(null);
  const [workspaceOpen, setWorkspaceOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);

  const closeMenus = useCallback(() => {
    setWorkspaceOpen(false);
    setAccountOpen(false);
    onCloseMobile();
  }, [onCloseMobile]);

  useEffect(() => {
    setWorkspaceOpen(false);
    setAccountOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!workspaceOpen && !accountOpen) return;
    const onDoc = (e) => {
      const t = e.target;
      if (workspaceOpen && !workspaceRef.current?.contains(t)) setWorkspaceOpen(false);
      if (accountOpen && !accountRef.current?.contains(t)) setAccountOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [workspaceOpen, accountOpen]);

  useEffect(() => {
    if (!workspaceOpen && !accountOpen) return;
    const onKey = (e) => {
      if (e.key === "Escape") {
        setWorkspaceOpen(false);
        setAccountOpen(false);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [workspaceOpen, accountOpen]);

  function signOut() {
    closeMenus();
    queryClient.removeQueries({ queryKey: authMeQueryKey });
    clearAccessToken();
    navigate("/login", { replace: true });
  }

  const boardQ = useBoard(DEFAULT_BOARD_ID);
  const statsQ = useDashboardStats(WORKSPACE_ID, DEFAULT_BOARD_ID);
  const meetingsQ = useWorkspaceMeetings(WORKSPACE_ID);
  const workspaceQ = useWorkspace(WORKSPACE_ID);
  const workspaceName = workspaceQ.data?.name ?? (workspaceQ.isPending ? "…" : "Workspace");
  const workspaceInitial = (workspaceName === "…" ? "W" : workspaceName.trim().charAt(0).toUpperCase()) || "W";

  const boardRes = resolveQueryData(boardQ, FALLBACK_BOARD);
  const statsRes = resolveQueryData(statsQ, FALLBACK_STATS);
  const meetingsRes = resolveQueryData(meetingsQ, FALLBACK_MEETINGS);

  const taskBoardBadge = boardRes.data != null ? countBoardTasks(boardRes.data) : "—";
  const myBadge = statsRes.data?.my_tasks ?? "—";
  const meetingsBadge = meetingsRes.data != null ? meetingsRes.data.length : "—";
  const { unreadCount: notificationUnread } = useWorkspaceNotifications();
  const notificationBadge =
    notificationUnread > 99 ? "99+" : notificationUnread > 0 ? notificationUnread : undefined;

  const shell = (
    <>
      <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-4">
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md shadow-primary/30">
            <LayoutGrid className="h-5 w-5" strokeWidth={2} />
          </div>
          {!collapsed && (
            <span className="truncate font-display text-lg font-bold tracking-tight text-foreground">TaskFlow</span>
          )}
        </div>
        <button
          type="button"
          onClick={onToggleCollapse}
          className="hidden rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground lg:inline-flex"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      <div className="px-3 py-3">
        <div className="relative" ref={workspaceRef}>
          <button
            type="button"
            onClick={() => {
              setWorkspaceOpen((o) => !o);
              setAccountOpen(false);
            }}
            aria-expanded={workspaceOpen}
            aria-haspopup="menu"
            aria-label="Workspace menu"
            className={cn(
              "flex w-full items-center justify-between rounded-xl border border-border bg-card px-3 py-2.5 text-left text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-muted",
              collapsed && "justify-center px-2"
            )}
          >
            <span className="flex items-center gap-2 truncate">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-sm font-bold text-primary">
                {workspaceInitial}
              </span>
              {!collapsed && <span className="truncate">{workspaceName}</span>}
            </span>
            {!collapsed && (
              <ChevronUp
                className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", !workspaceOpen && "rotate-180")}
              />
            )}
          </button>
          {workspaceOpen && (
            <div
              role="menu"
              className={cn(
                "absolute z-[70] mt-1 overflow-hidden rounded-xl border border-border bg-popover py-1 text-popover-foreground shadow-lg",
                collapsed ? "left-0 min-w-[200px]" : "left-0 right-0"
              )}
            >
              <div className="border-b border-border px-3 py-2">
                <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <Building2 className="h-3.5 w-3.5" />
                  Current workspace
                </p>
                <p className="mt-1 truncate text-sm font-semibold text-foreground">{workspaceName}</p>
                <p className="text-[11px] text-muted-foreground">ID {WORKSPACE_ID}</p>
              </div>
              <NavLink
                to="/members"
                role="menuitem"
                onClick={closeMenus}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-2 px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive ? "bg-muted text-foreground" : "hover:bg-muted"
                  )
                }
              >
                <Users className="h-4 w-4 opacity-70" />
                Team members
              </NavLink>
              <NavLink
                to="/board"
                role="menuitem"
                onClick={closeMenus}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-2 px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive ? "bg-muted text-foreground" : "hover:bg-muted"
                  )
                }
              >
                <LayoutGrid className="h-4 w-4 opacity-70" />
                Task board
              </NavLink>
            </div>
          )}
        </div>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 pb-6">
        <div>
          <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Workspace</p>
          <div className="space-y-0.5">
            <NavItem to="/" end icon={LayoutDashboard} label="Dashboard" collapsed={collapsed} />
            <NavItem to="/board" icon={LayoutGrid} label="Task Board" badge={taskBoardBadge} collapsed={collapsed} />
            <NavItem to="/my-tasks" icon={ListTodo} label="My Tasks" badge={myBadge} collapsed={collapsed} />
            {hasPermission(user, "route.strategic") && (
              <NavItem to="/strategic" icon={Target} label="Strategic KPIs" collapsed={collapsed} />
            )}
            {hasPermission(user, "route.console.team") && (
              <NavItem to="/console/team" icon={Briefcase} label="Team console" collapsed={collapsed} />
            )}
          </div>
        </div>
        <div>
          <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Team</p>
          <div className="space-y-0.5">
            {hasPermission(user, "nav.members") && (
              <NavItem to="/members" icon={Users} label="Members" collapsed={collapsed} />
            )}
            {hasPermission(user, "nav.meetings") && (
              <NavItem to="/meetings" icon={Video} label="Meetings" badge={meetingsBadge} collapsed={collapsed} />
            )}
            {hasPermission(user, "nav.files") && (
              <NavItem to="/files" icon={FileText} label="Files" collapsed={collapsed} />
            )}
            {!hasPermission(user, "nav.members") &&
              !hasPermission(user, "nav.meetings") &&
              !hasPermission(user, "nav.files") && (
                <span className="block px-3 py-2 text-xs text-muted-foreground">No team apps in your role</span>
              )}
          </div>
        </div>
        <div>
          <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Tools</p>
          <div className="space-y-0.5">
            {hasPermission(user, "nav.ai") && (
              <NavItem to="/ai" icon={Sparkles} label="AI Assistant" tag="NEW" collapsed={collapsed} />
            )}
            <PlaceholderItem icon={Search} label="Search" collapsed={collapsed} />
            <NavItem to="/notifications" icon={Bell} label="Notifications" badge={notificationBadge} collapsed={collapsed} />
          </div>
        </div>
      </nav>

      <div className="mt-auto border-t border-border p-3">
        <div className="relative" ref={accountRef}>
          <button
            type="button"
            onClick={() => {
              setAccountOpen((o) => !o);
              setWorkspaceOpen(false);
            }}
            aria-expanded={accountOpen}
            aria-haspopup="menu"
            aria-label="Account and settings menu"
            className={cn(
              "flex w-full items-center gap-3 rounded-xl bg-muted/60 px-3 py-2.5 text-left transition-colors hover:bg-muted",
              collapsed && "justify-center px-2"
            )}
          >
            {user?.avatar_url ? (
              <img
                src={user.avatar_url}
                alt=""
                className="h-10 w-10 shrink-0 rounded-full object-cover ring-2 ring-card"
              />
            ) : (
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-400 to-primary text-sm font-bold text-white"
                title={displayName}
              >
                {initials}
              </div>
            )}
            {!collapsed && (
              <>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">{displayName}</p>
                  <p className="truncate text-xs text-muted-foreground">{roleLabel}</p>
                </div>
                <ChevronUp
                  className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", !accountOpen && "rotate-180")}
                />
              </>
            )}
          </button>
          {accountOpen && (
            <div
              role="menu"
              className={cn(
                "absolute z-[70] mb-2 overflow-hidden rounded-xl border border-border bg-popover py-1 text-popover-foreground shadow-lg",
                collapsed ? "bottom-full left-0 min-w-[200px]" : "bottom-full left-0 right-0"
              )}
            >
              <NavLink
                to="/account"
                role="menuitem"
                onClick={closeMenus}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-2 px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive ? "bg-muted text-foreground" : "hover:bg-muted"
                  )
                }
              >
                <User className="h-4 w-4 opacity-70" />
                Account
              </NavLink>
              <NavLink
                to="/settings"
                role="menuitem"
                onClick={closeMenus}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-2 px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive ? "bg-muted text-foreground" : "hover:bg-muted"
                  )
                }
              >
                <Settings className="h-4 w-4 opacity-70" />
                Settings
              </NavLink>
              <div className="my-1 h-px bg-border" role="separator" />
              <button
                type="button"
                role="menuitem"
                onClick={signOut}
                className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm font-medium text-popover-foreground transition-colors hover:bg-muted"
              >
                <LogOut className="h-4 w-4 opacity-70" />
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );

  return (
    <>
      <button
        type="button"
        aria-label="Close menu"
        className={cn(
          "fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity dark:bg-black/50 lg:hidden",
          mobileOpen ? "opacity-100" : "pointer-events-none opacity-0"
        )}
        onClick={onCloseMobile}
      />

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex shrink-0 flex-col border-r border-border bg-sidebar text-sidebar-foreground transition-[transform,width] duration-200 ease-out lg:static lg:z-auto lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
          collapsed ? "w-[72px] lg:w-[72px]" : "w-[260px]"
        )}
      >
        {shell}
      </aside>
    </>
  );
}
