import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const traderSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
      select: false,
    },
    capital: {
      type: Number,
      default: 0,
    },
    winRate: {
      type: Number,
      default: 0, // percentage, 0-100 — set manually by admin
    },
    drawdown: {
      type: Number,
      default: 0, // percentage — set manually by admin
    },
    risk: {
      type: String,
      enum: ["Low", "Medium", "High"],
      default: "Low",
    },
    status: {
      type: String,
      enum: ["Active", "Paused", "Inactive"],
      default: "Active",
    },
    joined: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Hash password before saving, only if it was changed
traderSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

traderSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Raw P&L entries submitted by the trader themselves — just an amount + when it
// happened (+ optional note). Daily/weekly/monthly views and the trader's total
// profit are all derived from these by aggregation, not stored redundantly.
const plEntrySchema = new mongoose.Schema(
  {
    trader: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Trader",
      required: true,
    },
    pnl: {
      type: Number,
      required: true, // positive = profit, negative = loss
    },
    note: {
      type: String,
      trim: true,
    },
    date: {
      type: Date,
      required: true,
      default: Date.now, // when the trade/result actually happened
    },
  },
  { timestamps: true } // createdAt = when it was submitted
);

export const Trader = mongoose.model("Trader", traderSchema);
export const PnLEntry = mongoose.model("PnLEntry", plEntrySchema);

export default Trader;

