import Layout from "../components/Layout.jsx";
import { useNavigate } from "react-router-dom";

export default function MyTasksPage() {
  const navigate = useNavigate();
  return (
    <Layout onNewTask={() => navigate("/board")}>
      <div className="p-8">
        <h1 className="font-display text-2xl font-bold text-slate-900">My Tasks</h1>
        <p className="mt-2 text-slate-500">
          Filtered &quot;my work&quot; views can be wired to <code className="rounded bg-slate-100 px-1">GET /users/me/tasks</code>{" "}
          when you add authentication.
        </p>
        <button
          type="button"
          onClick={() => navigate("/board")}
          className="mt-6 rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white"
        >
          Open task board
        </button>
      </div>
    </Layout>
  );
}
