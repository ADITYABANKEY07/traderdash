import mongoose from "mongoose";

const settingsSchema = new mongoose.Schema(
  {
    admin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      required: true,
      unique: true,
    },
    theme: {
      type: String,
      enum: ["dark", "light", "system"],
      default: "dark",
    },
    density: {
      type: String,
      enum: ["compact", "comfortable", "spacious"],
      default: "comfortable",
    },
    accentColor: {
      type: String,
      default: "#22d3ee",
    },
  },
  { timestamps: true }
);

const Settings = mongoose.model("Settings", settingsSchema);

export default Settings;
