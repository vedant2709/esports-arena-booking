import jwt from "jsonwebtoken";

// Route guard: lets the request through ONLY if it carries a valid access token.
// On success, it attaches the caller's identity to req.user for the route handler.
export function requireAuth(req,res,next){
    // 1. cookie-parser already parsed the Cookie header onto req.cookies.
    //    The browser sends our httpOnly "accessToken" cookie automatically.
    const token = req.cookies?.accessToken;
    if (!token) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
        // 2. Verify the signature + expiry using our secret. Throws if invalid.
        const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

        // 3. Attach a minimal, trusted identity for downstream handlers.
        req.user = { id: payload.sub, role: payload.role };

        // 4. Hand control to the next thing in the chain (the route handler).
        next();
    } catch (err) {
        // Covers tampered signatures AND expired tokens (jwt throws for both).
        return res.status(401).json({ message: "Invalid or expired session" });
    }
}

// Gate a route to specific roles. MUST run AFTER requireAuth (which sets req.user).
// Usage: router.get("/admin/x", requireAuth, requireRole("owner"), handler)
export function requireRole(...roles) {
    return function(req,res,next){
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({ message: "Forbidden — insufficient permissions" });
        }
        next();
    }
}