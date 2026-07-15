import mongoose from "mongoose";

const goalSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      default: "Annual Profit Goal",
      trim: true,
    },
    target: {
      type: Number,
      required: true,
    },
    achieved: {
      type: Number,
      default: 0,
    },
    startDate: {
      type: Date,
      required: true,
    },
    deadline: {
      type: Date,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    completedOn: {
      type: Date,
      default: null, // stamped automatically when achieved >= target
    },
  },
  { timestamps: true }
);

// Monthly snapshots — kept for backwards compatibility / manual overrides.
// Progress is now primarily auto-computed in goalController.buildProgressSeries.
const goalProgressSchema = new mongoose.Schema(
  {
    goal: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Goal",
      required: true,
    },
    month: {
      type: String,
      required: true,
    },
    actual: {
      type: Number,
      default: null,
    },
    target: {
      type: Number,
      required: true,
    },
  },
  { timestamps: true }
);

export const Goal = mongoose.model("Goal", goalSchema);
export const GoalProgress = mongoose.model("GoalProgress", goalProgressSchema);

export default Goal;
