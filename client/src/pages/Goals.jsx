import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import {
  Target, CalendarClock, Trophy, Flag, Pencil, X,
  CheckCircle2, Circle, Loader2, PartyPopper,
  ChevronDown, ChevronUp, History, PlusCircle, Save,
} from "lucide-react";

const API_BASE = "https://traderdash-c8fz.onrender.com";
const COLORS = { actual: "#22d3ee", target: "#64748b", grid: "#1e293b" };

const currency = (n) =>
  `₹${Math.abs(Math.round(n)).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

const formatDate = (d) => {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" });
};

const authHeaders = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem("adminToken")}` },
});

const MILESTONE_STYLES = {
  Ahead:   "bg-emerald-400/10 text-emerald-400",
  "On Time": "bg-cyan-400/10 text-cyan-400",
  Behind:  "bg-rose-400/10 text-rose-400",
  Pending: "bg-slate-500/10 text-slate-400",
};

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

function Panel({ title, subtitle, children, className = "", headerExtra }) {
  return (
    <div className={`rounded-2xl bg-slate-900/60 border border-slate-800 p-5 shadow-lg shadow-black/20 ${className}`}>
      {(title || subtitle || headerExtra) && (
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            {title && <h3 className="text-sm font-semibold text-slate-100">{title}</h3>}
            {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
          </div>
          {headerExtra}
        </div>
      )}
      {children}
    </div>
  );
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 shadow-xl text-xs">
      <p className="text-slate-400 mb-1">{label}</p>
      {payload.filter((p) => p.value != null).map((p, i) => (
        <p key={i} className="font-medium" style={{ color: p.color }}>
          {p.name}: {currency(p.value)}
        </p>
      ))}
    </div>
  );
}

