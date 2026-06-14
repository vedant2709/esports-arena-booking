import mongoose from "mongoose";

// Connects the app to MongoDB using the URI from the environment.
// Called once at startup. If the connection fails, it throws so that
// index.js can stop the process instead of running without a database.
export async function connectDB() {
  const uri = process.env.MONGODB_URI;

  // Fail fast with a clear message if the config is missing,
  // rather than a confusing low-level error later.
  if (!uri) {
    throw new Error("MONGODB_URI is not set in the environment (.env)");
  }

  // mongoose.connect returns a promise that resolves once connected.
  // We await it so the server only starts accepting requests after the
  // database is ready (avoids "DB not connected" errors on the first request).
  await mongoose.connect(uri);

  // mongoose.connection.name is the database name (here: "esports-arena").
  console.log(`✅ MongoDB connected: ${mongoose.connection.name}`);

  // Optional: surface connection problems that happen AFTER startup
  // (e.g. the DB goes down while the server is running).
  mongoose.connection.on("error", (err) => {
    console.error("❌ MongoDB connection error:", err.message);
  });
  mongoose.connection.on("disconnected", () => {
    console.warn("⚠️  MongoDB disconnected");
  });
}
