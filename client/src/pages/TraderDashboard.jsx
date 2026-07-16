import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import {
  TrendingUp,
  Calendar,
  StickyNote,
  LogOut,
  Loader2,
  CheckCircle2,
  LineChart as LineChartIcon,
} from "lucide-react";

const API_BASE = "https://traderdash-c8fz.onrender.com";

const currency = (n) =>
  `\u20b9${Math.abs(Math.round(n)).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
const signedCurrency = (n) => `${n < 0 ? "-" : "+"}${currency(n)}`;

const authHeaders = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem("traderToken")}` },
});

// Returns current IST time formatted for a datetime-local input (YYYY-MM-DDTHH:mm)
const nowForInput = () => {
  const now = new Date();
  // Convert to IST (UTC+5:30)
  const istOffset = 5.5 * 60 * 60 * 1000;
  const ist = new Date(now.getTime() + istOffset);
  return ist.toISOString().slice(0, 16);
};

function Panel({ title, subtitle, children, className = "" }) {
  return (
    <div
      className={`rounded-2xl bg-slate-900/60 border border-slate-800 p-5 shadow-lg shadow-black/20 ${className}`}
    >
      {(title || subtitle) && (
        <div className="mb-4">
          {title && <h3 className="text-sm font-semibold text-slate-100">{title}</h3>}
          {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
      )}
      {children}
    </div>
  );
}

const TraderDashboard = () => {
  const navigate = useNavigate();
  const traderInfo = JSON.parse(localStorage.getItem("traderInfo") || "null");

  const [profile, setProfile] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [form, setForm] = useState({ pnl: "", date: nowForInput(), note: "" });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      const [profileRes, historyRes] = await Promise.all([
        axios.get(`${API_BASE}/trader/me`, authHeaders()),
        axios.get(`${API_BASE}/trader/pnl/history`, authHeaders()),
      ]);
      setProfile(profileRes.data);
      setHistory(historyRes.data);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load your dashboard");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- standard fetch-on-mount pattern
    fetchData();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError("");
    setSubmitSuccess(false);

    if (form.pnl === "" || isNaN(Number(form.pnl))) {
      setSubmitError("Please enter a valid profit/loss amount");
      return;
    }

    setSubmitting(true);
    try {
      await axios.post(
        `${API_BASE}/trader/pnl`,
        { pnl: Number(form.pnl), date: form.date, note: form.note },
        authHeaders()
      );
      setSubmitSuccess(true);
      setForm({ pnl: "", date: nowForInput(), note: "" });
      fetchData(); // refresh profile totals + history
    } catch (err) {
      setSubmitError(err?.response?.data?.message || "Failed to submit entry");
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("traderToken");
    localStorage.removeItem("traderInfo");
    navigate("/trader-login");
  };

  if (loading) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-slate-950 text-slate-400">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        Loading your dashboard...
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-slate-950 text-slate-200">
      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-slate-50 sm:text-2xl">
              {profile?.name || traderInfo?.name || "Trader"}
            </h1>
            <p className="text-sm text-slate-500">Submit your trading results</p>
          </div>
          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-800 px-3.5 py-2 text-sm font-medium text-slate-400 hover:bg-slate-900 hover:text-slate-200 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>

        {error && (
          <p className="mb-4 rounded-lg bg-rose-400/10 px-3 py-2 text-xs font-medium text-rose-400">
            {error}
          </p>
        )}

        {/* Total profit summary */}
        <div className="mb-4 rounded-2xl bg-slate-900/60 border border-slate-800 p-5 shadow-lg shadow-black/20">
          <div className="flex items-center gap-2 text-slate-400 text-xs font-medium uppercase tracking-wide">
            <TrendingUp className="h-4 w-4 text-emerald-400" />
            Your Total Profit/Loss
          </div>
          <p
            className={`mt-2 text-3xl font-semibold tabular-nums ${
              (profile?.profit ?? 0) >= 0 ? "text-emerald-400" : "text-rose-400"
            }`}
          >
            {signedCurrency(profile?.profit ?? 0)}
          </p>
          <p className="text-xs text-slate-500 mt-1">Based on all entries you've submitted</p>
        </div>

        {/* Submit form */}
        <Panel title="Submit a Result" subtitle="Log a new profit or loss with the date it happened">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-slate-400">
                  <TrendingUp className="h-3.5 w-3.5" />
                  Profit / Loss Amount (\u20b9)
                </label>
                <input
                  type="number"
                  name="pnl"
                  value={form.pnl}
                  onChange={handleChange}
                  placeholder="e.g. 1500 or -600"
                  step="any"
                  required
                  className="w-full rounded-xl border border-slate-800 bg-slate-950/60 px-3.5 py-2.5 text-sm text-slate-200 placeholder:text-slate-500 outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30"
                />
                <p className="mt-1 text-[11px] text-slate-500">Use a negative number for a loss</p>
              </div>

              <div>
                <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-slate-400">
                  <Calendar className="h-3.5 w-3.5" />
                  Date &amp; Time
                </label>
                <input
                  type="datetime-local"
                  name="date"
                  value={form.date}
                  onChange={handleChange}
                  required
                  className="w-full rounded-xl border border-slate-800 bg-slate-950/60 px-3.5 py-2.5 text-sm text-slate-200 outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 [color-scheme:dark]"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-slate-400">
                <StickyNote className="h-3.5 w-3.5" />
                Note (optional)
              </label>
              <input
                type="text"
                name="note"
                value={form.note}
                onChange={handleChange}
                placeholder="e.g. EUR/USD swing trade"
                className="w-full rounded-xl border border-slate-800 bg-slate-950/60 px-3.5 py-2.5 text-sm text-slate-200 placeholder:text-slate-500 outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30"
              />
            </div>

            {submitError && (
              <p className="rounded-lg bg-rose-400/10 px-3 py-2 text-xs font-medium text-rose-400">
                {submitError}
              </p>
            )}
            {submitSuccess && (
              <p className="flex items-center gap-1.5 rounded-lg bg-emerald-400/10 px-3 py-2 text-xs font-medium text-emerald-400">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Entry submitted successfully
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center justify-center gap-2 self-start rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-slate-950 transition-colors hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Submit Result
            </button>
          </form>
        </Panel>

        {/* Submission history */}
        <div className="mt-4">
          <Panel title="Your Submission History" subtitle="Most recent entries you've logged">
            {history.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-10 text-center text-slate-500">
                <LineChartIcon className="h-8 w-8 text-slate-600" />
                <p className="text-sm">No entries yet — submit your first result above</p>
              </div>
            ) : (
              <div className="overflow-x-auto -mx-1">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="text-xs text-slate-500 uppercase tracking-wide">
                      <th className="px-2 py-2 font-medium">Date</th>
                      <th className="px-2 py-2 font-medium">Profit/Loss</th>
                      <th className="px-2 py-2 font-medium">Note</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {history.map((h) => (
                      <tr key={h._id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="px-2 py-3 text-slate-400 text-xs">
                          {new Date(h.date).toLocaleString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                            timeZone: "Asia/Kolkata",
                          })}
                        </td>
                        <td
                          className={`px-2 py-3 font-medium tabular-nums ${
                            h.pnl >= 0 ? "text-emerald-400" : "text-rose-400"
                          }`}
                        >
                          {signedCurrency(h.pnl)}
                        </td>
                        <td className="px-2 py-3 text-slate-500 text-xs">{h.note || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
};

export default TraderDashboard;
