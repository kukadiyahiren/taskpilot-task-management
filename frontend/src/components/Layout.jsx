import { useState } from "react";
import Sidebar from "./Sidebar.jsx";
import TopNav from "./TopNav.jsx";

export default function Layout({ children, onNewTask, newTaskLoading = false }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex h-screen min-h-0 w-full overflow-hidden bg-background font-inter text-foreground transition-colors duration-200">
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
          newTaskLoading={newTaskLoading}
        />
        <main className="min-h-0 flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
