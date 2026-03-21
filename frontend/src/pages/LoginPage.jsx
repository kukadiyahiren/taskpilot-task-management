import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Github, Lock, Mail, Users } from "lucide-react";
import LoginHero from "../components/LoginHero.jsx";
import ThemeToggle from "../components/ThemeToggle.jsx";
import { DEMO_LOGIN_EMAIL, DEMO_LOGIN_PASSWORD } from "../constants.js";
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

function GoogleIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

export default function LoginPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState("signin");
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
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
            <div className="mb-5 flex rounded-xl bg-muted p-1 shadow-inner">
              <button
                type="button"
                onClick={() => setTab("signin")}
                className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition-all duration-200 ${
                  tab === "signin"
                    ? "bg-card text-foreground shadow-md"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => setTab("signup")}
                className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition-all duration-200 ${
                  tab === "signup"
                    ? "bg-card text-foreground shadow-md"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Create Account
              </button>
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-bold tracking-tight text-foreground">
                {tab === "signin" ? "Welcome back" : "Create your account"}
              </h2>
              <p className="text-muted-foreground">
                {tab === "signin"
                  ? "Sign in to your TaskFlow workspace"
                  : "Start your TaskFlow workspace in seconds"}
              </p>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                type="button"
                className="flex items-center justify-center gap-2 rounded-xl border border-border bg-card py-3 text-sm font-medium text-foreground shadow-sm transition hover:border-border hover:bg-muted hover:shadow"
              >
                <GoogleIcon />
                Google
              </button>
              <button
                type="button"
                className="flex items-center justify-center gap-2 rounded-xl border border-border bg-card py-3 text-sm font-medium text-foreground shadow-sm transition hover:border-border hover:bg-muted hover:shadow"
              >
                <Github className="h-5 w-5 text-foreground" strokeWidth={1.75} />
                GitHub
              </button>
            </div>

            <div className="relative my-5">
              <div className="absolute inset-0 flex items-center" aria-hidden>
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs font-medium uppercase tracking-wide">
                <span className="bg-background px-3 text-muted-foreground">or continue with email</span>
              </div>
            </div>

            {error && (
              <div
                className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-800 dark:text-red-200"
                role="alert"
              >
                {error}
              </div>
            )}

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
                    <a
                      href="#forgot"
                      className="text-sm font-medium text-brand-600 transition hover:text-brand-700"
                      onClick={(e) => e.preventDefault()}
                    >
                      Forgot password?
                    </a>
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
                className="group flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 py-3.5 text-sm font-semibold text-white shadow-lg shadow-brand-500/25 transition hover:from-brand-500 hover:to-indigo-500 hover:shadow-xl hover:shadow-brand-500/30 focus:outline-none focus:ring-4 focus:ring-brand-500/30 active:scale-[0.99] disabled:opacity-60"
              >
                {loading ? (
                  "Please wait…"
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
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
