import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  AlertCircle,
  Calendar,
  CalendarCheck,
  CalendarCheckIcon,
  CalendarRangeIcon,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  Users,
} from "lucide-react";
import { favicon } from "./assets";
import api from "./utils/axiosInstance";
import {
  setAccessToken,
  setRefreshToken,
  setUser,
  setRememberMe,
  getRememberedUsername,
  setRememberedUsername,
} from "./utils/authService";

const highlights = [
  {
    icon: CalendarRangeIcon,
    title: "Smart Scheduling",
    body: "Build and adjust schedules in minutes. Iwos gives managers a clear, real-time view of coverage across every shift and role.",
  },
  {
    icon: CalendarCheckIcon,
    title: "Team Visibility",
    body: "Know who's available, who's on, and who's off — at a glance. Eliminate the back-and-forth and keep your workforce running smoothly.",
  },
  {
    icon: Users,
    title: "Built for Your Team, Too",
    body: "Employees get their own portal — to view schedules, request swaps, and stay updated. No calls, no confusion.",
  },
];

export default function LoginPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [stayLoggedIn, setStayLoggedIn] = useState(false);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const remembered = getRememberedUsername();
    if (remembered) {
      setUsername(remembered);
      setStayLoggedIn(true);
    }
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    setError(null);

    try {
      // stayLoggedIn=true → localStorage (survives browser close); false → sessionStorage.
      setRememberMe(stayLoggedIn);
      setRememberedUsername(stayLoggedIn ? username : "");

      const response = await api.get(
        `/Account/GetTokenForUser?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`,
      );

      const { accessToken, refreshToken } = response.data;
      setAccessToken(accessToken);
      setRefreshToken(refreshToken);
      setUser(accessToken);

      navigate("/");
    } catch (err) {
      if (err.response?.status === 400) {
        setError("Wrong credentials. Please check your username and password.");
      } else {
        setError("We couldn't reach the server. Please try again in a moment.");
      }
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* ── Left brand panel ─────────────────────────────────────────────── */}
      <aside className="hidden lg:flex relative flex-col justify-between w-1/2 bg-gradient-to-br from-blue-950 via-neutral-900 to-slate-900 text-white p-12 overflow-hidden">
        <div className="absolute w-[500px] h-[500px] bg-blue-700 opacity-20 rounded-full blur-[160px] top-[-15%] left-[-15%] pointer-events-none" />
        <div className="absolute w-[420px] h-[420px] bg-indigo-600 opacity-10 rounded-full blur-[160px] bottom-[-20%] right-[-10%] pointer-events-none" />

        <div className="relative z-10 flex items-center gap-2.5">
          <img src={favicon} className="h-8" alt="Iwos" />
          <span className="text-2xl font-semibold tracking-tight">Iwos</span>
        </div>

        <div className="relative z-10 max-w-md space-y-8">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-blue-300/70 font-semibold mb-3">
              Welcome to Iwos
            </p>
            <h2 className="text-4xl font-bold tracking-tight leading-tight">
              Shift scheduling, simplified.
            </h2>
            <p className="text-base text-neutral-300 mt-3 leading-relaxed">
              Iwos gives managers the tools to plan, and employees the visibility to stay in sync.
            </p>
          </div>

          <ul className="space-y-5">
            {highlights.map(({ icon: Icon, title, body }) => (
              <li key={title} className="flex gap-3">
                <div className="w-9 h-9 rounded-lg bg-white/10 border border-white/10 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-4 h-4 text-blue-300" />
                </div>
                <div className="space-y-0.5">
                  <p className="text-sm font-semibold text-white">{title}</p>
                  <p className="text-xs text-neutral-400 leading-relaxed">{body}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative z-10 text-xs text-neutral-500">
          © {new Date().getFullYear()} Iwos. Made for modern teams.
        </p>
      </aside>

      {/* ── Right form panel ─────────────────────────────────────────────── */}
      <main className="flex-1 flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md">
          {/* mobile logo */}
          <div className="flex lg:hidden items-center gap-2 mb-8">
            <img src={favicon} className="h-7" alt="Iwos" />
            <span className="text-xl font-semibold text-slate-900 tracking-tight">Iwos</span>
          </div>

          <div className="space-y-1.5 mb-8">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Welcome to Iwos</h1>
            <p className="text-sm text-slate-500">
              Sign in to continue managing your team.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5" noValidate>
            {/* Username */}
            <div className="space-y-1.5">
              <label htmlFor="username" className="block text-sm font-medium text-slate-700">
                Username
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  id="username"
                  autoComplete="username"
                  placeholder="you@example.com"
                  className="w-full pl-9 pr-3 py-2.5 text-sm bg-white text-slate-900 border border-slate-200 rounded-lg placeholder-slate-400 transition-colors focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:opacity-60 disabled:cursor-not-allowed"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={submitting}
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="block text-sm font-medium text-slate-700">
                  Password
                </label>
                <a href="#" tabIndex={-1} className="text-xs font-medium text-blue-700 hover:text-blue-800 hover:underline">
                  Forgot password?
                </a>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-10 py-2.5 text-sm bg-white text-slate-900 border border-slate-200 rounded-lg placeholder-slate-400 transition-colors focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:opacity-60 disabled:cursor-not-allowed"
                  disabled={submitting}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  tabIndex={-1}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Stay logged in */}
            <label className="flex items-start gap-2.5 cursor-pointer select-none group">
              <input
                type="checkbox"
                className="mt-0.5 w-4 h-4 rounded border-slate-300 text-blue-700 focus:ring-2 focus:ring-blue-100 focus:ring-offset-0 cursor-pointer"
                checked={stayLoggedIn}
                onChange={(e) => setStayLoggedIn(e.target.checked)}
                disabled={submitting}
              />
              <div>
                <p className="text-sm font-medium text-slate-700 group-hover:text-slate-900 transition-colors">
                  Stay logged in
                </p>
                <p className="text-xs text-slate-500">
                  Skip signing in next time on this device.
                </p>
              </div>
            </label>

            {/* Error */}
            {error && (
              <div className="flex items-start gap-2.5 px-3 py-2.5 rounded-lg bg-red-50 border border-red-100">
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-red-700 leading-relaxed">{error}</p>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 px-4 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-70 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {submitting ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-8">
            New to Iwos?{" "}
            <Link to="/demo" className="font-medium text-blue-700 hover:text-blue-800 hover:underline">
              Book a demo
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
