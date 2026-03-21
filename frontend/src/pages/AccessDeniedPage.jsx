import { ShieldOff } from "lucide-react";
import { Link } from "react-router-dom";
import Layout from "../components/Layout.jsx";

export default function AccessDeniedPage() {
  return (
    <Layout onNewTask={() => {}}>
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-8 text-center">
        <ShieldOff className="h-14 w-14 text-muted-foreground" aria-hidden />
        <h1 className="font-display text-2xl font-bold text-foreground">Access denied</h1>
        <p className="max-w-md text-sm text-muted-foreground">
          You don&apos;t have permission to view this page. If you think this is a mistake, contact an administrator.
        </p>
        <Link
          to="/"
          className="mt-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90"
        >
          Back to dashboard
        </Link>
      </div>
    </Layout>
  );
}
