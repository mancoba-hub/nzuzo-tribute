const crypto = require("crypto");

const DEFAULT_PASSWORD = "change-this-password";

function secret() {
  return process.env.ADMIN_PASSWORD || DEFAULT_PASSWORD;
}

// Stateless HMAC-signed session token, valid for 12 hours.
function sign(payload) {
  const body = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const sig = crypto.createHmac("sha256", secret()).update(body).digest("base64url");
  return `${body}.${sig}`;
}

function verify(token) {
  if (typeof token !== "string" || !token.includes(".")) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = crypto.createHmac("sha256", secret()).update(body).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    return payload && payload.exp > Date.now() ? payload : null;
  } catch {
    return null;
  }
}

function requireAdmin(req, res, next) {
  const header = req.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  const payload = verify(token);
  if (!payload || payload.role !== "admin") {
    return res.status(401).json({ error: "UNAUTHORIZED" });
  }
  req.admin = payload;
  next();
}

module.exports = { sign, verify, requireAdmin, DEFAULT_PASSWORD };
