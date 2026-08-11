import express from "express";
import bcrypt from "bcryptjs";
import { createAccessToken, createRefreshToken, hashToken, verifyRefreshToken, authenticate, authError } from "../middleware/auth.js";
import { getModulePermissions, getRolePermissions } from "../config/rbac.js";
import { users } from "../data/users.js";

const router = express.Router();
const refreshTokenStore = new Map();

function publicUser(user) {
  const { passwordHash, ...profile } = user;
  return {
    ...profile,
    permissions: getRolePermissions(user.role),
    modules: getModulePermissions(user.role),
  };
}

function issueSession(user) {
  const accessToken = createAccessToken(user);
  const refreshToken = createRefreshToken(user);
  refreshTokenStore.set(hashToken(refreshToken), { userId: user.id, createdAt: new Date().toISOString() });
  return { accessToken, refreshToken, user: publicUser(user) };
}

router.post("/login", (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return authError(res, 422, "VALIDATION_ERROR", "Email and password are required", [
      !email ? { field: "email", message: "email is required" } : null,
      !password ? { field: "password", message: "password is required" } : null,
    ].filter(Boolean));
  }
  const user = users.find((item) => item.email.toLowerCase() === String(email || "").toLowerCase());
  if (!user || !bcrypt.compareSync(password || "", user.passwordHash)) {
    return authError(res, 401, "INVALID_CREDENTIALS", "Invalid email or password");
  }
  return res.json(issueSession(user));
});

router.post("/refresh", (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return authError(res, 400, "REFRESH_TOKEN_REQUIRED", "Missing refresh token");

  try {
    const payload = verifyRefreshToken(refreshToken);
    const tokenHash = hashToken(refreshToken);
    if (!refreshTokenStore.has(tokenHash)) return authError(res, 401, "TOKEN_REVOKED", "Refresh token revoked");
    refreshTokenStore.delete(tokenHash);
    const user = users.find((item) => item.id === payload.sub);
    if (!user) return authError(res, 401, "USER_NOT_FOUND", "User not found");
    return res.json(issueSession(user));
  } catch {
    return authError(res, 401, "TOKEN_INVALID", "Invalid refresh token");
  }
});

router.post("/logout", authenticate, (req, res) => {
  const { refreshToken } = req.body;
  if (refreshToken) refreshTokenStore.delete(hashToken(refreshToken));
  return res.status(204).send();
});

router.get("/me", authenticate, (req, res) => {
  res.json({
    user: {
      ...req.user,
      permissions: getRolePermissions(req.user.role),
      modules: getModulePermissions(req.user.role),
    },
  });
});

router.get("/permissions", authenticate, (req, res) => {
  res.json({
    data: {
      role: req.user.role,
      permissions: getRolePermissions(req.user.role),
      modules: getModulePermissions(req.user.role),
    },
  });
});

export default router;
