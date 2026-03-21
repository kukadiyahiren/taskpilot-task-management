import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout.jsx";
import { api } from "../api/client.js";
import { initialsFromName } from "../lib/userDisplay.js";

export default function MembersPage() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get("/users")
      .then(setUsers)
      .catch((e) => setError(e.message || "Could not load members"));
  }, []);

  return (
    <Layout onNewTask={() => navigate("/board")}>
      <div className="min-h-full bg-[#f8fafc] p-6 lg:p-8">
        <div className="mx-auto max-w-3xl">
          <h1 className="font-display text-2xl font-bold text-slate-900">Team members</h1>
          <p className="mt-2 text-slate-600">
            Everyone listed here can be assigned to tasks. Invite more people from the{" "}
            <button
              type="button"
              onClick={() => navigate("/board")}
              className="font-semibold text-brand-600 underline decoration-brand-300 underline-offset-2 hover:text-brand-700"
            >
              task board
            </button>{" "}
            (<span className="whitespace-nowrap">Add teammate</span>).
          </p>

          {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

          <ul className="mt-8 space-y-3">
            {users.map((u) => (
              <li
                key={u.id}
                className="flex items-center gap-4 rounded-2xl border border-slate-200/90 bg-white px-4 py-3 shadow-sm"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-400 to-brand-600 text-sm font-bold text-white">
                  {initialsFromName(u.name)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-slate-900">{u.name}</p>
                  <p className="truncate text-sm text-slate-500">{u.email}</p>
                </div>
                <span className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                  {u.role}
                </span>
              </li>
            ))}
          </ul>

          {users.length === 0 && !error && (
            <p className="mt-8 text-sm text-slate-500">No members returned from the API.</p>
          )}
        </div>
      </div>
    </Layout>
  );
}