function MilestonesTable({ milestones }) {
  return (
    <div className="overflow-x-auto -mx-1">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="text-xs text-slate-500 uppercase tracking-wide">
            <th className="px-2 py-2 font-medium">Milestone</th>
            <th className="px-2 py-2 font-medium">Amount</th>
            <th className="px-2 py-2 font-medium">Expected</th>
            <th className="px-2 py-2 font-medium">Reached</th>
            <th className="px-2 py-2 font-medium">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800">
          {milestones.map((m) => (
            <tr key={m.pct} className="hover:bg-slate-800/40 transition-colors">
              <td className="px-2 py-3">
                <div className="flex items-center gap-2 font-medium text-slate-200">
                  {m.reached
                    ? <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    : <Circle className="h-4 w-4 text-slate-600" />}
                  {m.pct}%
                </div>
              </td>
              <td className="px-2 py-3 text-slate-300 tabular-nums">{currency(m.milestoneAmount)}</td>
              <td className="px-2 py-3 text-slate-500 text-xs">{formatDate(m.expectedDate)}</td>
              <td className="px-2 py-3 text-slate-500 text-xs">
                {m.reachedDate ? formatDate(m.reachedDate) : "—"}
              </td>
              <td className="px-2 py-3">
                <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${MILESTONE_STYLES[m.status]}`}>
                  {m.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AchievementChart({ progressData, target }) {
  if (!progressData?.length) {
    return (
      <p className="py-10 text-center text-sm text-slate-500">No monthly progress data yet.</p>
    );
  }
  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={progressData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} vertical={false} />
        <XAxis dataKey="month" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={{ stroke: COLORS.grid }} tickLine={false} />
        <YAxis tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${(v / 100000).toFixed(0)}L`} />
        <Tooltip content={<ChartTooltip />} />
        <Legend wrapperStyle={{ fontSize: 12, color: "#94a3b8" }} iconType="circle" iconSize={8} />
        <Line type="monotone" dataKey="target" name="Required Pace" stroke={COLORS.target} strokeWidth={2} strokeDasharray="5 5" dot={false} />
        <Line type="monotone" dataKey="actual" name="Actual Progress" stroke={COLORS.actual} strokeWidth={2.5} dot={{ r: 3, fill: COLORS.actual, strokeWidth: 0 }} activeDot={{ r: 5 }} connectNulls={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

function buildMilestones(goal, metrics) {
  const startDate  = new Date(goal.startDate);
  const dailyRate  = metrics.elapsedDays > 0 ? goal.achieved / metrics.elapsedDays : 0;

  return [25, 50, 75, 100].map((pct) => {
    const milestoneAmount    = (goal.target * pct) / 100;
    const milestoneDayOffset = metrics.totalDays * (pct / 100);
    const expectedDate       = new Date(startDate.getTime() + milestoneDayOffset * 86400000);
    const reached            = goal.achieved >= milestoneAmount;
    let reachedDate = null;
    if (reached && dailyRate > 0) {
      reachedDate = new Date(startDate.getTime() + (milestoneAmount / dailyRate) * 86400000);
    }
    let status;
    if (reached) {
      status = reachedDate && reachedDate <= expectedDate ? "Ahead" : "On Time";
    } else {
      status = new Date() > expectedDate ? "Behind" : "Pending";
    }
    return { pct, milestoneAmount, expectedDate, reached, reachedDate, status };
  });
}

// ---------------------------------------------------------------------------
// Set Goal modal
// ---------------------------------------------------------------------------

function SetGoalModal({ onSave, onClose }) {
  const [target,   setTarget]   = useState("");
  const [start,    setStart]    = useState("");
  const [deadline, setDeadline] = useState("");
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState("");

  const handleSave = async () => {
    if (!target || !start || !deadline) {
      setError("Target amount, start date, and deadline are all required");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await axios.post(
        `${API_BASE}/goals`,
        { target: Number(target), startDate: start, deadline },
        authHeaders()
      );
      onSave(res.data);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to save goal");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-100">Set New Goal</h2>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-500 hover:bg-slate-800 hover:text-slate-300 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-400">Target Amount (₹)</label>
            <input type="number" value={target} onChange={(e) => setTarget(e.target.value)}
              className="w-full rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2.5 text-sm text-slate-200 outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30"
              placeholder="4200000" />
          </div>
          <p className="text-xs text-slate-500">Achieved is calculated automatically from trader P&amp;L submissions.</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-400">Start Date</label>
              <input type="date" value={start} onChange={(e) => setStart(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2.5 text-sm text-slate-200 outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30 [color-scheme:dark]" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-400">Deadline</label>
              <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2.5 text-sm text-slate-200 outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30 [color-scheme:dark]" />
            </div>
          </div>
          {error && <p className="rounded-lg bg-rose-400/10 px-3 py-2 text-xs font-medium text-rose-400">{error}</p>}
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-xl border border-slate-800 px-4 py-2 text-sm font-medium text-slate-400 hover:bg-slate-800 transition-colors">Cancel</button>
          <button onClick={handleSave} disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-cyan-400/10 px-4 py-2 text-sm font-medium text-cyan-400 border border-cyan-500/30 hover:bg-cyan-400/20 transition-colors disabled:opacity-60">
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Save Goal
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Edit Goal modal — pre-fills current values, calls PUT /goals/:id
// ---------------------------------------------------------------------------

function EditGoalModal({ goal, onSave, onClose }) {
  const [title,    setTitle]    = useState(goal?.title    ?? "Annual Profit Goal");
  const [target,   setTarget]   = useState(goal?.target   ?? "");
  const [start,    setStart]    = useState(goal?.startDate ? new Date(goal.startDate).toISOString().slice(0, 10) : "");
  const [deadline, setDeadline] = useState(goal?.deadline  ? new Date(goal.deadline).toISOString().slice(0, 10)  : "");
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState("");

  const handleSave = async () => {
    if (!target || !start || !deadline) {
      setError("Target amount, start date, and deadline are all required");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await axios.put(
        `${API_BASE}/goals/${goal._id}`,
        { title, target: Number(target), startDate: start, deadline },
        authHeaders()
      );
      onSave(res.data);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to update goal");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-100">Edit Goal</h2>
            <p className="text-xs text-slate-500 mt-0.5">Update the current active goal's details</p>
          </div>
          <button onClick={onClose}
            className="rounded-lg p-1 text-slate-500 hover:bg-slate-800 hover:text-slate-300 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Title */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-400">Goal Title</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2.5 text-sm text-slate-200 outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30"
              placeholder="Annual Profit Goal" />
          </div>

          {/* Target */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-400">Target Amount (₹)</label>
            <input type="number" value={target} onChange={(e) => setTarget(e.target.value)}
              className="w-full rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2.5 text-sm text-slate-200 outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30"
              placeholder="4200000" />
            <p className="mt-1 text-xs text-slate-500">
              Achieved is calculated automatically — changing the target just raises or lowers the bar.
            </p>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-400">Start Date</label>
              <input type="date" value={start} onChange={(e) => setStart(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2.5 text-sm text-slate-200 outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30 [color-scheme:dark]" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-400">Deadline</label>
              <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2.5 text-sm text-slate-200 outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30 [color-scheme:dark]" />
            </div>
          </div>

          {error && (
            <p className="rounded-lg bg-rose-400/10 px-3 py-2 text-xs font-medium text-rose-400">{error}</p>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose}
            className="rounded-xl border border-slate-800 px-4 py-2 text-sm font-medium text-slate-400 hover:bg-slate-800 transition-colors">
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-cyan-400/10 px-4 py-2 text-sm font-medium text-cyan-400 border border-cyan-500/30 hover:bg-cyan-400/20 transition-colors disabled:opacity-60">
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}



function CompletedGoalView({ goal, metrics, progressData, onSetNewGoal }) {
  const milestones = buildMilestones(goal, metrics);
  const daysEarly  = metrics.aheadBehindDays != null && metrics.onTrack
    ? metrics.aheadBehindDays : null;

  return (
    <div className="min-h-screen w-full bg-slate-950 text-slate-200">
      <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">
        {/* Celebration banner */}
        <div className="mb-6 rounded-2xl border border-emerald-500/30 bg-emerald-400/5 p-6 text-center shadow-lg shadow-black/20">
          <PartyPopper className="mx-auto mb-3 h-10 w-10 text-emerald-400" />
          <h1 className="text-2xl font-semibold text-emerald-400 sm:text-3xl">Goal Completed! 🎉</h1>
          <p className="mt-1 text-sm text-slate-400">
            The {currency(goal.target)} target was reached{" "}
            {goal.completedOn ? `on ${formatDate(goal.completedOn)}` : ""}
            {daysEarly != null && daysEarly > 0 ? ` — ${daysEarly} days ahead of schedule` : ""}.
          </p>
          <button
            onClick={onSetNewGoal}
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-6 py-2.5 text-sm font-semibold text-slate-950 hover:bg-emerald-400 transition-colors"
          >
            <PlusCircle className="h-4 w-4" />
            Set New Goal
          </button>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-5 shadow-lg shadow-black/20">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Target</p>
            <p className="mt-2 text-2xl font-semibold text-slate-50 tabular-nums">{currency(goal.target)}</p>
          </div>
          <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-5 shadow-lg shadow-black/20">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Final Achieved</p>
            <p className="mt-2 text-2xl font-semibold text-emerald-400 tabular-nums">{currency(goal.achieved)}</p>
            <p className="text-xs text-slate-500 mt-0.5">
              {((goal.achieved / goal.target) * 100).toFixed(1)}% of target
            </p>
          </div>
          <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-5 shadow-lg shadow-black/20">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Duration</p>
            <p className="mt-2 text-2xl font-semibold text-slate-50 tabular-nums">{metrics.totalDays} days</p>
            <p className="text-xs text-slate-500 mt-0.5">{formatDate(goal.startDate)} → {formatDate(goal.deadline)}</p>
          </div>
        </div>

        {/* Chart */}
        <div className="mt-4">
          <Panel title="Achievement Graph" subtitle="Final cumulative progress vs required pace">
            <AchievementChart progressData={progressData} target={goal.target} />
          </Panel>
        </div>

        {/* Milestones */}
        <div className="mt-4">
          <Panel title="Milestone Completion" subtitle="All checkpoints for this goal">
            <MilestonesTable milestones={milestones} />
          </Panel>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Goal History — list of all past goals, each expandable for full details
// ---------------------------------------------------------------------------

function GoalHistoryCard({ entry, index }) {
  const [expanded, setExpanded] = useState(false);
  const milestones = buildMilestones(entry, entry.metrics);
  const pct = Math.min(100, (entry.achieved / entry.target) * 100).toFixed(1);

  return (
    <div className="rounded-2xl border bg-slate-900/60 shadow-lg shadow-black/20 overflow-hidden transition-colors hover:border-slate-700"
      style={{ borderColor: entry.isCompleted ? "rgba(52,211,153,0.3)" : "#1e293b" }}>
      {/* Header row — always visible */}
      <button
        className="w-full flex items-center gap-4 p-5 text-left"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${entry.isCompleted ? "bg-emerald-400/10" : "bg-slate-800"}`}>
          {entry.isCompleted
            ? <Trophy className="h-5 w-5 text-emerald-400" />
            : <Target className="h-5 w-5 text-slate-400" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-slate-100">{entry.title || "Annual Profit Goal"}</p>
            <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${entry.isCompleted ? "bg-emerald-400/10 text-emerald-400" : "bg-slate-500/10 text-slate-400"}`}>
              {entry.isCompleted ? "Completed" : "Ended"}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {formatDate(entry.startDate)} → {formatDate(entry.deadline)} &middot; Target {currency(entry.target)} &middot; Achieved {currency(entry.achieved)} ({pct}%)
          </p>
        </div>
        {expanded
          ? <ChevronUp className="h-4 w-4 shrink-0 text-slate-500" />
          : <ChevronDown className="h-4 w-4 shrink-0 text-slate-500" />}
      </button>

      {/* Expanded full details */}
      {expanded && (
        <div className="border-t border-slate-800 px-5 pb-5 pt-4 space-y-4">
          {/* Progress bar */}
          <div>
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
              <span>{pct}% of goal reached</span>
              {entry.isCompleted && entry.completedOn && (
                <span className="text-emerald-400">Completed {formatDate(entry.completedOn)}</span>
              )}
            </div>
            <div className="relative h-2.5 w-full rounded-full bg-slate-800 overflow-hidden">
              <div
                className={`h-full rounded-full ${entry.isCompleted ? "bg-gradient-to-r from-emerald-500 to-emerald-400" : "bg-gradient-to-r from-cyan-500 to-cyan-400"}`}
                style={{ width: `${Math.min(100, pct)}%` }}
              />
            </div>
          </div>

          {/* Stat row */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: "Target",    value: currency(entry.target) },
              { label: "Achieved",  value: currency(entry.achieved), color: entry.isCompleted ? "text-emerald-400" : "text-slate-200" },
              { label: "Duration",  value: `${entry.metrics.totalDays} days` },
              { label: "Days Remaining at End", value: entry.metrics.remainingDays > 0 ? `${entry.metrics.remainingDays} left` : "Past deadline" },
            ].map((s) => (
              <div key={s.label} className="rounded-xl bg-slate-800/50 p-3">
                <p className="text-[11px] text-slate-500 uppercase tracking-wide">{s.label}</p>
                <p className={`mt-1 text-sm font-semibold tabular-nums ${s.color || "text-slate-200"}`}>{s.value}</p>
              </div>
            ))}
          </div>

          {/* Chart */}
          <div className="rounded-xl border border-slate-800 p-4">
            <p className="text-xs font-semibold text-slate-400 mb-3">Achievement Graph</p>
            <AchievementChart progressData={entry.progressData} target={entry.target} />
          </div>

          {/* Milestones */}
          <div className="rounded-xl border border-slate-800 p-4">
            <p className="text-xs font-semibold text-slate-400 mb-3">Milestones</p>
            <MilestonesTable milestones={milestones} />
          </div>
        </div>
      )}
    </div>
  );
}

function GoalHistorySection() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await axios.get(`${API_BASE}/goals/history`, authHeaders());
        setHistory(res.data);
      } catch (err) {
        setError(err?.response?.data?.message || "Failed to load history");
      } finally {
        setLoading(false);
      }
    };
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetch();
  }, []);

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-5 flex items-center gap-2">
        <History className="h-5 w-5 text-slate-400" />
        <h2 className="text-lg font-semibold text-slate-100">Goal History</h2>
        <span className="rounded-full bg-slate-800 px-2.5 py-0.5 text-xs text-slate-400">
          {history.length} past goal{history.length !== 1 ? "s" : ""}
        </span>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading history…
        </div>
      ) : error ? (
        <p className="text-sm text-rose-400">{error}</p>
      ) : history.length === 0 ? (
        <p className="rounded-2xl border border-slate-800 bg-slate-900/60 py-10 text-center text-sm text-slate-500">
          No past goals yet. Completed goals will appear here.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {history.map((entry, i) => (
            <GoalHistoryCard key={entry._id} entry={entry} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Active Goal view (existing layout, unchanged)
// ---------------------------------------------------------------------------

function ActiveGoalView({ goal, metrics, progressData, onEditGoal, onSetNewGoal }) {
  const milestones = buildMilestones(goal, metrics);

  return (
    <div className="min-h-screen w-full bg-slate-950 text-slate-200">
      <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold text-slate-50 sm:text-2xl">Desk Goals</h1>
            <p className="text-sm text-slate-500">Tracking progress toward the {currency(goal.target)} target</p>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button onClick={onEditGoal}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/60 px-4 py-2.5 text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-slate-100 transition-colors">
              <Pencil className="h-4 w-4" />
              Edit Goal
            </button>
            <button onClick={onSetNewGoal}
              className="inline-flex items-center gap-2 rounded-xl bg-cyan-400/10 px-4 py-2.5 text-sm font-medium text-cyan-400 border border-cyan-500/30 hover:bg-cyan-400/20 transition-colors">
              <PlusCircle className="h-4 w-4" />
              New Goal
            </button>
          </div>
        </div>

        {/* Progress card */}
        <Panel>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-cyan-400/10">
                <Target className="h-7 w-7 text-cyan-400" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Annual Profit Goal</p>
                <p className="text-2xl font-semibold text-slate-50 tabular-nums">{currency(goal.target)}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Achieved</p>
              <p className="text-2xl font-semibold text-emerald-400 tabular-nums">{currency(goal.achieved)}</p>
              <p className="text-xs text-slate-500 mt-0.5">{currency(metrics.remainingAmount)} remaining</p>
            </div>
          </div>
          <div className="mt-5">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
              <span>{metrics.progressPct.toFixed(1)}% of goal reached</span>
              <span>Expected pace: {metrics.expectedPct.toFixed(1)}%</span>
            </div>
            <div className="relative h-3 w-full rounded-full bg-slate-800 overflow-hidden">
              <div className="absolute top-0 h-full w-0.5 bg-slate-500" style={{ left: `${metrics.expectedPct}%` }} />
              <div className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-emerald-400 transition-all" style={{ width: `${metrics.progressPct}%` }} />
            </div>
          </div>
        </Panel>

        {/* Insight cards */}
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-5">
            <div className="flex items-center gap-2 text-slate-400 text-xs font-medium uppercase tracking-wide">
              <CalendarClock className="h-4 w-4 text-amber-400" />
              Time Until Deadline
            </div>
            <p className="mt-2 text-2xl font-semibold text-slate-50 tabular-nums">{metrics.remainingDays} days</p>
            <p className="text-xs text-slate-500 mt-0.5">Goal ends {formatDate(goal.deadline)}</p>
          </div>
          <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-5">
            <div className="flex items-center gap-2 text-slate-400 text-xs font-medium uppercase tracking-wide">
              <Flag className={`h-4 w-4 ${metrics.onTrack ? "text-emerald-400" : "text-rose-400"}`} />
              Pace Status
            </div>
            <p className={`mt-2 text-2xl font-semibold tabular-nums ${metrics.onTrack ? "text-emerald-400" : "text-rose-400"}`}>
              {metrics.onTrack ? "Ahead of schedule" : "Behind schedule"}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              {metrics.onTrack
                ? `On track to finish ${Math.abs(metrics.aheadBehindDays ?? 0)} days early`
                : `Projected to miss deadline by ${Math.abs(metrics.aheadBehindDays ?? 0)} days`}
            </p>
          </div>
          <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-5">
            <div className="flex items-center gap-2 text-slate-400 text-xs font-medium uppercase tracking-wide">
              <Trophy className="h-4 w-4 text-pink-400" />
              Projected Finish
            </div>
            <p className="mt-2 text-2xl font-semibold text-slate-50 tabular-nums">
              {formatDate(metrics.projectedFinishDate)}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">Based on current daily pace</p>
          </div>
        </div>

        {/* Chart */}
        <div className="mt-4">
          <Panel title="Goal Achievement Graph" subtitle={`Cumulative profit vs. pace required to hit ${currency(goal.target)}`}>
            <AchievementChart progressData={progressData} target={goal.target} />
          </Panel>
        </div>

        {/* Milestones */}
        <div className="mt-4">
          <Panel title="Milestone Completion" subtitle="Progress checkpoints toward the annual goal">
            <MilestonesTable milestones={milestones} />
          </Panel>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Empty state — no active goal
// ---------------------------------------------------------------------------

function NoGoalView({ onSetGoal }) {
  return (
    <div className="min-h-screen w-full bg-slate-950 text-slate-200">
      <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col items-center justify-center gap-4 rounded-2xl border border-slate-800 bg-slate-900/60 py-20 text-center">
          <Target className="h-10 w-10 text-cyan-400" />
          <div>
            <h2 className="text-lg font-semibold text-slate-100">No active goal</h2>
            <p className="mt-1 text-sm text-slate-500">Set a target to start tracking desk progress</p>
          </div>
          <button onClick={onSetGoal}
            className="inline-flex items-center gap-2 rounded-xl bg-cyan-400/10 px-4 py-2.5 text-sm font-medium text-cyan-400 border border-cyan-500/30 hover:bg-cyan-400/20 transition-colors">
            <PlusCircle className="h-4 w-4" />
            Set Goal
          </button>
        </div>
        {/* Still show history even if no active goal */}
        <GoalHistorySection />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Root Goals component
// ---------------------------------------------------------------------------

const Goals = () => {
  const [goalData,       setGoalData]       = useState(null);
  const [loading,        setLoading]        = useState(true);
  const [error,          setError]          = useState("");
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen,   setEditModalOpen]   = useState(false);

  const fetchActiveGoal = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await axios.get(`${API_BASE}/goals/active`, authHeaders());
      setGoalData(res.data);
    } catch (err) {
      if (err?.response?.status === 404) {
        setGoalData(null);
      } else {
        setError(err?.response?.data?.message || "Failed to load goal");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchActiveGoal();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-slate-950 text-slate-400">
        <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading goal…
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen w-full flex-col items-center justify-center gap-3 bg-slate-950 text-slate-400">
        <p className="text-sm text-rose-400">{error}</p>
        <button onClick={fetchActiveGoal} className="rounded-xl border border-slate-800 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800 transition-colors">Retry</button>
      </div>
    );
  }

  const handleCreateSave = () => {
    setCreateModalOpen(false);
    fetchActiveGoal();
  };

  const handleEditSave = () => {
    setEditModalOpen(false);
    fetchActiveGoal();
  };

  // No active goal at all
  if (!goalData) {
    return (
      <>
        <NoGoalView onSetGoal={() => setCreateModalOpen(true)} />
        {createModalOpen && <SetGoalModal onClose={() => setCreateModalOpen(false)} onSave={handleCreateSave} />}
      </>
    );
  }

  const { goal, metrics, progressData, isCompleted } = goalData;

  // Goal is completed — show celebration + Set New Goal
  if (isCompleted) {
    return (
      <>
        <div className="bg-slate-950">
          <CompletedGoalView
            goal={goal}
            metrics={metrics}
            progressData={progressData}
            onSetNewGoal={() => setCreateModalOpen(true)}
          />
          <GoalHistorySection />
        </div>
        {createModalOpen && <SetGoalModal onClose={() => setCreateModalOpen(false)} onSave={handleCreateSave} />}
      </>
    );
  }

  // Normal active goal in progress
  return (
    <>
      <div className="bg-slate-950">
        <ActiveGoalView
          goal={goal}
          metrics={metrics}
          progressData={progressData}
          onEditGoal={() => setEditModalOpen(true)}
          onSetNewGoal={() => setCreateModalOpen(true)}
        />
        <GoalHistorySection />
      </div>
      {createModalOpen && (
        <SetGoalModal onClose={() => setCreateModalOpen(false)} onSave={handleCreateSave} />
      )}
      {editModalOpen && (
        <EditGoalModal
          goal={goal}
          onClose={() => setEditModalOpen(false)}
          onSave={handleEditSave}
        />
      )}
    </>
  );
};

export default Goals;
