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
} from "recharts";
import {
  ArrowLeft,
  TrendingUp,
  Target,
  Percent,
  Mail,
  CalendarDays,
  Moon,
  Sun,
  User,
  Loader2,
} from "lucide-react";

const API_BASE = "https://traderdash-c8fz.onrender.com/traders";

// Icon fallback — the backend doesn't store a component reference, so pick a
// reasonable icon by trader name where possible, otherwise a generic person icon.
// Declared as a real component (not a variable holding a component) so it can
// safely be created/used at any render without violating the rules of hooks/lint.
function TraderIcon({ name = "", className }) {
  const lower = name.toLowerCase();
  if (lower.includes("moon")) return <Moon className={className} />;
  if (lower.includes("sun")) return <Sun className={className} />;
  return <User className={className} />;
}

const PERIOD_OPTIONS = [
  { key: "daily", label: "Daily" },
  { key: "weekly", label: "Weekly" },
  { key: "monthly", label: "Monthly" },
];

const COLORS = { accent: "#22d3ee", grid: "#1e293b" };

const currency = (n) =>
  `\u20b9${Math.abs(Math.round(n)).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
const signedCurrency = (n) => `${n < 0 ? "-" : "+"}${currency(n)}`;

const authHeaders = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem("adminToken")}` },
});

// ---------------------------------------------------------------------------
// Shared building blocks
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

function StatusBadge({ status }) {
  const styles = {
    Active: "bg-emerald-400/10 text-emerald-400",
    Paused: "bg-amber-400/10 text-amber-400",
    Inactive: "bg-slate-500/10 text-slate-400",
  };
  const dot = {
    Active: "bg-emerald-400",
    Paused: "bg-amber-400",
    Inactive: "bg-slate-400",
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${styles[status]}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dot[status]}`} />
      {status}
    </span>
  );
}

function RiskBadge({ risk }) {
  const styles = {
    High: "bg-rose-400/10 text-rose-400",
    Medium: "bg-amber-400/10 text-amber-400",
    Low: "bg-slate-500/10 text-slate-400",
  };
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${styles[risk]}`}>
      {risk}
    </span>
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

