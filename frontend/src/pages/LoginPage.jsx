import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Eye, EyeOff, Lock, Mail, Users } from "lucide-react";
import LoginHero from "../components/LoginHero.jsx";
import ThemeToggle from "../components/ThemeToggle.jsx";
import { Spinner } from "../components/ui/spinner.jsx";
import { DEMO_LOGIN_EMAIL, DEMO_LOGIN_PASSWORD, DEMO_RBAC_ACCOUNTS } from "../constants.js";
import * as authApi from "../api/auth.js";
import { authMeQueryKey } from "../hooks/useCurrentUser.js";
import { clearAccessToken, getAccessToken, setAccessToken } from "../lib/authStorage.js";

function parseApiError(text) {
  try {
    const j = JSON.parse(text);
    if (typeof j.detail === "string") return j.detail;
    if (Array.isArray(j.detail))
      return j.detail.map((e) => (typeof e.msg === "string" ? e.msg : JSON.stringify(e))).join(", ");
  } catch {
    /* ignore */
  }
  return text || "Something went wrong";
}

export default function LoginPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState("signin");
  /** auth: sign in / create account; forgot: request token; reset: new password */
  const [phase, setPhase] = useState("auth");
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  /** Tracks session so we can show / hide "already signed in" after sign-out on this page */
  const [sessionActive, setSessionActive] = useState(() => Boolean(getAccessToken()));

  function signOutOnThisPage() {
    queryClient.removeQueries({ queryKey: authMeQueryKey });
    clearAccessToken();
    setSessionActive(false);
  }

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    const t = searchParams.get("reset") || searchParams.get("token");
    if (!t) return;
    setPhase("reset");
    setResetToken(decodeURIComponent(t));
    const next = new URLSearchParams(searchParams);
    next.delete("reset");
    next.delete("token");
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (tab === "signup") {
        const data = await authApi.register({
          name: name.trim(),
          email: email.trim(),
          password,
        });
        setAccessToken(data.access_token, remember);
        if (data.user) queryClient.setQueryData(authMeQueryKey, data.user);
      } else {
        const data = await authApi.login({ email: email.trim(), password });
        setAccessToken(data.access_token, remember);
        if (data.user) queryClient.setQueryData(authMeQueryKey, data.user);
      }
      navigate("/", { replace: true });
    } catch (err) {
      setError(parseApiError(err.message));
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccessMessage("");
    setLoading(true);
    try {
      const data = await authApi.forgotPassword({ email: email.trim() });
      if (data.reset_token) {
        setResetToken(data.reset_token);
        setPhase("reset");
        setNewPassword("");
        setConfirmPassword("");
        setSuccessMessage("");
      } else {
        setSuccessMessage(data.message);
      }
    } catch (err) {
      setError(parseApiError(err.message));
    } finally {
      setLoading(false);
    }
  }

  async function handleResetSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccessMessage("");
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      await authApi.resetPassword({ token: resetToken.trim(), new_password: newPassword });
      setSuccessMessage("Password updated. You can sign in now.");
      setPhase("auth");
      setTab("signin");
      setPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(parseApiError(err.message));
    } finally {
      setLoading(false);
    }
  }

  function goToAuth() {
    setPhase("auth");
    setError("");
    setSuccessMessage("");
  }

  return (
    <div className="fixed inset-0 z-[100] flex flex-col overflow-hidden bg-background font-inter text-foreground antialiased transition-colors duration-200">
      <div className="absolute right-4 top-4 z-20 sm:right-6 sm:top-6">
        <ThemeToggle />
      </div>
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <LoginHero />

        <section
          className="flex min-h-0 flex-1 flex-col justify-center overflow-y-auto overscroll-y-none bg-background px-6 py-6 sm:px-10 sm:py-8 lg:w-1/2 lg:overflow-hidden lg:px-14 lg:py-8 xl:px-20"
          aria-label="Sign in"
        >
          <div className="mx-auto w-full max-w-md shrink-0">
            {sessionActive && (
              <div className="mb-4 rounded-xl border border-border bg-muted/80 px-4 py-3 text-sm text-foreground">
                <p className="font-medium">You&apos;re already signed in.</p>
                <p className="mt-1 text-muted-foreground">
                  <Link to="/" className="font-semibold text-primary hover:underline">
                    Go to dashboard
                  </Link>
                  {" · "}
                  <button
                    type="button"
                    onClick={signOutOnThisPage}
                    className="font-semibold text-primary hover:underline"
                  >
                    Sign out
                  </button>{" "}
                  to use another account.
                </p>
              </div>
            )}
            {phase === "auth" && (
              <div className="mb-5 flex rounded-xl bg-muted p-1 shadow-inner">
                <button
                  type="button"
                  onClick={() => setTab("signin")}
                  className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition-all duration-200 ${tab === "signin"
                      ? "bg-card text-foreground shadow-md"
                      : "text-muted-foreground hover:text-foreground"
                    }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => setTab("signup")}
                  className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition-all duration-200 ${tab === "signup"
                      ? "bg-card text-foreground shadow-md"
                      : "text-muted-foreground hover:text-foreground"
                    }`}
                >
                  Create Account
                </button>
              </div>
            )}

            <div className="space-y-2">
              <h2 className="text-2xl font-bold tracking-tight text-foreground">
                {phase === "forgot"
                  ? "Reset password"
                  : phase === "reset"
                    ? "Choose a new password"
                    : tab === "signin"
                      ? "Welcome back"
                      : "Create your account"}
              </h2>
              <p className="text-muted-foreground">
                {phase === "forgot"
                  ? "Enter your work email. If an account exists, you can set a new password on the next step."
                  : phase === "reset"
                    ? "Use the reset code from the previous step (or from your email when SMTP is configured)."
                    : tab === "signin"
                      ? "Sign in to your TaskFlow workspace"
                      : "Start your TaskFlow workspace in seconds"}
              </p>
            </div>

            <div className="mt-6">
              {phase !== "auth" && (
                <button
                  type="button"
                  onClick={() => (phase === "reset" ? setPhase("forgot") : goToAuth())}
                  className="mb-4 text-sm font-medium text-brand-600 transition hover:text-brand-700"
                >
                  {phase === "reset" ? "← Request a new code" : "← Back to sign in"}
                </button>
              )}

              {error && (
                <div
                  className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-800 dark:text-red-200"
                  role="alert"
                >
                  {error}
                </div>
              )}

              {successMessage && (
                <div
                  className="mb-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-900 dark:text-emerald-100"
                  role="status"
                >
                  {successMessage}
                </div>
              )}

              {phase === "forgot" && (
                <form onSubmit={handleForgotSubmit} className="space-y-4">
                  <div>
                    <label htmlFor="forgot-email" className="mb-1.5 block text-sm font-medium text-foreground">
                      Work Email
                    </label>
                    <div className="relative">
                      <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                      <input
                        id="forgot-email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@company.com"
                        className="w-full rounded-xl border border-border bg-card py-3 pl-11 pr-4 text-foreground shadow-sm outline-none ring-brand-500/0 transition placeholder:text-muted-foreground focus:border-brand-400 focus:ring-4 focus:ring-brand-500/15"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    aria-busy={loading}
                    className="group flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 py-3.5 text-sm font-semibold text-white shadow-lg shadow-brand-500/25 transition hover:from-brand-500 hover:to-indigo-500 hover:shadow-xl hover:shadow-brand-500/30 focus:outline-none focus:ring-4 focus:ring-brand-500/30 active:scale-[0.99] disabled:opacity-60"
                  >
                    {loading && <Spinner size="md" className="text-white" />}
                    {loading ? "Sending…" : "Send reset instructions"}
                  </button>
                </form>
              )}

              {phase === "reset" && (
                <form onSubmit={handleResetSubmit} className="space-y-4">
                  <div>
                    <label htmlFor="reset-token" className="mb-1.5 block text-sm font-medium text-foreground">
                      Reset code
                    </label>
                    <input
                      id="reset-token"
                      name="reset-token"
                      type="text"
                      autoComplete="off"
                      required
                      value={resetToken}
                      onChange={(e) => setResetToken(e.target.value)}
                      placeholder="Paste your reset code"
                      className="w-full rounded-xl border border-border bg-card px-4 py-3 font-mono text-sm text-foreground shadow-sm outline-none ring-brand-500/0 transition placeholder:text-muted-foreground focus:border-brand-400 focus:ring-4 focus:ring-brand-500/15"
                    />
                  </div>
                  <div>
                    <label htmlFor="new-password" className="mb-1.5 block text-sm font-medium text-foreground">
                      New password
                    </label>
                    <div className="relative">
                      <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                      <input
                        id="new-password"
                        name="new-password"
                        type={showPassword ? "text" : "password"}
                        autoComplete="new-password"
                        required
                        minLength={6}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="At least 6 characters"
                        className="w-full rounded-xl border border-border bg-card py-3 pl-11 pr-12 text-foreground shadow-sm outline-none ring-brand-500/0 transition placeholder:text-muted-foreground focus:border-brand-400 focus:ring-4 focus:ring-brand-500/15"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label htmlFor="confirm-password" className="mb-1.5 block text-sm font-medium text-foreground">
                      Confirm new password
                    </label>
                    <div className="relative">
                      <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                      <input
                        id="confirm-password"
                        name="confirm-password"
                        type={showPassword ? "text" : "password"}
                        autoComplete="new-password"
                        required
                        minLength={6}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Repeat password"
                        className="w-full rounded-xl border border-border bg-card py-3 pl-11 pr-12 text-foreground shadow-sm outline-none ring-brand-500/0 transition placeholder:text-muted-foreground focus:border-brand-400 focus:ring-4 focus:ring-brand-500/15"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    aria-busy={loading}
                    className="group flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 py-3.5 text-sm font-semibold text-white shadow-lg shadow-brand-500/25 transition hover:from-brand-500 hover:to-indigo-500 hover:shadow-xl hover:shadow-brand-500/30 focus:outline-none focus:ring-4 focus:ring-brand-500/30 active:scale-[0.99] disabled:opacity-60"
                  >
                    {loading && <Spinner size="md" className="text-white" />}
                    {loading ? "Updating…" : "Update password"}
                  </button>
                </form>
              )}

              {phase === "auth" && (
                <form onSubmit={handleSubmit} className="space-y-4">
                  {tab === "signup" && (
                    <div>
                      <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-foreground">
                        Full name
                      </label>
                      <div className="relative">
                        <Users className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                        <input
                          id="name"
                          name="name"
                          type="text"
                          autoComplete="name"
                          required={tab === "signup"}
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="Jamie Kim"
                          className="w-full rounded-xl border border-border bg-card py-3 pl-11 pr-4 text-foreground shadow-sm outline-none ring-brand-500/0 transition placeholder:text-muted-foreground focus:border-brand-400 focus:ring-4 focus:ring-brand-500/15 dark:bg-card"
                        />
                      </div>
                    </div>
                  )}

                  <div>
                    <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-foreground">
                      Work Email
                    </label>
                    <div className="relative">
                      <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                      <input
                        id="email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@company.com"
                        className="w-full rounded-xl border border-border bg-card py-3 pl-11 pr-4 text-foreground shadow-sm outline-none ring-brand-500/0 transition placeholder:text-muted-foreground focus:border-brand-400 focus:ring-4 focus:ring-brand-500/15"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="mb-1.5 flex items-center justify-between gap-2">
                      <label htmlFor="password" className="text-sm font-medium text-foreground">
                        Password
                      </label>
                      {tab === "signin" && (
                        <button
                          type="button"
                          className="text-sm font-medium text-brand-600 transition hover:text-brand-700"
                          onClick={() => {
                            setPhase("forgot");
                            setError("");
                            setSuccessMessage("");
                          }}
                        >
                          Forgot password?
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                      <input
                        id="password"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        autoComplete={tab === "signin" ? "current-password" : "new-password"}
                        required
                        minLength={tab === "signup" ? 6 : undefined}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Your password"
                        className="w-full rounded-xl border border-border bg-card py-3 pl-11 pr-12 text-foreground shadow-sm outline-none ring-brand-500/0 transition placeholder:text-muted-foreground focus:border-brand-400 focus:ring-4 focus:ring-brand-500/15"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                    {tab === "signup" && <p className="mt-1 text-xs text-muted-foreground">At least 6 characters.</p>}
                  </div>

                  {tab === "signin" && (
                    <label className="flex cursor-pointer items-center gap-2.5 text-sm text-muted-foreground">
                      <input
                        type="checkbox"
                        checked={remember}
                        onChange={(e) => setRemember(e.target.checked)}
                        className="h-4 w-4 rounded border-border text-brand-600 focus:ring-brand-500"
                      />
                      Remember me for 30 days
                    </label>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    aria-busy={loading}
                    className="group flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 py-3.5 text-sm font-semibold text-white shadow-lg shadow-brand-500/25 transition hover:from-brand-500 hover:to-indigo-500 hover:shadow-xl hover:shadow-brand-500/30 focus:outline-none focus:ring-4 focus:ring-brand-500/30 active:scale-[0.99] disabled:opacity-60"
                  >
                    {loading && <Spinner size="md" className="text-white" />}
                    {loading ? (
                      tab === "signin" ? "Signing in…" : "Creating account…"
                    ) : tab === "signin" ? (
                      <>
                        Sign In
                        <span className="transition group-hover:translate-x-0.5" aria-hidden>
                          →
                        </span>
                      </>
                    ) : (
                      "Create account"
                    )}
                  </button>
                </form>
              )}
            </div>

            <div className="mt-5 rounded-2xl border border-primary/20 bg-primary/5 p-3 text-sm text-foreground shadow-sm dark:border-primary/30 dark:bg-primary/10">
              <p className="mb-2 flex items-center gap-2 font-semibold text-primary">
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary/20 text-xs text-primary">
                  ⓘ
                </span>
                Demo account
              </p>
              <p className="text-muted-foreground">
                Email:{" "}
                <code className="rounded bg-card px-1.5 py-0.5 font-mono text-xs text-foreground">
                  {DEMO_LOGIN_EMAIL}
                </code>
              </p>
              <p className="mt-1 text-muted-foreground">
                Password:{" "}
                <code className="rounded bg-card px-1.5 py-0.5 font-mono text-xs text-foreground">
                  {DEMO_LOGIN_PASSWORD}
                </code>
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                Seeded users use the same password after migration +{" "}
                <code className="rounded bg-muted px-1">python scripts/set_demo_passwords.py</code> on old DBs.
              </p>
              <p className="mt-3 text-xs font-semibold text-foreground">RBAC demo (password: demo)</p>
              <ul className="mt-1 space-y-0.5 text-xs text-muted-foreground">
                {DEMO_RBAC_ACCOUNTS.map(({ email, label }) => (
                  <li key={email}>
                    <span className="text-foreground">{label}</span>:{" "}
                    <code className="rounded bg-card px-1 font-mono text-[10px]">{email}</code>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
