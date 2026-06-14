import crypto from "crypto";
import User from "../models/User.js";
import RefreshToken from "../models/RefreshToken.js";
import {
    signAccessToken,
    setAuthCookie,
    clearAuthCookie,
    generateRefreshToken,
    hashToken,
    refreshExpiryDate,
    setRefreshCookie,
    clearRefreshCookie,
} from "../utils/auth.js";

// Helper: issue a NEW refresh token for a user within a given family,
// store its hash in the DB, and set it as a cookie. Reused by login and refresh.
async function issueRefreshToken(res, userId, family) {
    const raw = generateRefreshToken();
    await RefreshToken.create({
        user: userId,
        tokenHash: hashToken(raw),       // store the hash, never the raw token
        family,                          // same family across a rotation chain
        expiresAt: refreshExpiryDate(),
    });
    setRefreshCookie(res, raw);          // send the RAW token to the browser
}

// POST /api/auth/register  — create a new customer account
export async function register(req, res){
    try {
        const { name, email, phone, password } = req.body;

        // 1. Basic presence check. (Rigorous zod validation lands in Step 7.)
        if (!name || !email || !phone || !password) {
            return res.status(400).json({ message: "All fields are required" });
        }

        // 2. Create the user. The pre-save hook hashes the password automatically,
        //    and the schema enforces minlength + unique email.
        const user = await User.create({ name, email, phone, password });

        // 3. Respond WITHOUT the password hash. create() returns an in-memory doc
        //    that still holds the hash, so we hand-pick only safe fields.
        return res.status(201).json({
            user: { id: user._id, name: user.name, email: user.email, role: user.role },
        });
    } catch (err) {
        // Duplicate email → Mongo unique-index violation (code 11000)
        if(err.code === 11000){
            return res.status(409).json({message: "Email already registered."});
        }
        // Schema validation failure (e.g. password shorter than 8 chars)
        if (err.name === "ValidationError") {
            return res.status(400).json({ message: err.message });
        }
        console.error("Register error:", err);
        return res.status(500).json({ message: "Something went wrong" });
    }
}

// POST /api/auth/login  — verify credentials and start a session
export async function login(req,res){
    try {
         const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ message: "Email and password are required" });
        }

        // We must explicitly ask for the password — remember select:false hides it.
        const user = await User.findOne({ email: email.toLowerCase() }).select("+password");

        // 🔑 SECURITY: use the SAME generic message whether the email doesn't exist
        // or the password is wrong. If we said "no such email" vs "wrong password",
        // an attacker could discover which emails are registered (user enumeration).
        if (!user || !(await user.comparePassword(password))) {
            return res.status(401).json({ message: "Invalid email or password" });
        }

        // Record the login. Note: this save() runs the pre-save hook, but because we
        // didn't touch the password, isModified("password") is false → it does NOT
        // re-hash. That guard we added earlier is exactly what makes this safe.
        user.lastLoginAt = new Date();
        await user.save();

        // Issue the short-lived ACCESS token cookie.
        const token = signAccessToken(user);
        setAuthCookie(res, token);

        // Start a brand-new rotation family and issue the first REFRESH token.
        // crypto.randomUUID() gives this login session a unique family id.
        await issueRefreshToken(res, user._id, crypto.randomUUID());

        return res.status(200).json({
            user: { id: user._id, name: user.name, email: user.email, role: user.role },
        });
    } catch (err) {
        console.error("Login error:", err);
        return res.status(500).json({ message: "Something went wrong" });
    }
}

// POST /api/auth/refresh  — rotate access+refresh tokens, with reuse-detection.
export async function refresh(req, res) {
    try {
        // 1. Grab the refresh token the browser sent.
        const raw = req.cookies?.refreshToken;
        if (!raw) {
            return res.status(401).json({ message: "No refresh token" });
        }

        // 2. Look it up by its hash (we never stored the raw value).
        const stored = await RefreshToken.findOne({ tokenHash: hashToken(raw) });
        if (!stored) {
            return res.status(401).json({ message: "Invalid refresh token" });
        }

        // 3. REUSE DETECTION: a used/revoked token coming back = compromised family.
        if (stored.used || stored.revoked) {
            await RefreshToken.updateMany(
                { family: stored.family },
                { $set: { revoked: true } }
            );
            clearAuthCookie(res);
            clearRefreshCookie(res);
            return res
                .status(401)
                .json({ message: "Refresh token reuse detected. Please log in again." });
        }

        // 4. Expired? (The TTL index also deletes these, but check explicitly.)
        if (stored.expiresAt.getTime() < Date.now()) {
            return res.status(401).json({ message: "Refresh token expired" });
        }

        // 5. ROTATE: consume this token...
        stored.used = true;
        await stored.save();

        // ...issue a new access token (look up the user to get their role)...
        const user = await User.findById(stored.user);
        if (!user) {
            return res.status(401).json({ message: "User not found" });
        }
        setAuthCookie(res, signAccessToken(user));

        // ...and a new refresh token in the SAME family (continues the chain).
        await issueRefreshToken(res, user._id, stored.family);

        return res.json({ message: "Token refreshed" });
    } catch (err) {
        console.error("Refresh error:", err);
        return res.status(500).json({ message: "Something went wrong" });
    }
}

// GET /api/auth/me  — return the current logged-in user's profile.
// Protected by requireAuth, so req.user is guaranteed to be set here.
export async function me(req, res) {
    // password is select:false, so it's safely excluded from this query.
    const user = await User.findById(req.user.id);
    if (!user) {
        return res.status(404).json({ message: "User not found" });
    }
    return res.json({
        user: {
            id: user._id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            role: user.role,
        },
    });
}

// POST /api/auth/logout  — end the session and revoke its refresh family.
export async function logout(req, res) {
    const raw = req.cookies?.refreshToken;
    if (raw) {
        const stored = await RefreshToken.findOne({ tokenHash: hashToken(raw) });
        if (stored) {
            // Revoke the whole family so this session can never be refreshed again.
            await RefreshToken.updateMany(
                { family: stored.family },
                { $set: { revoked: true } }
            );
        }
    }
    clearAuthCookie(res);
    clearRefreshCookie(res);
    return res.json({ message: "Logged out" });
}