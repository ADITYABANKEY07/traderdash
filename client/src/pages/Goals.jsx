import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  Target,
  CalendarClock,
  Trophy,
  Flag,
  Pencil,
  X,
  CheckCircle2,
  Circle,
  Loader2,
} from "lucide-react";

const API_BASE = "http://localhost:7007";

const COLORS = { actual: "#22d3ee", target: "#64748b", grid: "#1e293b" };

const currency = (n) =>
  `\u20b9${Math.abs(Math.round(n)).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

function formatDate(d) {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" });
}

const authHeaders = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem("adminToken")}` },
});

// ---------------------------------------------------------------------------
// Building blocks
// ---------------------------------------------------------------------------

function Panel({ title, subtitle, children, className = "", headerExtra }) {
  return (
    <div
      className={`rounded-2xl bg-slate-900/60 border border-slate-800 p-5 shadow-lg shadow-black/20 ${className}`}
    >
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

function CustomTooltip({ active, payload, label, formatter }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 shadow-xl text-xs">
      <p className="text-slate-400 mb-1">{label}</p>
      {payload
        .filter((p) => p.value !== null && p.value !== undefined)
        .map((p, i) => (
          <p key={i} className="font-medium" style={{ color: p.color }}>
            {p.name}: {formatter ? formatter(p.value) : p.value}
          </p>
        ))}
    </div>
  );
}

function LoadingState({ label = "Loading..." }) {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-slate-950 text-slate-400">
      <Loader2 className="h-5 w-5 animate-spin mr-2" />
      {label}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Set Goal modal — submits to POST /goals
// ---------------------------------------------------------------------------

function SetGoalModal({ goal, onSave, onClose }) {
  const [target, setTarget] = useState(goal?.target ?? "");
  const [start, setStart] = useState(
    goal?.startDate ? goal.startDate.slice(0, 10) : ""
  );
  const [deadline, setDeadline] = useState(
    goal?.deadline ? goal.deadline.slice(0, 10) : ""
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

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
        {
          target: Number(target) || 0,
          startDate: start,
          deadline,
        },
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-100">Set Goal</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-500 hover:bg-slate-800 hover:text-slate-300 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-400">
              Target Amount (₹)
            </label>
            <input
              type="number"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              className="w-full rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2.5 text-sm text-slate-200 outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30"
              placeholder="4200000"
            />
          </div>

          <p className="text-xs text-slate-500">
            Achieved amount is calculated automatically from trader P&amp;L submissions.
          </p>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-400">Start Date</label>
              <input
                type="date"
                value={start}
                onChange={(e) => setStart(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2.5 text-sm text-slate-200 outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30 [color-scheme:dark]"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-400">Deadline</label>
              <input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2.5 text-sm text-slate-200 outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30 [color-scheme:dark]"
              />
            </div>
          </div>

          {error && (
            <p className="rounded-lg bg-rose-400/10 px-3 py-2 text-xs font-medium text-rose-400">
              {error}
            </p>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-xl border border-slate-800 px-4 py-2 text-sm font-medium text-slate-400 hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-cyan-400/10 px-4 py-2 text-sm font-medium text-cyan-400 border border-cyan-500/30 hover:bg-cyan-400/20 transition-colors disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Save Goal
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

const statusStyles = {
  Ahead: "bg-emerald-400/10 text-emerald-400",
  "On Time": "bg-cyan-400/10 text-cyan-400",
  Behind: "bg-rose-400/10 text-rose-400",
  Pending: "bg-slate-500/10 text-slate-400",
};

// Builds the same 25/50/75/100% milestone table the original UI showed,
// derived from the goal + metrics the backend returns.
function buildMilestones(goal, metrics) {
  const startDate = new Date(goal.startDate);
  const dailyRate = metrics.elapsedDays > 0 ? goal.achieved / metrics.elapsedDays : 0;

  return [25, 50, 75, 100].map((pct) => {
    const milestoneAmount = (goal.target * pct) / 100;
    const milestoneDayOffset = metrics.totalDays * (pct / 100);
    const expectedDate = new Date(startDate.getTime() + milestoneDayOffset * 86400000);
    const reached = goal.achieved >= milestoneAmount;

    let reachedDate = null;
    if (reached && dailyRate > 0) {
      const dayOffsetForMilestone = milestoneAmount / dailyRate;
      reachedDate = new Date(startDate.getTime() + dayOffsetForMilestone * 86400000);
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

const Goals = () => {
  const [goal, setGoal] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [progressData, setProgressData] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchActiveGoal = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await axios.get(`${API_BASE}/goals/active`, authHeaders());
      setGoal(res.data.goal);
      setMetrics(res.data.metrics);
      // progressData is now bundled in the same response — no second request needed
      setProgressData(res.data.progressData || []);
    } catch (err) {
      if (err?.response?.status === 404) {
        setGoal(null);
        setMetrics(null);
        setProgressData([]);
      } else {
        setError(err?.response?.data?.message || "Failed to load goal");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- standard fetch-on-mount pattern
    fetchActiveGoal();
  }, []);

  if (loading) return <LoadingState label="Loading goal..." />;

  if (error) {
    return (
      <div className="flex min-h-screen w-full flex-col items-center justify-center gap-3 bg-slate-950 text-slate-400">
        <p className="text-sm text-rose-400">{error}</p>
        <button
          onClick={fetchActiveGoal}
          className="rounded-xl border border-slate-800 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  // No goal set yet — show an empty state with the Set Goal action
  if (!goal) {
    return (
      <div className="min-h-screen w-full bg-slate-950 text-slate-200">
        <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-slate-800 bg-slate-900/60 py-20 text-center">
            <Target className="h-10 w-10 text-cyan-400" />
            <div>
              <h2 className="text-lg font-semibold text-slate-100">No active goal yet</h2>
              <p className="mt-1 text-sm text-slate-500">Set a target to start tracking progress</p>
            </div>
            <button
              onClick={() => setModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-cyan-400/10 px-4 py-2.5 text-sm font-medium text-cyan-400 border border-cyan-500/30 hover:bg-cyan-400/20 transition-colors"
            >
              <Pencil className="h-4 w-4" />
              Set Goal
            </button>
          </div>
        </div>

        {modalOpen && (
          <SetGoalModal
            goal={null}
            onClose={() => setModalOpen(false)}
            onSave={() => {
              setModalOpen(false);
              fetchActiveGoal();
            }}
          />
        )}
      </div>
    );
  }

  const milestones = buildMilestones(goal, metrics);

  return (
    <div className="min-h-screen w-full bg-slate-950 text-slate-200">
      <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold text-slate-50 sm:text-2xl">Desk Goals</h1>
            <p className="text-sm text-slate-500">
              Tracking progress toward the {currency(goal.target)} annual target
            </p>
          </div>
          <button
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-2 self-start rounded-xl bg-cyan-400/10 px-4 py-2.5 text-sm font-medium text-cyan-400 border border-cyan-500/30 hover:bg-cyan-400/20 transition-colors sm:self-auto"
          >
            <Pencil className="h-4 w-4" />
            Set Goal
          </button>
        </div>

        {/* Goal progress card */}
        <Panel>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-cyan-400/10">
                <Target className="h-7 w-7 text-cyan-400" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
                  Annual Profit Goal
                </p>
                <p className="text-2xl font-semibold text-slate-50 tabular-nums">
                  {currency(goal.target)}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Achieved</p>
              <p className="text-2xl font-semibold text-emerald-400 tabular-nums">
                {currency(goal.achieved)}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                {currency(metrics.remainingAmount)} remaining
              </p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-5">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
              <span>{metrics.progressPct.toFixed(1)}% of goal reached</span>
              <span>Expected pace: {metrics.expectedPct.toFixed(1)}%</span>
            </div>
            <div className="relative h-3 w-full rounded-full bg-slate-800 overflow-hidden">
              <div
                className="absolute top-0 h-full w-0.5 bg-slate-500"
                style={{ left: `${metrics.expectedPct}%` }}
              />
              <div
                className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-emerald-400 transition-all"
                style={{ width: `${metrics.progressPct}%` }}
              />
            </div>
          </div>
        </Panel>

        {/* Insight cards: countdown, pace status, projected finish */}
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-5 shadow-lg shadow-black/20">
            <div className="flex items-center gap-2 text-slate-400 text-xs font-medium uppercase tracking-wide">
              <CalendarClock className="h-4 w-4 text-amber-400" />
              Time Until Deadline
            </div>
            <p className="mt-2 text-2xl font-semibold text-slate-50 tabular-nums">
              {metrics.remainingDays} days
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              Goal ends {formatDate(goal.deadline)}
            </p>
          </div>

          <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-5 shadow-lg shadow-black/20">
            <div className="flex items-center gap-2 text-slate-400 text-xs font-medium uppercase tracking-wide">
              <Flag className={`h-4 w-4 ${metrics.onTrack ? "text-emerald-400" : "text-rose-400"}`} />
              Pace Status
            </div>
            <p
              className={`mt-2 text-2xl font-semibold tabular-nums ${
                metrics.onTrack ? "text-emerald-400" : "text-rose-400"
              }`}
            >
              {metrics.onTrack ? "Ahead of schedule" : "Behind schedule"}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              {metrics.onTrack
                ? `On track to finish ${Math.abs(metrics.aheadBehindDays ?? 0)} days early`
                : `Projected to miss deadline by ${Math.abs(metrics.aheadBehindDays ?? 0)} days`}
            </p>
          </div>

          <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-5 shadow-lg shadow-black/20">
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

        {/* Goals achieve graph */}
        <div className="mt-4">
          <Panel
            title="Goal Achievement Graph"
            subtitle={`Cumulative profit vs. the pace required to hit ${currency(goal.target)} by year end`}
          >
            {progressData.length === 0 ? (
              <p className="py-10 text-center text-sm text-slate-500">
                No monthly progress data yet.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={320}>
                <LineChart data={progressData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} vertical={false} />
                  <XAxis
                    dataKey="month"
                    tick={{ fill: "#64748b", fontSize: 11 }}
                    axisLine={{ stroke: COLORS.grid }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: "#64748b", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `\u20b9${(v / 100000).toFixed(0)}L`}
                  />
                  <Tooltip content={<CustomTooltip formatter={currency} />} />
                  <Legend
                    wrapperStyle={{ fontSize: 12, color: "#94a3b8" }}
                    iconType="circle"
                    iconSize={8}
                  />
                  <Line
                    type="monotone"
                    dataKey="target"
                    name="Required Pace"
                    stroke={COLORS.target}
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="actual"
                    name="Actual Progress"
                    stroke={COLORS.actual}
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: COLORS.actual, strokeWidth: 0 }}
                    activeDot={{ r: 5 }}
                    connectNulls={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </Panel>
        </div>

        {/* Completion table */}
        <div className="mt-4">
          <Panel title="Milestone Completion" subtitle="Progress checkpoints toward the annual goal">
            <div className="overflow-x-auto -mx-1">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-xs text-slate-500 uppercase tracking-wide">
                    <th className="px-2 py-2 font-medium">Milestone</th>
                    <th className="px-2 py-2 font-medium">Amount</th>
                    <th className="px-2 py-2 font-medium">Expected Date</th>
                    <th className="px-2 py-2 font-medium">Date Reached</th>
                    <th className="px-2 py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {milestones.map((m) => (
                    <tr key={m.pct} className="hover:bg-slate-800/40 transition-colors">
                      <td className="px-2 py-3">
                        <div className="flex items-center gap-2 font-medium text-slate-200">
                          {m.reached ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                          ) : (
                            <Circle className="h-4 w-4 text-slate-600" />
                          )}
                          {m.pct}%
                        </div>
                      </td>
                      <td className="px-2 py-3 text-slate-300 tabular-nums">
                        {currency(m.milestoneAmount)}
                      </td>
                      <td className="px-2 py-3 text-slate-500 text-xs">
                        {formatDate(m.expectedDate)}
                      </td>
                      <td className="px-2 py-3 text-slate-500 text-xs">
                        {m.reachedDate ? formatDate(m.reachedDate) : "\u2014"}
                      </td>
                      <td className="px-2 py-3">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${statusStyles[m.status]}`}
                        >
                          {m.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </div>
      </div>

      {modalOpen && (
        <SetGoalModal
          goal={goal}
          onClose={() => setModalOpen(false)}
          onSave={() => {
            setModalOpen(false);
            fetchActiveGoal();
          }}
        />
      )}
    </div>
  );
};

export default Goals;
