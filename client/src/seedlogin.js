import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import Admin from "./models/Admin.js";

await mongoose.connect(process.env.MONGO_URI);

const password = await bcrypt.hash("Admin@123", 10);

await Admin.create({
  name: "Admin",
  email: "admin@gmail.com",
  password,
});

console.log("Admin Created");

process.exit();