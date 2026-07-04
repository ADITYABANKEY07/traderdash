import { Trader, PnLEntry } from "../models/Trader.js";
import generateToken from "../utils/generateToken.js";
import asyncHandler from "../utils/asyncHandler.js";
import { getTotalProfit, bucketEntries } from "./traderController.js";

// @desc    Trader self-registration — account is active immediately
// @route   POST /trader/register
// @access  Public
export const registerTrader = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    res.status(400);
    throw new Error("Name, email and password are required");
  }

  const existing = await Trader.findOne({ email });
  if (existing) {
    res.status(400);
    throw new Error("A trader with this email already exists");
  }

  const trader = await Trader.create({ name, email, password });

  res.status(201).json({
    _id: trader._id,
    name: trader.name,
    email: trader.email,
    status: trader.status,
    token: generateToken(trader._id, "trader"),
  });
});

// @desc    Trader login
// @route   POST /trader/login
// @access  Public
export const loginTrader = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400);
    throw new Error("Email and password are required");
  }

  const trader = await Trader.findOne({ email }).select("+password");

  if (!trader || !(await trader.comparePassword(password))) {
    res.status(401);
    throw new Error("Invalid email or password");
  }

  res.status(200).json({
    _id: trader._id,
    name: trader.name,
    email: trader.email,
    status: trader.status,
    token: generateToken(trader._id, "trader"),
  });
});

// @desc    Get the logged-in trader's own profile + computed total profit
// @route   GET /trader/me
// @access  Private (Trader)
export const getMyProfile = asyncHandler(async (req, res) => {
  const profit = await getTotalProfit(req.trader._id);
  res.status(200).json({ ...req.trader.toObject(), profit });
});

// @desc    Get the logged-in trader's own P&L history, bucketed by period
// @route   GET /trader/pnl?period=weekly
// @access  Private (Trader)
export const getMyPnL = asyncHandler(async (req, res) => {
  const { period = "weekly" } = req.query;

  if (!["daily", "weekly", "monthly"].includes(period)) {
    res.status(400);
    throw new Error("period must be one of: daily, weekly, monthly");
  }

  const entries = await PnLEntry.find({ trader: req.trader._id }).sort({ date: 1 });
  res.status(200).json(bucketEntries(entries, period));
});

// @desc    Submit a new P&L entry for yourself — amount + date (+ optional note).
//          This is the only data-entry surface on the trader dashboard; every
//          derived stat on the admin side (total profit, charts) is computed
//          from these submissions.
// @route   POST /trader/pnl
// @access  Private (Trader)
export const submitMyPnL = asyncHandler(async (req, res) => {
  const { pnl, date, note } = req.body;

  if (pnl === undefined || pnl === null || pnl === "") {
    res.status(400);
    throw new Error("pnl amount is required");
  }
  if (!date) {
    res.status(400);
    throw new Error("date is required");
  }

  const entry = await PnLEntry.create({
    trader: req.trader._id,
    pnl: Number(pnl),
    date,
    note,
  });

  res.status(201).json(entry);
});

// @desc    Get the logged-in trader's own raw submission history (most recent first)
// @route   GET /trader/pnl/history
// @access  Private (Trader)
export const getMyPnLHistory = asyncHandler(async (req, res) => {
  const entries = await PnLEntry.find({ trader: req.trader._id }).sort({ date: -1 }).limit(50);
  res.status(200).json(entries);
});
