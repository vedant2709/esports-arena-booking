import mongoose from "mongoose";

const stationSchema = new mongoose.Schema(
  {
    // Display name, e.g. "PS5 Station 1", "Racing Rig", "VR (Quest 3)".
    name: { type: String, required: true, trim: true },

    // The kind of station. enum = only these exact strings are allowed;
    // anything else fails validation. Useful for filtering + UI icons.
    type: { type: String, enum: ["console", "racing", "vr"], required: true },

    description: { type: String, default: "" },

    // How many players can use this station at once (PS5 = 2, racing/VR = 1).
    // We'll later reject a squadSize larger than this.
    capacity: { type: Number, required: true, min: 1 },

    // The games available on this station.
    games: { type: [String], default: [] },

    // Base price per player, per hour (₹). Special packages (unlimited/squad)
    // are computed from this in the pricing service later.
    pricePerHour: { type: Number, required: true, min: 0 },

    // Soft on/off switch: lets the owner hide a station (maintenance) WITHOUT
    // deleting it — so its past bookings/history stay intact.
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true } // auto-adds createdAt / updatedAt
);

const Station = mongoose.model("Station", stationSchema);
export default Station;
