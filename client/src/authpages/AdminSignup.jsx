import React, { useState } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import {
  ShieldCheck,
  User,
  Mail,
  Lock,
  Phone,
  Eye,
  EyeOff,
  Loader2,
  CheckCircle2,
} from "lucide-react";

const API_BASE = "https://traderdash-c8fz.onrender.com";

const AdminSignup = () => {
  const navigate = useNavigate();

  const [input, setInput] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    role: "Admin",
  });
  const [showPassword,        setShowPassword]        = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading,             setLoading]             = useState(false);
  const [error,               setError]               = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setInput((prev) => ({ ...prev, [name]: value }));
  };

  // Client-side validation before hitting the API
  const validate = () => {
    if (!input.name.trim())  return "Full name is required";
    if (!input.email.trim()) return "Email address is required";
    if (input.password.length < 6) return "Password must be at least 6 characters";
    if (input.password !== input.confirmPassword) return "Passwords do not match";
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationError = validate();
    if (validationError) { setError(validationError); return; }

    setError("");
    setLoading(true);
    try {
      const { confirmPassword, ...payload } = input;
      const res = await axios.post(`${API_BASE}/admin/register`, payload);
      // Auto-login after signup — backend returns { _id, name, email, role, token }
      const { token, ...admin } = res.data;
      localStorage.setItem("adminToken", token);
      localStorage.setItem("adminInfo", JSON.stringify(admin));
      navigate("/overview");
    } catch (err) {
      setError(
        err?.response?.data?.message || "Could not create account. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  // Password strength indicator
  const passwordStrength = () => {
    const p = input.password;
    if (!p) return null;
    if (p.length < 6)  return { label: "Too short", color: "bg-rose-400",   width: "w-1/4" };
    if (p.length < 8)  return { label: "Weak",      color: "bg-amber-400",   width: "w-2/4" };
    if (!/[A-Z]/.test(p) || !/[0-9]/.test(p))
                        return { label: "Fair",      color: "bg-yellow-400",  width: "w-3/4" };
    return              { label: "Strong",     color: "bg-emerald-400", width: "w-full" };
  };

  const strength = passwordStrength();

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-slate-950 px-4 py-8 text-slate-200">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-1/3 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-500/10 blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm">
        {/* Brand */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-400/10">
            <ShieldCheck className="h-6 w-6 text-cyan-400" />
          </div>
          <div className="text-center">
            <h1 className="text-lg font-semibold text-slate-50">Create Admin Account</h1>
            <p className="mt-1 text-xs text-slate-500">Set up access to the trading desk console</p>
          </div>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl shadow-black/30">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">

            {/* Full Name */}
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-slate-400">
                <User className="h-3.5 w-3.5" />
                Full Name
              </label>
              <input
                type="text"
                name="name"
                value={input.name}
                onChange={handleChange}
                placeholder="Rohan Kapoor"
                required
                autoComplete="name"
                className="w-full rounded-xl border border-slate-800 bg-slate-950/60 px-3.5 py-2.5 text-sm text-slate-200 placeholder:text-slate-500 outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30"
              />
            </div>

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

            {/* Phone */}
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-slate-400">
                <Phone className="h-3.5 w-3.5" />
                Phone Number
                <span className="ml-1 text-slate-600">(optional)</span>
              </label>
              <input
                type="tel"
                name="phone"
                value={input.phone}
                onChange={handleChange}
                placeholder="+91 98765 43210"
                autoComplete="tel"
                className="w-full rounded-xl border border-slate-800 bg-slate-950/60 px-3.5 py-2.5 text-sm text-slate-200 placeholder:text-slate-500 outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30"
              />
            </div>

            {/* Role */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-400">
                Role
              </label>
              <select
                name="role"
                value={input.role}
                onChange={handleChange}
                className="w-full rounded-xl border border-slate-800 bg-slate-950/60 px-3.5 py-2.5 text-sm text-slate-200 outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30 [color-scheme:dark]"
              >
                <option value="Admin">Admin</option>
                <option value="Super Admin">Super Admin</option>
              </select>
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
                  placeholder="At least 6 characters"
                  required
                  minLength={6}
                  autoComplete="new-password"
                  className="w-full rounded-xl border border-slate-800 bg-slate-950/60 px-3.5 py-2.5 pr-10 text-sm text-slate-200 placeholder:text-slate-500 outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              {/* Password strength bar */}
              {strength && (
                <div className="mt-2">
                  <div className="h-1 w-full rounded-full bg-slate-800 overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-300 ${strength.color} ${strength.width}`} />
                  </div>
                  <p className={`mt-1 text-[11px] font-medium ${
                    strength.label === "Strong" ? "text-emerald-400" :
                    strength.label === "Fair"   ? "text-yellow-400"  :
                    strength.label === "Weak"   ? "text-amber-400"   : "text-rose-400"
                  }`}>
                    {strength.label}
                  </p>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-slate-400">
                <Lock className="h-3.5 w-3.5" />
                Confirm Password
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  name="confirmPassword"
                  value={input.confirmPassword}
                  onChange={handleChange}
                  placeholder="Re-enter your password"
                  required
                  autoComplete="new-password"
                  className={`w-full rounded-xl border bg-slate-950/60 px-3.5 py-2.5 pr-10 text-sm text-slate-200 placeholder:text-slate-500 outline-none focus:ring-1 transition-colors ${
                    input.confirmPassword && input.password !== input.confirmPassword
                      ? "border-rose-500/50 focus:border-rose-500/50 focus:ring-rose-500/20"
                      : input.confirmPassword && input.password === input.confirmPassword
                      ? "border-emerald-500/50 focus:border-emerald-500/50 focus:ring-emerald-500/20"
                      : "border-slate-800 focus:border-cyan-500/50 focus:ring-cyan-500/30"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                  tabIndex={-1}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
                {/* Match indicator */}
                {input.confirmPassword && input.password === input.confirmPassword && (
                  <CheckCircle2 className="pointer-events-none absolute right-9 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-emerald-400" />
                )}
              </div>
              {input.confirmPassword && input.password !== input.confirmPassword && (
                <p className="mt-1 text-[11px] text-rose-400">Passwords do not match</p>
              )}
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
                  Creating account...
                </>
              ) : (
                "Create Account"
              )}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-slate-500">
          Already have an account?{" "}
          <Link
            to="/admin-login"
            className="font-medium text-cyan-400 hover:text-cyan-300 transition-colors"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
};

export default AdminSignup;
