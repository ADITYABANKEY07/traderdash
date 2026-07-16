import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  Users,
  TrendingUp,
  Target,
  ArrowUpRight,
  ArrowDownRight,
  CalendarDays,
  Percent,
  RefreshCw,
} from "lucide-react";

const API_BASE = "https://traderdash-c8fz.onrender.com";

const COLORS = {
  accent: "#22d3ee",
  profit: "#34d399",
  loss:   "#f87171",
  grid:   "#1e293b",
};

const authHeaders = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem("adminToken")}` },
});

const currency = (n) =>
  `₹${Math.abs(Math.round(n)).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
const signedCurrency = (n) => `${n < 0 ? "-" : "+"}${currency(n)}`;

const formatDate = (iso) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const timeAgo = (iso) => {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  return `${Math.floor(hrs / 24)} days ago`;
};

// ---------------------------------------------------------------------------
// Skeleton loader — keeps layout stable while data loads
// ---------------------------------------------------------------------------

function Skeleton({ className = "" }) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-slate-800/60 ${className}`}
    />
  );
}

// ---------------------------------------------------------------------------
// Building blocks
// ---------------------------------------------------------------------------

function StatCard({ icon: Icon, label, value, delta, deltaPositive, accent, loading }) {
  return (
    <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-5 shadow-lg shadow-black/20 hover:border-slate-700 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs font-medium text-slate-400 tracking-wide uppercase">{label}</p>
          {loading ? (
            <Skeleton className="mt-2 h-8 w-32" />
          ) : (
            <p className="mt-2 text-2xl font-semibold text-slate-50 tabular-nums">{value}</p>
          )}
        </div>
        <div
          className="flex h-10 w-10 items-center justify-center rounded-xl"
          style={{ backgroundColor: `${accent}1A` }}
        >
          <Icon className="h-5 w-5" style={{ color: accent }} />
        </div>
      </div>
      {!loading && delta && (
        <div className="mt-3 flex items-center gap-1 text-xs font-medium">
          {deltaPositive ? (
            <ArrowUpRight className="h-3.5 w-3.5 text-emerald-400" />
          ) : (
            <ArrowDownRight className="h-3.5 w-3.5 text-rose-400" />
          )}
          <span className={deltaPositive ? "text-emerald-400" : "text-rose-400"}>{delta}</span>
        </div>
      )}
    </div>
  );
}

function InsightCard({ icon: Icon, iconColor, label, value, sub, subColor, loading }) {
  return (
    <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-5 shadow-lg shadow-black/20">
      <div className="flex items-center gap-2 text-slate-400 text-xs font-medium uppercase tracking-wide">
        <Icon className={`h-4 w-4 ${iconColor}`} />
        {label}
      </div>
      {loading ? (
        <>
          <Skeleton className="mt-2 h-6 w-40" />
          <Skeleton className="mt-1.5 h-3.5 w-28" />
        </>
      ) : (
        <>
          <p className="mt-2 text-lg font-semibold text-slate-50">{value}</p>
          <p className={`text-xs mt-0.5 ${subColor}`}>{sub}</p>
        </>
      )}
    </div>
  );
}

function Panel({ title, subtitle, children, className = "" }) {
  return (
    <div
      className={`rounded-2xl bg-slate-900/60 border border-slate-800 p-5 shadow-lg shadow-black/20 ${className}`}
    >
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-100">{title}</h3>
          {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}

function CustomTooltip({ active, payload, label, formatter }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 shadow-xl text-xs">
      <p className="text-slate-400 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="font-medium" style={{ color: p.color }}>
          {p.name}: {formatter ? formatter(p.value) : p.value}
        </p>
      ))}
    </div>
  );
}

function ChartSkeleton({ height = 280 }) {
  return (
    <div
      className="w-full animate-pulse rounded-xl bg-slate-800/40 flex items-center justify-center"
      style={{ height }}
    >
      <span className="text-xs text-slate-600">Loading chart…</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

const Overview = () => {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchOverview = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await axios.get(`${API_BASE}/overview`, authHeaders());
      setData(res.data);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load overview data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchOverview();
  }, []);

  const stats         = data?.stats          ?? {};
  const dailyPerf     = data?.dailyPerformance ?? [];
  const monthlyPnl    = data?.monthlyPnl      ?? [];
  const insights      = data?.insights        ?? {};
  const recentActivity = data?.recentActivity ?? [];

  return (
    <div className="min-h-screen w-full bg-slate-950 text-slate-200">
      <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="mb-6 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold text-slate-50 sm:text-2xl">
              Analytics Overview
            </h1>
            <p className="text-sm text-slate-500">
              Performance and risk across all managed trader accounts
            </p>
          </div>
          <div className="flex items-center gap-3">
            {lastUpdated && (
              <span className="flex items-center gap-1.5 text-xs text-slate-500">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                Updated {timeAgo(lastUpdated)}
              </span>
            )}
            <button
              onClick={fetchOverview}
              disabled={loading}
              className="flex items-center gap-1.5 rounded-xl border border-slate-800 px-3 py-1.5 text-xs font-medium text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors disabled:opacity-40"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Error banner */}
        {error && (
          <div className="mb-4 flex items-center justify-between rounded-xl bg-rose-400/10 border border-rose-400/20 px-4 py-3">
            <p className="text-sm text-rose-400">{error}</p>
            <button
              onClick={fetchOverview}
              className="text-xs font-medium text-rose-400 hover:text-rose-300 underline"
            >
              Retry
            </button>
          </div>
        )}

        {/* Top Statistics Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard
            icon={Users}
            label="Total Traders"
            value={stats.totalTraders ?? "—"}
            delta={stats.activeTraders != null ? `${stats.activeTraders} active` : undefined}
            deltaPositive
            accent={COLORS.accent}
            loading={loading}
          />
          <StatCard
            icon={TrendingUp}
            label="Total Profit / Loss"
            value={stats.totalProfit != null ? signedCurrency(stats.totalProfit) : "—"}
            delta={stats.totalProfit != null ? (stats.totalProfit >= 0 ? "Profitable" : "In loss") : undefined}
            deltaPositive={stats.totalProfit >= 0}
            accent="#34d399"
            loading={loading}
          />
          <StatCard
            icon={Target}
            label="Avg Win Rate"
            value={stats.avgWinRate != null ? `${stats.avgWinRate}%` : "—"}
            accent="#f472b6"
            loading={loading}
          />
        </div>

        {/* Charts */}
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Panel title="Trader Performance" subtitle="Daily aggregate P/L — last 14 days">
            {loading ? (
              <ChartSkeleton height={280} />
            ) : dailyPerf.length === 0 ? (
              <div className="flex h-[280px] items-center justify-center text-sm text-slate-500">
                No daily P/L entries yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={dailyPerf} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} vertical={false} />
                  <XAxis
                    dataKey="day"
                    tick={{ fill: "#64748b", fontSize: 11 }}
                    axisLine={{ stroke: COLORS.grid }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: "#64748b", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `₹${(v / 100000).toFixed(0)}L`}
                  />
                  <Tooltip content={<CustomTooltip formatter={signedCurrency} />} />
                  <Line
                    type="monotone"
                    dataKey="pnl"
                    name="P&L"
                    stroke={COLORS.accent}
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: COLORS.accent, strokeWidth: 0 }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </Panel>

          <Panel title="Profit & Loss Analytics" subtitle="Monthly breakdown — last 6 months">
            {loading ? (
              <ChartSkeleton height={280} />
            ) : monthlyPnl.length === 0 ? (
              <div className="flex h-[280px] items-center justify-center text-sm text-slate-500">
                No monthly data yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={monthlyPnl} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
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
                    tickFormatter={(v) => `₹${(v / 100000).toFixed(0)}L`}
                  />
                  <Tooltip content={<CustomTooltip formatter={signedCurrency} />} />
                  <Legend
                    wrapperStyle={{ fontSize: 12, color: "#94a3b8" }}
                    iconType="circle"
                    iconSize={8}
                  />
                  <Bar dataKey="profit" name="Profit" fill={COLORS.profit} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="loss"   name="Loss"   fill={COLORS.loss}   radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Panel>
        </div>

        {/* Insight Cards */}
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <InsightCard
            icon={CalendarDays}
            iconColor="text-cyan-400"
            label="Highest Profit Day"
            value={insights.highestProfitDay ? formatDate(insights.highestProfitDay) : "No data yet"}
            sub={
              insights.highestProfitAmount != null && insights.highestProfitAmount > 0
                ? `+${currency(insights.highestProfitAmount)} total that day`
                : "Submit P/L entries to see this"
            }
            subColor={insights.highestProfitAmount > 0 ? "text-emerald-400" : "text-slate-500"}
            loading={loading}
          />
          <InsightCard
            icon={Percent}
            iconColor="text-indigo-400"
            label="Average Win Rate"
            value={insights.avgWinRate != null ? `${insights.avgWinRate}%` : "—"}
            sub={
              insights.activeTraders != null
                ? `Across ${insights.activeTraders} active account${insights.activeTraders !== 1 ? "s" : ""}`
                : "No active accounts"
            }
            subColor="text-slate-500"
            loading={loading}
          />
        </div>

        {/* Recent Activity */}
        <div className="mt-4">
          <Panel
            title="Recent Trading Activity"
            subtitle="Latest P/L entries submitted across all accounts"
          >
            {loading ? (
              <div className="flex flex-col gap-3">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : recentActivity.length === 0 ? (
              <div className="py-10 text-center text-sm text-slate-500">
                No P/L entries yet — traders can submit results from their dashboard
              </div>
            ) : (
              <div className="overflow-x-auto -mx-1">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="text-xs text-slate-500 uppercase tracking-wide">
                      <th className="px-2 py-2 font-medium">Trader</th>
                      <th className="px-2 py-2 font-medium">Note</th>
                      <th className="px-2 py-2 font-medium">Profit/Loss</th>
                      <th className="px-2 py-2 font-medium">Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {recentActivity.map((a) => (
                      <tr key={a._id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="px-2 py-3 font-medium text-slate-200">{a.trader}</td>
                        <td className="px-2 py-3 text-slate-400 text-xs">
                          {a.note || <span className="text-slate-600">—</span>}
                        </td>
                        <td
                          className={`px-2 py-3 font-medium tabular-nums ${
                            a.pnl >= 0 ? "text-emerald-400" : "text-rose-400"
                          }`}
                        >
                          {signedCurrency(a.pnl)}
                        </td>
                        <td className="px-2 py-3 text-slate-500 text-xs">
                          {timeAgo(a.date)}
                        </td>
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

export default Overview;
