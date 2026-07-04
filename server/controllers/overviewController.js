import Trader, { PnLEntry } from "../models/Trader.js";
import asyncHandler from "../utils/asyncHandler.js";

// @desc    Get all stats needed by the Overview page in one request:
//          - top stat cards (totalTraders, activeTraders, totalProfit, avgWinRate)
//          - daily P&L trend for last 14 days (line chart)
//          - monthly profit vs loss breakdown (bar chart)
//          - insights (highestProfitDay, activeCount)
//          - recent activity (last 10 P&L entries across all traders)
// @route   GET /overview
// @access  Private (Admin)
export const getOverviewStats = asyncHandler(async (req, res) => {
  const [traders, allEntries] = await Promise.all([
    Trader.find().lean(),
    PnLEntry.find()
      .sort({ date: -1 })
      .populate("trader", "name")
      .lean(),
  ]);

  // ---- Top stat cards ----
  const totalTraders = traders.length;
  const activeTraders = traders.filter((t) => t.status === "Active").length;
  const totalProfit = traders.reduce((sum, t) => sum + (t.profit || 0), 0);
  const avgWinRate =
    totalTraders > 0
      ? traders.reduce((sum, t) => sum + (t.winRate || 0), 0) / totalTraders
      : 0;

  // ---- Daily P&L trend — last 14 calendar days (aggregate across all traders) ----
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  const fourteenDaysAgo = new Date(today);
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 13);
  fourteenDaysAgo.setHours(0, 0, 0, 0);

  const recentEntries = allEntries.filter(
    (e) => new Date(e.date) >= fourteenDaysAgo
  );

  // Group by calendar day
  const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const dailyMap = new Map();
  for (const entry of recentEntries) {
    const d = new Date(entry.date);
    const key = d.toISOString().slice(0, 10); // YYYY-MM-DD
    const label = `${MONTH_NAMES[d.getMonth()]} ${String(d.getDate()).padStart(2, "0")}`;
    if (!dailyMap.has(key)) dailyMap.set(key, { day: label, pnl: 0 });
    dailyMap.get(key).pnl += entry.pnl;
  }
  // Fill in missing days with 0 so the chart line is continuous
  for (let i = 0; i <= 13; i++) {
    const d = new Date(fourteenDaysAgo);
    d.setDate(d.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    const label = `${MONTH_NAMES[d.getMonth()]} ${String(d.getDate()).padStart(2, "0")}`;
    if (!dailyMap.has(key)) dailyMap.set(key, { day: label, pnl: 0 });
  }
  const dailyPerformance = Array.from(dailyMap.entries())
    .sort(([a], [b]) => (a > b ? 1 : -1))
    .map(([, v]) => v);

  // ---- Monthly P&L — last 6 months (split into profit and loss buckets) ----
  const monthlyMap = new Map();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    monthlyMap.set(key, { month: MONTH_NAMES[d.getMonth()], profit: 0, loss: 0 });
  }
  for (const entry of allEntries) {
    const d = new Date(entry.date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (!monthlyMap.has(key)) continue;
    if (entry.pnl >= 0) {
      monthlyMap.get(key).profit += entry.pnl;
    } else {
      monthlyMap.get(key).loss += entry.pnl; // keep negative for bar chart
    }
  }
  const monthlyPnl = Array.from(monthlyMap.values());

  // ---- Insights ----
  // Highest profit day across all time
  const dayTotals = new Map();
  for (const entry of allEntries) {
    const key = new Date(entry.date).toISOString().slice(0, 10);
    dayTotals.set(key, (dayTotals.get(key) || 0) + entry.pnl);
  }
  let highestProfitDay = null;
  let highestProfitAmount = null;
  for (const [day, total] of dayTotals) {
    if (highestProfitAmount === null || total > highestProfitAmount) {
      highestProfitAmount = total;
      highestProfitDay = day;
    }
  }

  // ---- Recent activity — last 10 PnL entries across all traders ----
  const recentActivity = allEntries.slice(0, 10).map((e) => ({
    _id: e._id,
    trader: e.trader?.name || "Unknown",
    pnl: e.pnl,
    note: e.note || null,
    date: e.date,
    label: e.label || null,
    period: e.period || null,
  }));

  res.status(200).json({
    stats: {
      totalTraders,
      activeTraders,
      totalProfit,
      avgWinRate: Number(avgWinRate.toFixed(1)),
    },
    dailyPerformance,
    monthlyPnl,
    insights: {
      highestProfitDay,
      highestProfitAmount,
      activeTraders,
      avgWinRate: Number(avgWinRate.toFixed(1)),
    },
    recentActivity,
  });
});
