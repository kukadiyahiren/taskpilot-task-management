import { NavLink } from "react-router-dom";

const nav = [
  { to: "/", label: "Dashboard", icon: "◆" },
  { to: "/board", label: "Task Board", icon: "▦", badge: 12 },
  { to: "/my-tasks", label: "My Tasks", icon: "✓", badge: 6 },
];

const team = [
  { to: "#", label: "Members", icon: "◎" },
  { to: "#", label: "Meetings", icon: "◷", badge: 2 },
  { to: "#", label: "Files", icon: "📁" },
];

const tools = [
  { to: "#", label: "AI Assistant", icon: "✦", tag: "NEW" },
  { to: "#", label: "Search", icon: "⌕" },
  { to: "#", label: "Notifications", icon: "🔔", badge: 3 },
];

function Item({ to, label, icon, badge, tag }) {
  if (to === "#") {
    return (
      <span className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-slate-400 cursor-not-allowed">
        <span className="w-5 text-center opacity-70">{icon}</span>
        <span className="flex-1">{label}</span>
        {tag && (
          <span className="rounded bg-brand-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-brand-600">{tag}</span>
        )}
        {badge != null && (
          <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-300">{badge}</span>
        )}
      </span>
    );
  }
  return (
    <NavLink
      to={to}
      end={to === "/"}
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors ${
          isActive ? "bg-brand-600 text-white shadow-md shadow-brand-900/20" : "text-slate-300 hover:bg-slate-800/80"
        }`
      }
    >
      <span className="w-5 text-center opacity-90">{icon}</span>
      <span className="flex-1 font-medium">{label}</span>
      {badge != null && (
        <span className="rounded-full bg-white/15 px-2 py-0.5 text-xs tabular-nums">{badge}</span>
      )}
    </NavLink>
  );
}

export default function Sidebar() {
  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-slate-800/80 bg-slate-900 text-slate-200">
      <div className="flex items-center gap-2 border-b border-slate-800 px-5 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 text-lg text-white shadow-lg shadow-brand-900/40">
          ✈
        </div>
        <div>
          <h1 className="font-display text-lg font-semibold tracking-tight text-white">Task Pilot</h1>
          <p className="text-xs text-slate-500">Workspace</p>
        </div>
      </div>

      <div className="px-3 py-4">
        <button
          type="button"
          className="flex w-full items-center justify-between rounded-xl border border-slate-700 bg-slate-800/50 px-3 py-2 text-left text-sm text-slate-200 hover:bg-slate-800"
        >
          <span>Acme Corp.</span>
          <span className="text-slate-500">▾</span>
        </button>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 pb-6">
        <div>
          <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-slate-500">Workspace</p>
          <div className="space-y-0.5">{nav.map((x) => <Item key={x.to + x.label} {...x} />)}</div>
        </div>
        <div>
          <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-slate-500">Team</p>
          <div className="space-y-0.5">{team.map((x) => <Item key={x.label} {...x} />)}</div>
        </div>
        <div>
          <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-slate-500">Tools</p>
          <div className="space-y-0.5">{tools.map((x) => <Item key={x.label} {...x} />)}</div>
        </div>
      </nav>

      <div className="mt-auto border-t border-slate-800 p-4">
        <div className="flex items-center gap-3 rounded-xl bg-slate-800/60 px-3 py-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-violet-400 to-brand-600 text-sm font-semibold text-white">
            JK
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-white">Jamie Kim</p>
            <p className="text-xs text-slate-500">Manager</p>
          </div>
          <button type="button" className="text-slate-500 hover:text-slate-300" aria-label="Settings">
            ⚙
          </button>
        </div>
      </div>
    </aside>
  );
}
