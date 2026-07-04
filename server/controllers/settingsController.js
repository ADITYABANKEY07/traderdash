import Settings from "../models/Settings.js";
import asyncHandler from "../utils/asyncHandler.js";

// @desc    Get the logged-in admin's appearance settings (creates defaults if missing)
// @route   GET /settings
// @access  Private
export const getSettings = asyncHandler(async (req, res) => {
  let settings = await Settings.findOne({ admin: req.admin._id });

  if (!settings) {
    settings = await Settings.create({ admin: req.admin._id });
  }

  res.status(200).json(settings);
});

// @desc    Update theme, density, and/or accent color
// @route   PUT /settings
// @access  Private
export const updateSettings = asyncHandler(async (req, res) => {
  const { theme, density, accentColor } = req.body;

  const settings = await Settings.findOneAndUpdate(
    { admin: req.admin._id },
    {
      ...(theme && { theme }),
      ...(density && { density }),
      ...(accentColor && { accentColor }),
    },
    { new: true, upsert: true }
  );

  res.status(200).json(settings);
});
