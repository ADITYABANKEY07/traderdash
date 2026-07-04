import Trader, { PnLEntry } from "../models/Trader.js";
import asyncHandler from "../utils/asyncHandler.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// Computes a trader's total profit/loss by summing all of their raw PnLEntry
// submissions. This is the single source of truth for "profit" — it is no
// longer a manually-set field on the Trader document.
const getTotalProfit = async (traderId) => {
  const result = await PnLEntry.aggregate([
    { $match: { trader: traderId } },
    { $group: { _id: null, total: { $sum: "$pnl" } } },
  ]);
  return result[0]?.total || 0;
};

// Attaches a computed `profit` field to a trader document (or array of them)
// without mutating the stored document.
const withComputedProfit = async (traderDoc) => {
  const profit = await getTotalProfit(traderDoc._id);
  return { ...traderDoc.toObject(), profit };
};

const withComputedProfitMany = async (traderDocs) => {
  return Promise.all(traderDocs.map(withComputedProfit));
};

const dayKey = (d) => d.toISOString().slice(0, 10); // YYYY-MM-DD
const weekKey = (d) => {
  // ISO week-ish bucket: group by the Monday of that week
  const date = new Date(d);
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() - day + 1);
  return date.toISOString().slice(0, 10);
};
const monthKey = (d) => d.toISOString().slice(0, 7); // YYYY-MM

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

// Buckets a trader's raw PnLEntry rows into daily / weekly / monthly groups,
// matching the { label, range, pnl } shape the Traders.jsx chart expects.
const bucketEntries = (entries, period) => {
  const buckets = new Map();

  for (const entry of entries) {
    const date = new Date(entry.date);
    let key, label, range;

    if (period === "daily") {
      key = dayKey(date);
      label = `${MONTH_NAMES[date.getUTCMonth()]} ${date.getUTCDate()}`;
      range = date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    } else if (period === "monthly") {
      key = monthKey(date);
      label = MONTH_NAMES[date.getUTCMonth()];
      range = `${MONTH_NAMES[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
    } else {
      // weekly (default)
      const monday = new Date(weekKey(date));
      const sunday = new Date(monday);
      sunday.setUTCDate(sunday.getUTCDate() + 6);
      key = weekKey(date);
      label = `Wk of ${MONTH_NAMES[monday.getUTCMonth()]} ${monday.getUTCDate()}`;
      range = `${MONTH_NAMES[monday.getUTCMonth()]} ${monday.getUTCDate()} \u2013 ${MONTH_NAMES[sunday.getUTCMonth()]} ${sunday.getUTCDate()}`;
    }

    if (!buckets.has(key)) {
      buckets.set(key, { key, label, range, pnl: 0 });
    }
    buckets.get(key).pnl += entry.pnl;
  }

  return Array.from(buckets.values()).sort((a, b) => (a.key > b.key ? 1 : -1));
};

// ---------------------------------------------------------------------------
// Admin-facing trader management
// ---------------------------------------------------------------------------

// @desc    Get all traders (supports ?status= and ?search= query filters)
// @route   GET /traders
// @access  Private (Admin)
export const getTraders = asyncHandler(async (req, res) => {
  const { status, search } = req.query;
  const filter = {};

  if (status && status !== "All") {
    filter.status = status;
  }
  if (search) {
    filter.name = { $regex: search, $options: "i" };
  }

  const traders = await Trader.find(filter).sort({ createdAt: -1 });
  const withProfit = await withComputedProfitMany(traders);

  res.status(200).json(withProfit);
});

// @desc    Get a single trader by id
// @route   GET /traders/:id
// @access  Private (Admin)
export const getTraderById = asyncHandler(async (req, res) => {
  const trader = await Trader.findById(req.params.id);

  if (!trader) {
    res.status(404);
    throw new Error("Trader not found");
  }

  res.status(200).json(await withComputedProfit(trader));
});

// @desc    Create a trader record directly (admin-managed account, no self-signup)
// @route   POST /traders
// @access  Private (Admin)
export const createTrader = asyncHandler(async (req, res) => {
  const { name, email, password, capital, winRate, drawdown, risk, status, joined } = req.body;

  if (!name || !email || !password) {
    res.status(400);
    throw new Error("Name, email and password are required");
  }

  const existing = await Trader.findOne({ email });
  if (existing) {
    res.status(400);
    throw new Error("A trader with this email already exists");
  }

  const trader = await Trader.create({
    name,
    email,
    password,
    capital,
    winRate,
    drawdown,
    risk,
    status,
    joined,
  });

  res.status(201).json(await withComputedProfit(trader));
});

// @desc    Update a trader's details (capital, winRate, drawdown, risk, status, etc.)
// @route   PUT /traders/:id
// @access  Private (Admin)
export const updateTrader = asyncHandler(async (req, res) => {
  const trader = await Trader.findById(req.params.id);

  if (!trader) {
    res.status(404);
    throw new Error("Trader not found");
  }

  // profit is computed, not stored — ignore it if sent by mistake
  const { profit, password, ...allowedUpdates } = req.body;
  Object.assign(trader, allowedUpdates);
  const updatedTrader = await trader.save();

  res.status(200).json(await withComputedProfit(updatedTrader));
});

// @desc    Delete a trader
// @route   DELETE /traders/:id
// @access  Private (Admin)
export const deleteTrader = asyncHandler(async (req, res) => {
  const trader = await Trader.findById(req.params.id);

  if (!trader) {
    res.status(404);
    throw new Error("Trader not found");
  }

  await trader.deleteOne();
  await PnLEntry.deleteMany({ trader: trader._id });

  res.status(200).json({ message: "Trader removed" });
});

// @desc    Get a trader's P&L history, bucketed by period (daily | weekly | monthly)
// @route   GET /traders/:id/pnl?period=weekly
// @access  Private (Admin)
export const getTraderPnL = asyncHandler(async (req, res) => {
  const { period = "weekly" } = req.query;

  if (!["daily", "weekly", "monthly"].includes(period)) {
    res.status(400);
    throw new Error("period must be one of: daily, weekly, monthly");
  }

  const entries = await PnLEntry.find({ trader: req.params.id }).sort({ date: 1 });
  res.status(200).json(bucketEntries(entries, period));
});

export { getTotalProfit, bucketEntries };
