import { useState } from "react";
import { cn } from "../lib/utils.js";
import Sidebar from "./Sidebar.jsx";
import TopNav from "./TopNav.jsx";

/**
 * @param {{ children: React.ReactNode, onNewTask?: () => void, newTaskLoading?: boolean, mainClassName?: string }} props
 * mainClassName — e.g. `overflow-hidden` for Kanban (nested scroll breaks @hello-pangea/dnd when main scrolls).
 */
export default function Layout({ children, onNewTask, newTaskLoading = false, mainClassName }) {
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
        <main className={cn("min-h-0 flex-1 overflow-auto", mainClassName)}>{children}</main>
      </div>
    </div>
  );
}
