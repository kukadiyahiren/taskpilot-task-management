import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client.js";
import Layout from "../components/Layout.jsx";
import { useCurrentUser } from "../hooks/useCurrentUser.js";
import { ALL_KNOWN_PERMISSIONS, hasPermission, ROLE_LABELS } from "../lib/rbac.js";
import { initialsFromName } from "../lib/userDisplay.js";

function formatJoined(iso) {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
  } catch {
    return String(iso);
  }
}

export default function AccountPage() {
  const navigate = useNavigate();
  const meQ = useCurrentUser();
  const me = meQ.data;
  const [scopeUsers, setScopeUsers] = useState([]);
  const [usersError, setUsersError] = useState("");
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [draftPerms, setDraftPerms] = useState(() => new Set());
  const [permSaveState, setPermSaveState] = useState({ saving: false, error: "" });

  useEffect(() => {
    api
      .get("/users")
      .then((list) => {
        setScopeUsers(Array.isArray(list) ? list : []);
        setUsersError("");
      })
      .catch((e) => setUsersError(e.message || "Could not load team list"));
  }, []);

  useEffect(() => {
    if (!me?.id) return;
    setSelectedUserId((prev) => {
      if (prev != null) return prev;
      return me.id;
    });
  }, [me?.id]);

  const dropdownUsers = useMemo(() => {
    const raw = !me ? scopeUsers : scopeUsers.some((u) => u.id === me.id) ? scopeUsers : [me, ...scopeUsers];
    return [...raw].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
  }, [me, scopeUsers]);

  const selected = useMemo(() => {
    if (!me) return null;
    const fromList = dropdownUsers.find((u) => u.id === selectedUserId);
    return fromList ?? me;
  }, [me, dropdownUsers, selectedUserId]);

  useEffect(() => {
    if (!me || selectedUserId == null || dropdownUsers.length === 0) return;
    const ok = dropdownUsers.some((u) => u.id === selectedUserId);
    if (!ok) setSelectedUserId(me.id);
  }, [me, dropdownUsers, selectedUserId]);

  useEffect(() => {
    if (!selected?.permissions) return;
    setDraftPerms(new Set(selected.permissions));
    setPermSaveState({ saving: false, error: "" });
  }, [selected?.id, selected?.permissions]);

  const canGrantExtras = me && hasPermission(me, "admin.users");
  const rolePermSet = useMemo(() => new Set(selected?.role_permissions ?? []), [selected?.role_permissions]);

  const permsDirty = useMemo(() => {
    if (!selected?.permissions) return false;
    const cur = new Set(selected.permissions);
    if (cur.size !== draftPerms.size) return true;
    for (const p of cur) if (!draftPerms.has(p)) return true;
    return false;
  }, [selected?.permissions, draftPerms]);

  function toggleDraftPerm(p) {
    if (!canGrantExtras || rolePermSet.has(p)) return;
    setDraftPerms((prev) => {
      const n = new Set(prev);
      if (n.has(p)) n.delete(p);
      else n.add(p);
      return n;
    });
  }

  async function saveExtraPermissions() {
    if (!selected || !canGrantExtras) return;
    const extra = [...draftPerms].filter((p) => !rolePermSet.has(p));
    setPermSaveState({ saving: true, error: "" });
    try {
      const updated = await api.patch(`/users/${selected.id}/extra-permissions`, { extra_permissions: extra });
      setScopeUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
      setDraftPerms(new Set(updated.permissions ?? []));
      setPermSaveState({ saving: false, error: "" });
    } catch (e) {
      setPermSaveState({ saving: false, error: e.message || "Save failed" });
    }
  }

  return (
    <Layout onNewTask={() => navigate("/board")}>
      <div className="min-h-full bg-background p-6 lg:p-8">
        <div className="mx-auto max-w-3xl">
          <h1 className="font-display text-2xl font-bold text-foreground">Account</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Your profile comes from the signed-in session. Password changes are not available in this demo.
          </p>

          {meQ.isPending && <p className="mt-8 text-sm text-muted-foreground">Loading profile…</p>}
          {meQ.isError && (
            <p className="mt-8 text-sm text-destructive">Could not load your account. Try signing in again.</p>
          )}

          {me && selected && (
            <>
              <div className="mt-6">
                <label htmlFor="account-user" className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  User
                </label>
                <select
                  id="account-user"
                  value={selectedUserId ?? me.id}
                  onChange={(e) => setSelectedUserId(Number(e.target.value))}
                  className="w-full max-w-md rounded-xl border border-border bg-card px-3 py-2.5 text-sm font-medium text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  {dropdownUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.email})
                    </option>
                  ))}
                </select>
                {usersError && <p className="mt-2 text-xs text-destructive">{usersError}</p>}
              </div>

              <div className="mt-8 overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
                <div className="flex items-center gap-4 border-b border-border px-6 py-5">
                  {selected.avatar_url ? (
                    <img
                      src={selected.avatar_url}
                      alt=""
                      className="h-16 w-16 rounded-full object-cover ring-2 ring-border"
                    />
                  ) : (
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-400 to-[#7C3AED] text-xl font-bold text-white">
                      {initialsFromName(selected.name)}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-lg font-semibold text-foreground">{selected.name}</p>
                    <p className="truncate text-sm text-muted-foreground">{selected.email}</p>
                  </div>
                </div>
                <dl className="divide-y divide-border">
                  <div className="grid grid-cols-3 gap-2 px-6 py-4">
                    <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Role</dt>
                    <dd className="col-span-2 text-sm text-foreground">
                      {ROLE_LABELS[selected.role] ?? selected.role}
                    </dd>
                  </div>
                  {selected.department_id != null && (
                    <div className="grid grid-cols-3 gap-2 px-6 py-4">
                      <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Department</dt>
                      <dd className="col-span-2 text-sm text-foreground">#{selected.department_id}</dd>
                    </div>
                  )}
                  <div className="px-6 py-4">
                    <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Effective permissions
                    </dt>
                    {canGrantExtras && (
                      <p className="mt-2 text-xs text-muted-foreground">
                        As director, you can grant extra keys beyond the user&apos;s role. Permissions that already come from
                        the role are locked.
                      </p>
                    )}
                    <dd className="mt-3">
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                        {ALL_KNOWN_PERMISSIONS.map((p) => {
                          const fromRole = rolePermSet.has(p);
                          const on = draftPerms.has(p);
                          const locked = !canGrantExtras || fromRole;
                          return (
                            <label
                              key={p}
                              className={`inline-flex items-center gap-2 rounded-lg border border-border/80 px-2.5 py-1.5 ${
                                fromRole ? "bg-primary/5" : "bg-muted/40"
                              } ${locked ? "cursor-default" : "cursor-pointer"}`}
                            >
                              <input
                                type="checkbox"
                                checked={on}
                                disabled={locked}
                                onChange={() => toggleDraftPerm(p)}
                                className="rounded border-border text-primary focus:ring-primary/40 disabled:cursor-default disabled:opacity-100"
                                aria-label={p}
                              />
                              <span className="font-mono text-[10px] leading-tight text-foreground">{p}</span>
                              {fromRole && (
                                <span className="text-[9px] font-semibold uppercase text-muted-foreground">role</span>
                              )}
                            </label>
                          );
                        })}
                      </div>
                      {canGrantExtras && (
                        <div className="mt-4 flex flex-wrap items-center gap-3">
                          <button
                            type="button"
                            disabled={!permsDirty || permSaveState.saving}
                            onClick={saveExtraPermissions}
                            className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
                          >
                            {permSaveState.saving ? "Saving…" : "Save extra permissions"}
                          </button>
                          {permSaveState.error && (
                            <span className="text-xs text-destructive">{permSaveState.error}</span>
                          )}
                        </div>
                      )}
                    </dd>
                  </div>
                  <div className="grid grid-cols-3 gap-2 px-6 py-4">
                    <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Member since</dt>
                    <dd className="col-span-2 text-sm text-foreground">{formatJoined(selected.created_at)}</dd>
                  </div>
                  <div className="grid grid-cols-3 gap-2 px-6 py-4">
                    <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">User ID</dt>
                    <dd className="col-span-2 font-mono text-sm text-foreground">{selected.id}</dd>
                  </div>
                </dl>
              </div>
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}
