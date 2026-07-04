import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { ShieldCheck, Mail, Lock, Eye, EyeOff, Loader2 } from "lucide-react";

const AdminLogin = () => {
  const navigate = useNavigate();
  const [input, setInput] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setInput((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const api = "http://localhost:7007/admin/login";
      const res = await axios.post(api, input);
      // Backend returns { _id, name, email, role, token } on successful login
      const { token, ...admin } = res.data;
      localStorage.setItem("adminToken", token);
      localStorage.setItem("adminInfo", JSON.stringify(admin));
      navigate("/admin/overview");
    } catch (err) {
      setError(
        err?.response?.data?.message || "Invalid email or password. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-slate-950 px-4 text-slate-200">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-1/3 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-500/10 blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm">
        {/* Brand */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-400/10">
            <ShieldCheck className="h-6 w-6 text-cyan-400" />
          </div>
          <div className="text-center">
            <h1 className="text-lg font-semibold text-slate-50">Admin Console</h1>
            <p className="mt-1 text-xs text-slate-500">Sign in to manage the trading desk</p>
          </div>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl shadow-black/30">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Email */}
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-slate-400">
                <Mail className="h-3.5 w-3.5" />
                Email Address
              </label>
              <input
                type="email"
                name="email"
                value={input.email}
                onChange={handleChange}
                placeholder="you@traderdesk.io"
                required
                autoComplete="email"
                className="w-full rounded-xl border border-slate-800 bg-slate-950/60 px-3.5 py-2.5 text-sm text-slate-200 placeholder:text-slate-500 outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30"
              />
            </div>

            {/* Password */}
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-slate-400">
                <Lock className="h-3.5 w-3.5" />
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={input.password}
                  onChange={handleChange}
                  placeholder="Enter your password"
                  required
                  autoComplete="current-password"
                  className="w-full rounded-xl border border-slate-800 bg-slate-950/60 px-3.5 py-2.5 pr-10 text-sm text-slate-200 placeholder:text-slate-500 outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Remember + forgot */}
            <div className="flex items-center justify-between text-xs">
              <label className="flex items-center gap-2 text-slate-400">
                <input
                  type="checkbox"
                  className="h-3.5 w-3.5 rounded border-slate-700 bg-slate-950 accent-cyan-500"
                />
                Remember me
              </label>
              <button type="button" className="font-medium text-cyan-400 hover:text-cyan-300 transition-colors">
                Forgot password?
              </button>
            </div>

            {/* Error */}
            {error && (
              <p className="rounded-lg bg-rose-400/10 px-3 py-2 text-xs font-medium text-rose-400">
                {error}
              </p>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="mt-1 inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-500 px-4 py-2.5 text-sm font-semibold text-slate-950 transition-colors hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-slate-500">
          Restricted access &middot; Authorized personnel only
        </p>
      </div>
    </div>
  );
};

export default AdminLogin;