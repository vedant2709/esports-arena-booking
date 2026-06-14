// Seeds the venue's stations. Run with:  node src/seed/seedStations.js
import "dotenv/config";
import mongoose from "mongoose";
import { connectDB } from "../config/db.js";
import Station from "../models/Station.js";

// The real stations at E-Sports Arena, Sayajiganj.
const stations = [
  {
    name: "PS5 Station 1",
    type: "console",
    description: "PlayStation 5 — story titles & multiplayer.",
    capacity: 2,
    games: ["God of War", "Elden Ring", "FC26 (FIFA)", "Tekken 8"],
    pricePerHour: 150,
    isActive: true,
  },
  {
    name: "PS5 Station 2",
    type: "console",
    description: "PlayStation 5 — story titles & multiplayer.",
    capacity: 2,
    games: ["God of War", "Elden Ring", "FC26 (FIFA)", "Tekken 8"],
    pricePerHour: 150,
    isActive: true,
  },
  {
    name: "Racing Rig (G29)",
    type: "racing",
    description: "Logitech G29 wheel + pedals racing simulator.",
    capacity: 1,
    games: ["Gran Turismo 7", "F1 24", "Assetto Corsa"],
    pricePerHour: 300,
    isActive: true,
  },
  {
    name: "VR (Quest 3)",
    type: "vr",
    description: "Meta Quest 3 virtual reality station.",
    capacity: 1,
    games: ["Beat Saber", "Half-Life: Alyx", "Superhot VR"],
    pricePerHour: 250,
    isActive: true,
  },
];

async function run() {
  await connectDB();
  await Station.deleteMany({}); // fresh start each run (dev seed)
  const created = await Station.insertMany(stations);
  console.log(`✅ Seeded ${created.length} stations:`);
  created.forEach((s) => console.log(`   - ${s.name}  (${s.type}, ₹${s.pricePerHour}/hr)`));
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
