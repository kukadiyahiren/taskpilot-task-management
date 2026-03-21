import { Navigate } from "react-router-dom";
import { useCurrentUser } from "../hooks/useCurrentUser.js";
import { hasPermission, roleAtLeast, roleIs } from "../lib/rbac.js";
import AccessDeniedPage from "../pages/AccessDeniedPage.jsx";

/**
 * @param {{
 *   children: import("react").ReactNode,
 *   permission?: string,
 *   minRole?: string,
 *   exactRole?: string,
 * }} props
 */
export default function RequireRole({ children, permission, minRole, exactRole }) {
  const meQ = useCurrentUser();

  if (!meQ.isFetched || meQ.isPending) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-muted-foreground">
        Checking access…
      </div>
    );
  }

  const me = meQ.data;
  if (!me) {
    return <Navigate to="/login" replace />;
  }

  if (permission && !hasPermission(me, permission)) {
    return <AccessDeniedPage />;
  }

  if (minRole && !roleAtLeast(me, minRole)) {
    return <AccessDeniedPage />;
  }

  if (exactRole && !roleIs(me, exactRole)) {
    return <AccessDeniedPage />;
  }

  return children;
}
