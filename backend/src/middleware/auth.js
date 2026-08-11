import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { hasPermission } from "../config/rbac.js";

const accessSecret = process.env.JWT_SECRET || "dev-secret-change-me";
const refreshSecret = process.env.JWT_REFRESH_SECRET || "dev-refresh-secret-change-me";

export function createAccessToken(user) {
  return jwt.sign(
    { sub: user.id, role: user.role, name: user.name, email: user.email, employeeId: user.employeeId },
    accessSecret,
    { expiresIn: process.env.JWT_ACCESS_TTL || "15m" }
  );
}

export function authError(res, status, code, message, details = []) {
  return res.status(status).json({
    error: {
      code,
      message,
      details,
    },
  });
}

export function createRefreshToken(user) {
  return jwt.sign({ sub: user.id, jti: crypto.randomUUID() }, refreshSecret, { expiresIn: process.env.JWT_REFRESH_TTL || "7d" });
}

export function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function authenticate(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return authError(res, 401, "TOKEN_MISSING", "Missing access token");

  try {
    req.user = jwt.verify(token, accessSecret);
    return next();
  } catch {
    return authError(res, 401, "TOKEN_INVALID", "Invalid or expired access token");
  }
}

export function verifyRefreshToken(token) {
  return jwt.verify(token, refreshSecret);
}

export function authorize(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) return authError(res, 403, "FORBIDDEN_ROLE", "Insufficient permissions");
    return next();
  };
}

export function requirePermission(permission) {
  return (req, res, next) => {
    if (!hasPermission(req.user.role, permission)) {
      return authError(res, 403, "FORBIDDEN_PERMISSION", `Missing permission: ${permission}`);
    }
    return next();
  };
}

export function authorizeModule(module, accessType = "read") {
  return (req, res, next) => {
    const allowedRoles = accessType === "write" ? module.writeRoles : module.readRoles;
    if (!allowedRoles.includes(req.user.role)) {
      return authError(res, 403, "FORBIDDEN_MODULE", `Insufficient permissions for ${module.label}`);
    }
    return next();
  };
}
