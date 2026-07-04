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
      required: true, // e.g. 420000
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
  },
  { timestamps: true }
);

// Monthly snapshots used to plot the "Goal Achievement Graph"
const goalProgressSchema = new mongoose.Schema(
  {
    goal: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Goal",
      required: true,
    },
    month: {
      type: String, // e.g. "Jan", "Feb"
      required: true,
    },
    actual: {
      type: Number,
      default: null, // null for months that haven't happened yet
    },
    target: {
      type: Number,
      required: true, // required pace for that month
    },
  },
  { timestamps: true }
);

export const Goal = mongoose.model("Goal", goalSchema);
export const GoalProgress = mongoose.model("GoalProgress", goalProgressSchema);

export default Goal;
