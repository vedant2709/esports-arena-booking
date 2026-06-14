import mongoose from "mongoose";

const refreshTokenSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    // sha256 of the raw refresh token — we never store the raw value.
    tokenHash: { type: String, required: true, unique: true },

    // Shared id across one rotation chain (i.e. one login "session").
    // Reuse-detection revokes every token with the same family.
    family: { type: String, required: true, index: true },

    // true once this token has been rotated (consumed). Seeing a USED token
    // come back is the signal of theft → revoke the whole family.
    used: { type: Boolean, default: false },

    // true if invalidated by logout or reuse-detection.
    revoked: { type: Boolean, default: false },

    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

// TTL index: MongoDB automatically deletes a document once expiresAt passes,
// so expired refresh tokens clean themselves up.
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const RefreshToken = mongoose.model("RefreshToken", refreshTokenSchema);
export default RefreshToken;
