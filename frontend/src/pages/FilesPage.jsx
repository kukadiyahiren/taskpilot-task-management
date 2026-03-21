import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout.jsx";

export default function FilesPage() {
  const navigate = useNavigate();

  return (
    <Layout onNewTask={() => navigate("/board")}>
      <div className="min-h-full bg-background p-6 lg:p-8">
        <div className="mx-auto max-w-2xl">
          <h1 className="font-display text-2xl font-bold text-foreground">Files</h1>
          <p className="mt-3 leading-relaxed text-muted-foreground">
            A dedicated file library isn&apos;t wired to the API yet. Task-related attachments are shown on each card
            (paperclip count); open a task on the board to see details and future upload support.
          </p>
          <button
            type="button"
            onClick={() => navigate("/board")}
            className="mt-8 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-700"
          >
            Go to task board
          </button>
        </div>
      </div>
    </Layout>
  );
}
