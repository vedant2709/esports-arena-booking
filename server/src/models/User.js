import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true },
        email: {
            type: String,
            required: true,
            unique: true,      // no two accounts with the same email (enforced by a DB index)
            lowercase: true,   // store "Foo@X.com" as "foo@x.com" so logins are case-insensitive
            trim: true,
        },
        phone: { type: String, required: true, trim: true },
        password: {
            type: String,
            required: true,
            minlength: 6, 
            select: false,     // 🔑 don't return the hash in normal queries — security default
        },
        role: { type: String, enum: ["customer", "owner"], default: "customer" },
        lastLoginAt: { type: Date },
    },
    {timestamps: true}
);

// PRE-SAVE HOOK: Mongoose runs this automatically right before a user is saved.
// This is where plaintext → hash happens, so the raw password never hits the DB.
userSchema.pre("save", async function () {
    // Only (re)hash when the password field actually changed. Without this guard,
    // updating something else (e.g. phone) would re-hash the already-hashed value.
    if (!this.isModified("password")) return;

    const salt = await bcrypt.genSalt(12);                   // random salt at cost factor 12
    this.password = await bcrypt.hash(this.password, salt);  // overwrite plaintext with the hash
});

// INSTANCE METHOD: compares a plaintext candidate to the stored hash.
// bcrypt.compare re-hashes the candidate with the same salt and checks for a match.
// Returns a Promise<boolean>. We'll use this at login.
userSchema.methods.comparePassword = function (candidate) {
    return bcrypt.compare(candidate, this.password);
};

const User = mongoose.model("User", userSchema);
export default User;