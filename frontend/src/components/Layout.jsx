import { useEffect, useState } from "react";
import Sidebar from "./Sidebar.jsx";
import TopNav from "./TopNav.jsx";

export default function Layout({ children, onNewTask }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [dark, setDark] = useState(false);

  useEffect(() => {
    if (dark) document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
  }, [dark]);

  return (
    <div className="flex h-screen min-h-0 w-full overflow-hidden bg-[#f8fafc] font-inter text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <Sidebar
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((c) => !c)}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />
      <div className="flex min-w-0 flex-1 flex-col lg:pl-0">
        <TopNav
          onNewTask={onNewTask}
          onOpenMobileMenu={() => setMobileOpen(true)}
          dark={dark}
          onToggleDark={() => setDark((d) => !d)}
        />
        <main className="min-h-0 flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
