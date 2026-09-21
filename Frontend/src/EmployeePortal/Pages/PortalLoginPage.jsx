import { useState } from "react";
import { useNavigate } from "react-router-dom";
import portalApi from "../utils/portalAxiosInstance";
import {
  setAccessToken,
  setRefreshToken,
  setUser,
} from "../utils/portalAuthService";
import { favicon } from "../../assets";

export default function PortalLoginPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const response = await portalApi.post("/EmployeePortal/Login", {
        username,
        password,
      });

      const { accessToken, refreshToken } = response.data;
      setAccessToken(accessToken);
      setRefreshToken(refreshToken);
      setUser(accessToken);

      navigate("/portal", { replace: true });
    } catch (err) {
      if (err.response?.status === 400) {
        setError("Wrong credentials.");
      } else {
        setError("Server unavailable. Try again later.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen min-h-[100dvh] bg-gradient-to-br from-slate-900 via-slate-800 to-blue-950 flex items-center justify-center overflow-hidden px-4 py-8 sm:py-10">
      <div className="absolute w-[320px] h-[320px] sm:w-[500px] sm:h-[500px] bg-blue-700 opacity-20 rounded-full blur-[120px] sm:blur-[160px] top-[-15%] left-[-20%] pointer-events-none" />
      <div className="absolute w-[260px] h-[260px] sm:w-[400px] sm:h-[400px] bg-blue-700 opacity-10 rounded-full blur-[120px] sm:blur-[160px] bottom-[-15%] right-[-15%] pointer-events-none" />

      <div className="w-full max-w-md bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 sm:p-10 shadow-2xl z-10 space-y-6">
        <div className="text-center">
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Employee Portal
          </h1>
          <p className="text-xs sm:text-sm text-neutral-300 mt-1">
            Sign in with the credentials provided by your manager
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4 sm:space-y-5">
          <div>
            <label
              htmlFor="username"
              className="block mb-1 text-sm font-medium text-neutral-300"
            >
              Username
            </label>
            <input
              type="text"
              id="username"
              autoComplete="username"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck="false"
              inputMode="text"
              placeholder="company.name.surname"
              className="w-full px-4 py-3 text-base bg-neutral-800 text-white border border-neutral-700 rounded-lg placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-700"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block mb-1 text-sm font-medium text-neutral-300"
            >
              Password
            </label>
            <input
              type="password"
              id="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 text-base bg-neutral-800 text-white border border-neutral-700 rounded-lg placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-700"
              required
            />
          </div>

          {error && (
            <div className="text-red-400 text-sm -mt-1" role="alert" aria-live="polite">{error}</div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full min-h-[44px] py-3 px-4 bg-blue-700 hover:bg-blue-600 active:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-700"
          >
            {submitting ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </div>

      <div className="absolute bottom-[max(1rem,env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 sm:left-6 sm:translate-x-0 z-50">
        <div className="flex items-center gap-2 opacity-40 sm:opacity-30">
          <img src={favicon} className="h-6 sm:h-7" alt="Iwos logo" />
          <span className="text-2xl sm:text-[1.6rem] font-semibold whitespace-nowrap text-white">
            Iwos
          </span>
        </div>
      </div>
    </div>
  );
}