function PeriodTabs({ active, onChange }) {
  return (
    <div className="inline-flex rounded-xl border border-slate-800 bg-slate-950/60 p-1">
      {PERIOD_OPTIONS.map((p) => (
        <button
          key={p.key}
          onClick={() => onChange(p.key)}
          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
            active === p.key
              ? "bg-cyan-400/10 text-cyan-400"
              : "text-slate-500 hover:text-slate-300"
          }`}
        >
          {p.label}
        </button>
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

function ErrorState({ message, onRetry }) {
  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center gap-3 bg-slate-950 text-slate-400">
      <p className="text-sm text-rose-400">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="rounded-xl border border-slate-800 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800 transition-colors"
        >
          Retry
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main screen — trader tiles, fetched from the API
// ---------------------------------------------------------------------------

function TraderTiles({ onSelect }) {
  const [traders, setTraders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchTraders = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await axios.get(`${API_BASE}/traders`, authHeaders());
      setTraders(res.data);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load traders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- standard fetch-on-mount pattern
    fetchTraders();
  }, []);

  if (loading) return <LoadingState label="Loading traders..." />;
  if (error) return <ErrorState message={error} onRetry={fetchTraders} />;

  return (
    <div className="min-h-screen w-full bg-slate-950 text-slate-200">
      <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold text-slate-50 sm:text-2xl">Traders</h1>
            <p className="text-sm text-slate-500">Select a trader to view full details</p>
          </div>
        </div>

        {/* Tiles */}
        {traders.length === 0 ? (
          <p className="text-sm text-slate-500">No traders found yet.</p>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 max-w-2xl">
            {traders.map((t) => (
              <button
                key={t._id}
                onClick={() => onSelect(t)}
                className="group flex flex-col items-center justify-center gap-4 rounded-2xl bg-slate-900/60 border border-slate-800 p-12 shadow-lg shadow-black/20 hover:border-cyan-500/40 hover:bg-slate-900 transition-colors"
              >
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-cyan-400/10 group-hover:bg-cyan-400/20 transition-colors">
                  <TraderIcon name={t.name} className="h-8 w-8 text-cyan-400" />
                </div>
                <span className="text-lg font-semibold text-slate-50">{t.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Detail view — fetches this trader's P&L history per period from the API
// ---------------------------------------------------------------------------

function TraderDetail({ trader, onBack }) {
  const [period, setPeriod] = useState("weekly");
  const [pnlData, setPnlData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchPnL = async (selectedPeriod) => {
    setLoading(true);
    setError("");
    try {
      const res = await axios.get(
        `${API_BASE}/traders/${trader._id}/pnl?period=${selectedPeriod}`,
        authHeaders()
      );
      setPnlData(res.data);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load P/L data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- standard fetch-on-param-change pattern
    fetchPnL(period);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period, trader._id]);

  const activeLabel = PERIOD_OPTIONS.find((p) => p.key === period)?.label || "";
  const joinedDate = trader.joined
    ? new Date(trader.joined).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "—";

  return (
    <div className="min-h-screen w-full bg-slate-950 text-slate-200">
      <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">
        {/* Back + header */}
        <button
          onClick={onBack}
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to traders
        </button>

        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-cyan-400/10">
              <TraderIcon name={trader.name} className="h-7 w-7 text-cyan-400" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-slate-50 sm:text-2xl">{trader.name}</h1>
              <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <Mail className="h-3.5 w-3.5" /> {trader.email}
                </span>
                <span className="flex items-center gap-1">
                  <CalendarDays className="h-3.5 w-3.5" /> Joined {joinedDate}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={trader.status} />
            <RiskBadge risk={trader.risk} />
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-5 shadow-lg shadow-black/20">
            <div className="flex items-center gap-2 text-slate-400 text-xs font-medium uppercase tracking-wide">
              <TrendingUp className="h-4 w-4 text-emerald-400" />
              Net Profit/Loss
            </div>
            <p
              className={`mt-2 text-2xl font-semibold tabular-nums ${
                trader.profit >= 0 ? "text-emerald-400" : "text-rose-400"
              }`}
            >
              {signedCurrency(trader.profit)}
            </p>
          </div>
          <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-5 shadow-lg shadow-black/20">
            <div className="flex items-center gap-2 text-slate-400 text-xs font-medium uppercase tracking-wide">
              <Target className="h-4 w-4 text-pink-400" />
              Win Rate
            </div>
            <p className="mt-2 text-2xl font-semibold text-slate-50 tabular-nums">{trader.winRate}%</p>
          </div>
          <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-5 shadow-lg shadow-black/20">
            <div className="flex items-center gap-2 text-slate-400 text-xs font-medium uppercase tracking-wide">
              <Percent className="h-4 w-4 text-indigo-400" />
              Max Drawdown
            </div>
            <p className="mt-2 text-2xl font-semibold text-slate-50 tabular-nums">{trader.drawdown}%</p>
          </div>
        </div>

        {/* Period tabs */}
        <div className="mt-6 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-300">Performance</h2>
          <PeriodTabs active={period} onChange={setPeriod} />
        </div>

        {/* P/L curve + P/L data */}
        <div className="mt-3 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Panel title="P/L Curve" subtitle={`${activeLabel} profit/loss`}>
            {loading ? (
              <div className="flex h-[260px] items-center justify-center text-slate-500 text-sm">
                <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading chart...
              </div>
            ) : error ? (
              <div className="flex h-[260px] items-center justify-center text-rose-400 text-sm">
                {error}
              </div>
            ) : pnlData.length === 0 ? (
              <div className="flex h-[260px] items-center justify-center text-slate-500 text-sm">
                No {period} P/L entries yet.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={pnlData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: "#64748b", fontSize: 11 }}
                    axisLine={{ stroke: COLORS.grid }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: "#64748b", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `$${v / 1000}k`}
                  />
                  <Tooltip content={<CustomTooltip formatter={signedCurrency} />} />
                  <Line
                    type="monotone"
                    dataKey="pnl"
                    name="P/L"
                    stroke={COLORS.accent}
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: COLORS.accent, strokeWidth: 0 }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </Panel>

          <Panel title="P/L Data" subtitle={`${activeLabel} profit/loss breakdown`}>
            {loading ? (
              <div className="flex h-[260px] items-center justify-center text-slate-500 text-sm">
                <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading data...
              </div>
            ) : error ? (
              <div className="flex h-[260px] items-center justify-center text-rose-400 text-sm">
                {error}
              </div>
            ) : pnlData.length === 0 ? (
              <div className="flex h-[260px] items-center justify-center text-slate-500 text-sm">
                No {period} P/L entries yet.
              </div>
            ) : (
              <div className="overflow-x-auto -mx-1">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="text-xs text-slate-500 uppercase tracking-wide">
                      <th className="px-2 py-2 font-medium">Period</th>
                      <th className="px-2 py-2 font-medium">Date</th>
                      <th className="px-2 py-2 font-medium">Profit/Loss</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {pnlData.map((p) => (
                      <tr key={p._id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="px-2 py-3 font-medium text-slate-200">{p.label}</td>
                        <td className="px-2 py-3 text-slate-500 text-xs">{p.range}</td>
                        <td
                          className={`px-2 py-3 font-medium tabular-nums ${
                            p.pnl >= 0 ? "text-emerald-400" : "text-rose-400"
                          }`}
                        >
                          {signedCurrency(p.pnl)}
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
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

const Traders = () => {
  const [selectedTrader, setSelectedTrader] = useState(null);

  if (selectedTrader) {
    return <TraderDetail trader={selectedTrader} onBack={() => setSelectedTrader(null)} />;
  }

  return <TraderTiles onSelect={setSelectedTrader} />;
};

export default Traders;
