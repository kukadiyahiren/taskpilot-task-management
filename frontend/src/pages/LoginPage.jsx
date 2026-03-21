import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, Github, Lock, Mail, Users } from "lucide-react";
import LoginHero from "../components/LoginHero.jsx";
import { DEMO_LOGIN_EMAIL, DEMO_LOGIN_PASSWORD } from "../constants.js";

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
  const [tab, setTab] = useState("signin");
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [remember, setRemember] = useState(true);

  function handleSubmit(e) {
    e.preventDefault();
    // Backend has no JWT yet; mark session for future auth wiring.
    sessionStorage.setItem("taskpilot_session", "1");
    if (remember) {
      localStorage.setItem("taskpilot_remember", "1");
    } else {
      localStorage.removeItem("taskpilot_remember");
    }
    navigate("/", { replace: true });
  }

  return (
    <div className="font-inter min-h-screen bg-white text-slate-900 antialiased">
      <div className="flex min-h-screen flex-col lg:flex-row">
        <LoginHero />

        {/* —— Right: Auth —— */}
        <section
          className="flex flex-1 flex-col justify-center bg-white px-6 py-10 sm:px-10 lg:w-1/2 lg:px-14 xl:px-20"
          aria-label="Sign in"
        >
          <div className="mx-auto w-full max-w-md">
            {/* Tabs */}
            <div className="mb-8 flex rounded-xl bg-slate-100/90 p-1 shadow-inner">
              <button
                type="button"
                onClick={() => setTab("signin")}
                className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition-all duration-200 ${
                  tab === "signin"
                    ? "bg-white text-slate-900 shadow-md"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => setTab("signup")}
                className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition-all duration-200 ${
                  tab === "signup"
                    ? "bg-white text-slate-900 shadow-md"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                Create Account
              </button>
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-bold tracking-tight text-slate-900">
                {tab === "signin" ? "Welcome back" : "Create your account"}
              </h2>
              <p className="text-slate-500">
                {tab === "signin"
                  ? "Sign in to your TaskFlow workspace"
                  : "Start your TaskFlow workspace in seconds"}
              </p>
            </div>

            {/* Social */}
            <div className="mt-8 grid grid-cols-2 gap-3">
              <button
                type="button"
                className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-3 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 hover:shadow"
              >
                <GoogleIcon />
                Google
              </button>
              <button
                type="button"
                className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-3 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 hover:shadow"
              >
                <Github className="h-5 w-5 text-slate-900" strokeWidth={1.75} />
                GitHub
              </button>
            </div>

            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center" aria-hidden>
                <div className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-xs font-medium uppercase tracking-wide">
                <span className="bg-white px-3 text-slate-400">or continue with email</span>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {tab === "signup" && (
                <div>
                  <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-slate-700">
                    Full name
                  </label>
                  <div className="relative">
                    <Users className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                    <input
                      id="name"
                      name="name"
                      type="text"
                      autoComplete="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Jamie Kim"
                      className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-slate-900 shadow-sm outline-none ring-brand-500/0 transition placeholder:text-slate-400 focus:border-brand-400 focus:ring-4 focus:ring-brand-500/15"
                    />
                  </div>
                </div>
              )}

              <div>
                <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-slate-700">
                  Work Email
                </label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-slate-900 shadow-sm outline-none ring-brand-500/0 transition placeholder:text-slate-400 focus:border-brand-400 focus:ring-4 focus:ring-brand-500/15"
                  />
                </div>
              </div>

              <div>
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <label htmlFor="password" className="text-sm font-medium text-slate-700">
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
                  <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete={tab === "signin" ? "current-password" : "new-password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Your password"
                    className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-12 text-slate-900 shadow-sm outline-none ring-brand-500/0 transition placeholder:text-slate-400 focus:border-brand-400 focus:ring-4 focus:ring-brand-500/15"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              {tab === "signin" && (
                <label className="flex cursor-pointer items-center gap-2.5 text-sm text-slate-600">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                  />
                  Remember me for 30 days
                </label>
              )}

              <button
                type="submit"
                className="group flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 py-3.5 text-sm font-semibold text-white shadow-lg shadow-brand-500/25 transition hover:from-brand-500 hover:to-indigo-500 hover:shadow-xl hover:shadow-brand-500/30 focus:outline-none focus:ring-4 focus:ring-brand-500/30 active:scale-[0.99]"
              >
                {tab === "signin" ? (
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

            {/* Demo credentials — aligned with backend seed user */}
            <div className="mt-8 rounded-2xl border border-brand-100 bg-brand-50/90 p-4 text-sm text-slate-700 shadow-sm">
              <p className="mb-2 flex items-center gap-2 font-semibold text-brand-900">
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-brand-200/80 text-xs text-brand-800">
                  ⓘ
                </span>
                Demo credentials
              </p>
              <p className="text-slate-600">
                Email:{" "}
                <code className="rounded bg-white/80 px-1.5 py-0.5 font-mono text-xs text-slate-800">
                  {DEMO_LOGIN_EMAIL}
                </code>
              </p>
              <p className="mt-1 text-slate-600">
                Password:{" "}
                <code className="rounded bg-white/80 px-1.5 py-0.5 font-mono text-xs text-slate-800">
                  {DEMO_LOGIN_PASSWORD}
                </code>
                <span className="ml-1 text-xs text-slate-500">(UI demo; API auth not enabled yet)</span>
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
