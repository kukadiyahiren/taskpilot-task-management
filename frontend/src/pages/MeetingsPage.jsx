import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout.jsx";
import { api } from "../api/client.js";
import { WORKSPACE_ID } from "../constants.js";

function formatWhen(iso) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default function MeetingsPage() {
  const navigate = useNavigate();
  const [meetings, setMeetings] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get(`/workspaces/${WORKSPACE_ID}/meetings`)
      .then(setMeetings)
      .catch((e) => setError(e.message || "Could not load meetings"));
  }, []);

  return (
    <Layout onNewTask={() => navigate("/board")}>
      <div className="min-h-full bg-background p-6 lg:p-8">
        <div className="mx-auto max-w-3xl">
          <h1 className="font-display text-2xl font-bold text-foreground">Meetings</h1>
          <p className="mt-2 text-muted-foreground">Scheduled sessions for this workspace (from the API).</p>

          {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

          <ul className="mt-8 space-y-3">
            {meetings.map((m) => (
              <li
                key={m.id}
                className="rounded-2xl border border-border bg-card px-4 py-4 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="font-semibold text-foreground">{m.title}</p>
                  <span className="rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-semibold capitalize text-violet-800">
                    {m.status}
                  </span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{formatWhen(m.start_time)}</p>
                {m.participant_count > 0 && (
                  <p className="mt-1 text-xs text-muted-foreground">{m.participant_count} participants</p>
                )}
              </li>
            ))}
          </ul>

          {meetings.length === 0 && !error && (
            <p className="mt-8 text-sm text-muted-foreground">No meetings scheduled yet.</p>
          )}
        </div>
      </div>
    </Layout>
  );
}
