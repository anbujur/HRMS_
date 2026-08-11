import express from "express";
import { permissions, getModulePermissions, getRbacMatrix, getRolePermissions } from "../config/rbac.js";
import { roles } from "../config/modules.js";
import { requirePermission } from "../middleware/auth.js";

const router = express.Router();

router.get("/roles", requirePermission(permissions.RBAC_READ), (req, res) => {
  res.json({
    data: Object.entries(roles).map(([key, label]) => ({
      key,
      label,
      permissions: getRolePermissions(key),
      modules: getModulePermissions(key),
    })),
  });
});

router.get("/permissions", requirePermission(permissions.RBAC_READ), (req, res) => {
  res.json({
    data: Object.values(permissions).map((permission) => ({
      key: permission,
      description: permission.split(".").join(" "),
    })),
  });
});

router.get("/matrix", requirePermission(permissions.RBAC_READ), (req, res) => {
  res.json({ data: getRbacMatrix() });
});

router.get("/me", (req, res) => {
  res.json({
    data: {
      role: req.user.role,
      permissions: getRolePermissions(req.user.role),
      modules: getModulePermissions(req.user.role),
    },
  });
});

export default router;
