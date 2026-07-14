import Admin from "../models/Admin.js";
import Settings from "../models/Settings.js";
import generateToken from "../utils/generateToken.js";
import asyncHandler from "../utils/asyncHandler.js";

// @desc    Register a new admin (used for initial setup / seeding new admins)
// @route   POST /admin/register
// @access  Public (you may want to lock this down to Super Admin in production)
export const registerAdmin = asyncHandler(async (req, res) => {
  const { name, email, password, phone, role } = req.body;

  if (!name || !email || !password) {
    res.status(400);
    throw new Error("Name, email and password are required");
  }

  const existingAdmin = await Admin.findOne({ email });
  if (existingAdmin) {
    res.status(400);
    throw new Error("An admin with this email already exists");
  }

  const admin = await Admin.create({ name, email, password, phone, role });

  // Create default appearance settings for the new admin
  await Settings.create({ admin: admin._id });

  res.status(201).json({
    _id: admin._id,
    name: admin.name,
    email: admin.email,
    role: admin.role,
    token: generateToken(admin._id),
  });
});

// @desc    Login admin — matches the existing AdminLogin.jsx payload { email, password }
// @route   POST /admin/login
// @access  Public
export const loginAdmin = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400);
    throw new Error("Email and password are required");
  }

  const admin = await Admin.findOne({ email }).select("+password");

  if (!admin || !(await admin.comparePassword(password))) {
    res.status(401);
    throw new Error("Invalid email or password");
  }

  res.status(200).json({
    _id: admin._id,
    name: admin.name,
    email: admin.email,
    role: admin.role,
    token: generateToken(admin._id, "admin"),
  });
});

// @desc    Get the logged-in admin's profile
// @route   GET /admin/profile
// @access  Private
export const getAdminProfile = asyncHandler(async (req, res) => {
  const admin = await Admin.findById(req.admin._id);
  res.status(200).json(admin);
});

// @desc    Update the logged-in admin's profile (name, email, phone, timezone)
// @route   PUT /admin/profile
// @access  Private
export const updateAdminProfile = asyncHandler(async (req, res) => {
  const admin = await Admin.findById(req.admin._id);

  if (!admin) {
    res.status(404);
    throw new Error("Admin not found");
  }

  admin.name = req.body.name ?? admin.name;
  admin.email = req.body.email ?? admin.email;
  admin.phone = req.body.phone ?? admin.phone;
  admin.timezone = req.body.timezone ?? admin.timezone;

  const updatedAdmin = await admin.save();

  res.status(200).json({
    _id: updatedAdmin._id,
    name: updatedAdmin.name,
    email: updatedAdmin.email,
    phone: updatedAdmin.phone,
    timezone: updatedAdmin.timezone,
    role: updatedAdmin.role,
  });
});

// @desc    Update the logged-in admin's password
// @route   PUT /admin/password
// @access  Private
export const updateAdminPassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    res.status(400);
    throw new Error("Current password and new password are required");
  }

  const admin = await Admin.findById(req.admin._id).select("+password");

  if (!admin || !(await admin.comparePassword(currentPassword))) {
    res.status(401);
    throw new Error("Current password is incorrect");
  }

  admin.password = newPassword; // will be re-hashed by the pre-save hook
  await admin.save();

  res.status(200).json({ message: "Password updated successfully" });
});
