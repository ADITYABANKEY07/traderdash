import Goal, { GoalProgress } from "../models/Goal.js";
import { PnLEntry } from "../models/Trader.js";
import asyncHandler from "../utils/asyncHandler.js";

const daysBetween = (a, b) =>
  Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));

const MONTH_NAMES = [
  "Jan","Feb","Mar","Apr","May","Jun",
  "Jul","Aug","Sep","Oct","Nov","Dec",
];

// ---------------------------------------------------------------------------
// Sums ALL PnLEntry records (profit AND loss) within the goal period.
// This is the combined net profit/loss across every trader.
// No positive-only filter — losses reduce the total just as they should.
// ---------------------------------------------------------------------------
const computeLiveAchieved = async (goal) => {
  const start   = new Date(goal.startDate);
  const deadline = new Date(goal.deadline);
  const today   = new Date();
  const cutoff  = today < deadline ? today : deadline;

  const result = await PnLEntry.aggregate([
    {
      $match: {
        date: { $gte: start, $lte: cutoff },
        // NO pnl filter — sum profits and losses together for real net total
      },
    },
    { $group: { _id: null, total: { $sum: "$pnl" } } },
  ]);

  return result[0]?.total ?? 0;
};

// ---------------------------------------------------------------------------
// Monthly cumulative series for the achievement graph.
// Uses net pnl (all entries), null for months with no data yet so the chart
// doesn't draw a misleading flat zero line.
// ---------------------------------------------------------------------------
const buildProgressSeries = async (goal) => {
  const start    = new Date(goal.startDate);
  const deadline = new Date(goal.deadline);
  const today    = new Date();

  const months = [];
  const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
  const endMonth = new Date(deadline.getFullYear(), deadline.getMonth(), 1);
  while (cursor <= endMonth) {
    months.push(new Date(cursor));
    cursor.setMonth(cursor.getMonth() + 1);
  }

  const totalDays = daysBetween(start, deadline);

  // Fetch ALL entries within the goal window — no sign filter
  const entries = await PnLEntry.find({
    date: { $gte: start, $lte: deadline },
  }).lean();

  // Sum per calendar month (net — includes losses)
  const monthlyNet = new Map();
  for (const entry of entries) {
    const d   = new Date(entry.date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    monthlyNet.set(key, (monthlyNet.get(key) ?? 0) + entry.pnl);
  }

  let cumulative = 0;
  let hasData    = false;

  return months.map((monthDate) => {
    const key = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, "0")}`;
    const endOfMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);

    // Required pace: straight line from 0 → target over the full period
    const daysIntoGoal  = Math.min(daysBetween(start, endOfMonth), totalDays);
    const targetAtMonth = Number(((daysIntoGoal / totalDays) * goal.target).toFixed(0));

    const isPast = endOfMonth <= today;
    if (isPast && monthlyNet.has(key)) {
      cumulative += monthlyNet.get(key);
      hasData     = true;
    }

    return {
      month:  MONTH_NAMES[monthDate.getMonth()],
      target: targetAtMonth,
      // Show null (no line) for months with zero data to avoid a flat zero line
      actual: isPast && hasData ? cumulative : null,
    };
  });
};

// ---------------------------------------------------------------------------
// Metrics: countdown, pace status, projected finish
// ---------------------------------------------------------------------------
const computeGoalMetrics = (goal, liveAchieved) => {
  const today    = new Date();
  const start    = new Date(goal.startDate);
  const deadline = new Date(goal.deadline);

  const totalDays     = daysBetween(start, deadline);
  const elapsedDays   = Math.max(1, daysBetween(start, today));
  const remainingDays = daysBetween(today, deadline);

  const progressPct = Math.min(100, (liveAchieved / goal.target) * 100);
  const expectedPct = Math.min(100, (elapsedDays / totalDays) * 100);

  const dailyRate           = liveAchieved / elapsedDays;
  const projectedDays       = dailyRate > 0 ? goal.target / dailyRate : Infinity;
  const projectedFinishDate = dailyRate > 0
    ? new Date(start.getTime() + projectedDays * 86400000)
    : null;

  const onTrack         = projectedFinishDate ? projectedFinishDate <= deadline : false;
  const aheadBehindDays = projectedFinishDate ? daysBetween(projectedFinishDate, deadline) : null;
  const remainingAmount = Math.max(0, goal.target - liveAchieved);

  return {
    totalDays,
    elapsedDays,
    remainingDays,
    progressPct:      Number(progressPct.toFixed(1)),
    expectedPct:      Number(expectedPct.toFixed(1)),
    projectedFinishDate,
    onTrack,
    aheadBehindDays,
    remainingAmount,
  };
};

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

// @desc  Active goal — live net achieved, metrics, progress series
// @route GET /goals/active
// @access Private (Admin)
export const getActiveGoal = asyncHandler(async (req, res) => {
  const goal = await Goal.findOne({ isActive: true }).sort({ createdAt: -1 });

  if (!goal) {
    res.status(404);
    throw new Error("No active goal found");
  }

  const liveAchieved = await computeLiveAchieved(goal);
  const isCompleted  = liveAchieved > 0 && liveAchieved >= goal.target;

  // Atomically deactivate when complete — avoids schema issues with completedOn
  if (isCompleted && goal.isActive) {
    await Goal.findByIdAndUpdate(goal._id, {
      isActive:    false,
      completedOn: new Date(),
    });
  }

  const goalWithLive = { ...goal.toObject(), achieved: liveAchieved, isCompleted };
  const metrics      = computeGoalMetrics(goal, liveAchieved);
  const progressData = await buildProgressSeries(goal);

  res.status(200).json({ goal: goalWithLive, metrics, progressData, isCompleted });
});

// @desc  All past goals, enriched with live data
// @route GET /goals/history
// @access Private (Admin)
export const getGoalHistory = asyncHandler(async (req, res) => {
  const pastGoals = await Goal.find({ isActive: false }).sort({ createdAt: -1 });

  const enriched = await Promise.all(
    pastGoals.map(async (goal) => {
      const liveAchieved = await computeLiveAchieved(goal);
      const isCompleted  = liveAchieved > 0 && liveAchieved >= goal.target;
      const metrics      = computeGoalMetrics(goal, liveAchieved);
      const progressData = await buildProgressSeries(goal);
      return { ...goal.toObject(), achieved: liveAchieved, isCompleted, metrics, progressData };
    })
  );

  res.status(200).json(enriched);
});

// @desc  List all goals
// @route GET /goals
// @access Private (Admin)
export const getGoals = asyncHandler(async (req, res) => {
  const goals = await Goal.find().sort({ createdAt: -1 });
  res.status(200).json(goals);
});

// @desc  Create / set a new goal
// @route POST /goals
// @access Private (Admin)
export const createGoal = asyncHandler(async (req, res) => {
  const { title, target, startDate, deadline } = req.body;

  if (!target || !startDate || !deadline) {
    res.status(400);
    throw new Error("target, startDate and deadline are required");
  }

  await Goal.updateMany({ isActive: true }, { isActive: false });

  const goal = await Goal.create({
    title,
    target,
    achieved: 0,
    startDate,
    deadline,
    isActive: true,
  });

  res.status(201).json(goal);
});

// @desc  Edit a goal (target, deadline, title — never achieved)
// @route PUT /goals/:id
// @access Private (Admin)
export const updateGoal = asyncHandler(async (req, res) => {
  const goal = await Goal.findById(req.params.id);

  if (!goal) {
    res.status(404);
    throw new Error("Goal not found");
  }

  const { achieved, ...safeUpdates } = req.body;
  Object.assign(goal, safeUpdates);
  const updatedGoal = await goal.save();

  res.status(200).json(updatedGoal);
});

// @desc  Delete a goal
// @route DELETE /goals/:id
// @access Private (Admin)
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

// @desc  Progress series for a specific goal
// @route GET /goals/:id/progress
// @access Private (Admin)
export const getGoalProgress = asyncHandler(async (req, res) => {
  const goal = await Goal.findById(req.params.id);

  if (!goal) {
    res.status(404);
    throw new Error("Goal not found");
  }

  res.status(200).json(await buildProgressSeries(goal));
});

// @desc  Manual progress upsert (kept for backwards compatibility)
// @route POST /goals/:id/progress
// @access Private (Admin)
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
