// Seeds (or promotes) the single owner account. Run: node src/seed/seedAdmin.js
// There is NO public admin signup — the owner exists only via this script.
import "dotenv/config";
import mongoose from "mongoose";
import { connectDB } from "../config/db.js";
import User from "../models/User.js";

async function run() {
  await connectDB();

  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) {
    throw new Error("Set ADMIN_EMAIL and ADMIN_PASSWORD in .env first");
  }

  // If a user with this email already exists, promote them to owner and reset
  // the password; otherwise create a fresh owner account. (Idempotent — safe
  // to run repeatedly.)
  let owner = await User.findOne({ email: email.toLowerCase() });
  if (owner) {
    owner.role = "owner";
    owner.password = password; // re-hashed by the pre-save hook
    await owner.save();
    console.log(`✅ Promoted existing user to owner: ${email}`);
  } else {
    owner = await User.create({
      name: "Arena Owner",
      email,
      phone: "0000000000",
      password, // hashed by the pre-save hook
      role: "owner",
    });
    console.log(`✅ Created owner account: ${email}`);
  }

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error("Seed admin failed:", err);
  process.exit(1);
});
