import Sidebar from "./Sidebar.jsx";
import TopNav from "./TopNav.jsx";

export default function Layout({ children, onNewTask }) {
  return (
    <div className="flex h-screen min-h-0 w-full overflow-hidden bg-slate-50">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopNav onNewTask={onNewTask} />
        <main className="min-h-0 flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
