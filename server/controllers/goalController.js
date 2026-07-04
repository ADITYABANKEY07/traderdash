import Goal, { GoalProgress } from "../models/Goal.js";
import { PnLEntry } from "../models/Trader.js";
import asyncHandler from "../utils/asyncHandler.js";

const daysBetween = (a, b) => Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));

const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

// Sums all PnLEntry records whose date falls within the goal's period
// (from startDate up to today or deadline, whichever is earlier).
// Only positive entries count toward the "achieved" profit figure.
const computeLiveAchieved = async (goal) => {
  const start    = new Date(goal.startDate);
  const deadline = new Date(goal.deadline);
  const today    = new Date();
  const cutoff   = today < deadline ? today : deadline;

  const result = await PnLEntry.aggregate([
    {
      $match: {
        date: { $gte: start, $lte: cutoff },
        pnl: { $gt: 0 }, // only winning entries count as "achieved"
      },
    },
    { $group: { _id: null, total: { $sum: "$pnl" } } },
  ]);

  return result[0]?.total || 0;
};

// Builds the monthly actual-vs-target progress series used in the achievement
// graph. "actual" is the cumulative profit up to each month from real PnLEntry
// data. "target" is the straight-line required pace across the goal period.
const buildProgressSeries = async (goal) => {
  const start    = new Date(goal.startDate);
  const deadline = new Date(goal.deadline);
  const today    = new Date();

  // Generate the list of months between start and deadline
  const months = [];
  const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
  const endMonth = new Date(deadline.getFullYear(), deadline.getMonth(), 1);
  while (cursor <= endMonth) {
    months.push(new Date(cursor));
    cursor.setMonth(cursor.getMonth() + 1);
  }

  const totalDays = daysBetween(start, deadline);

  // Fetch all positive P&L entries within the goal window
  const entries = await PnLEntry.find({
    date: { $gte: start, $lte: deadline },
    pnl: { $gt: 0 },
  }).lean();

  // Cumulative sum per calendar month
  const monthlyActual = new Map();
  for (const entry of entries) {
    const d = new Date(entry.date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    monthlyActual.set(key, (monthlyActual.get(key) || 0) + entry.pnl);
  }

  // Build cumulative totals
  let cumulative = 0;
  return months.map((monthDate) => {
    const key   = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, "0")}`;
    const label = MONTH_NAMES[monthDate.getMonth()];

    // Required pace: straight line from 0 to target over the goal period
    const endOfMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
    const daysIntoGoal = Math.min(daysBetween(start, endOfMonth), totalDays);
    const targetAtMonth = Number(((daysIntoGoal / totalDays) * goal.target).toFixed(0));

    // Actual: cumulative up to end of this month, null for future months
    const isPast = endOfMonth <= today;
    if (isPast && monthlyActual.has(key)) {
      cumulative += monthlyActual.get(key);
    }

    return {
      month: label,
      target: targetAtMonth,
      actual: isPast ? cumulative : null,
    };
  });
};

// Core metrics computation — now takes the live achieved value as a parameter
// instead of reading goal.achieved from the database.
const computeGoalMetrics = (goal, liveAchieved) => {
  const today    = new Date();
  const start    = new Date(goal.startDate);
  const deadline = new Date(goal.deadline);

  const totalDays     = daysBetween(start, deadline);
  const elapsedDays   = Math.max(1, daysBetween(start, today));
  const remainingDays = daysBetween(today, deadline);

  const progressPct = Math.min(100, (liveAchieved / goal.target) * 100);
  const expectedPct = Math.min(100, (elapsedDays / totalDays) * 100);

  const dailyRate = liveAchieved / elapsedDays;
  const projectedDaysToGoal = dailyRate > 0 ? goal.target / dailyRate : Infinity;
  const projectedFinishDate  =
    dailyRate > 0 ? new Date(start.getTime() + projectedDaysToGoal * 86400000) : null;

  const onTrack        = projectedFinishDate ? projectedFinishDate <= deadline : false;
  const aheadBehindDays = projectedFinishDate ? daysBetween(projectedFinishDate, deadline) : null;
  const remainingAmount = Math.max(0, goal.target - liveAchieved);

  return {
    totalDays,
    elapsedDays,
    remainingDays,
    progressPct:   Number(progressPct.toFixed(1)),
    expectedPct:   Number(expectedPct.toFixed(1)),
    projectedFinishDate,
    onTrack,
    aheadBehindDays,
    remainingAmount,
  };
};

// @desc    Get the active goal with LIVE achieved (summed from real PnLEntry
//          data), computed metrics, and auto-generated progress series.
//          Every time a trader submits a P&L entry, this endpoint reflects it.
// @route   GET /goals/active
// @access  Private (Admin)
export const getActiveGoal = asyncHandler(async (req, res) => {
  const goal = await Goal.findOne({ isActive: true }).sort({ createdAt: -1 });

  if (!goal) {
    res.status(404);
    throw new Error("No active goal found");
  }

  // Compute achieved live from PnLEntry submissions — ignores goal.achieved field
  const liveAchieved = await computeLiveAchieved(goal);

  // Attach the live value to the goal object before sending
  const goalWithLive = { ...goal.toObject(), achieved: liveAchieved };

  const metrics      = computeGoalMetrics(goal, liveAchieved);
  const progressData = await buildProgressSeries(goal);

  res.status(200).json({ goal: goalWithLive, metrics, progressData });
});

// @desc    Get all goals (history)
// @route   GET /goals
// @access  Private (Admin)
export const getGoals = asyncHandler(async (req, res) => {
  const goals = await Goal.find().sort({ createdAt: -1 });
  res.status(200).json(goals);
});

// @desc    Create / set a new goal. Only needs target, startDate, deadline —
//          achieved is computed automatically from trader submissions.
// @route   POST /goals
// @access  Private (Admin)
export const createGoal = asyncHandler(async (req, res) => {
  const { title, target, startDate, deadline } = req.body;

  if (!target || !startDate || !deadline) {
    res.status(400);
    throw new Error("target, startDate and deadline are required");
  }

  // Deactivate any currently active goal before creating a new one
  await Goal.updateMany({ isActive: true }, { isActive: false });

  const goal = await Goal.create({
    title,
    target,
    achieved: 0, // stored value is unused for display; kept for schema compatibility
    startDate,
    deadline,
    isActive: true,
  });

  res.status(201).json(goal);
});

// @desc    Update a goal (target, deadline, title, etc.)
// @route   PUT /goals/:id
// @access  Private (Admin)
export const updateGoal = asyncHandler(async (req, res) => {
  const goal = await Goal.findById(req.params.id);

  if (!goal) {
    res.status(404);
    throw new Error("Goal not found");
  }

  // Never allow manually overriding achieved through this endpoint
  const { achieved, ...safeUpdates } = req.body;
  Object.assign(goal, safeUpdates);
  const updatedGoal = await goal.save();

  res.status(200).json(updatedGoal);
});

// @desc    Delete a goal
// @route   DELETE /goals/:id
// @access  Private (Admin)
export const deleteGoal = asyncHandler(async (req, res) => {
  const goal = await Goal.findById(req.params.id);

  if (!goal) {
    res.status(404);
    throw new Error("Goal not found");
  }

  await goal.deleteOne();
  await GoalProgress.deleteMany({ goal: goal._id });

  res.status(200).json({ message: "Goal removed" });
});

// @desc    Get monthly progress data for the achievement graph
//          (now auto-generated from real PnLEntry data, not manually seeded)
// @route   GET /goals/:id/progress
// @access  Private (Admin)
export const getGoalProgress = asyncHandler(async (req, res) => {
  const goal = await Goal.findById(req.params.id);

  if (!goal) {
    res.status(404);
    throw new Error("Goal not found");
  }

  const progressData = await buildProgressSeries(goal);
  res.status(200).json(progressData);
});

// @desc    Upsert a month's progress entry — kept for backwards compatibility
//          but no longer needed since progress is now auto-computed.
// @route   POST /goals/:id/progress
// @access  Private (Admin)
export const upsertGoalProgress = asyncHandler(async (req, res) => {
  const { month, actual, target } = req.body;

  if (!month || target === undefined) {
    res.status(400);
    throw new Error("month and target are required");
  }

  const entry = await GoalProgress.findOneAndUpdate(
    { goal: req.params.id, month },
    { actual, target },
    { new: true, upsert: true }
  );

  res.status(200).json(entry);
});

