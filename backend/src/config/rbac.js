import { moduleCatalog, roles } from "./modules.js";

export const permissions = {
  AUTH_SESSION_READ: "auth.session.read",
  RBAC_READ: "rbac.read",
  RBAC_MANAGE: "rbac.manage",
  AUDIT_READ: "audit.read",
  REPORT_EXPORT: "report.export",
  APPROVAL_OVERRIDE: "approval.override",
  EMPLOYEE_SELF_READ: "employee.self.read",
  EMPLOYEE_SELF_WRITE: "employee.self.write",
  TEAM_READ: "team.read",
  TEAM_APPROVE: "team.approve",
};

const basePermissions = [permissions.AUTH_SESSION_READ];

export const rolePermissions = {
  SUPER_ADMIN: [
    ...basePermissions,
    permissions.RBAC_READ,
    permissions.RBAC_MANAGE,
    permissions.AUDIT_READ,
    permissions.REPORT_EXPORT,
    permissions.APPROVAL_OVERRIDE,
    permissions.EMPLOYEE_SELF_READ,
    permissions.TEAM_READ,
    permissions.TEAM_APPROVE,
  ],
  HR_ADMIN: [
    ...basePermissions,
    permissions.RBAC_READ,
    permissions.AUDIT_READ,
    permissions.REPORT_EXPORT,
    permissions.APPROVAL_OVERRIDE,
    permissions.EMPLOYEE_SELF_READ,
    permissions.EMPLOYEE_SELF_WRITE,
    permissions.TEAM_READ,
    permissions.TEAM_APPROVE,
  ],
  REPORTING_MANAGER: [
    ...basePermissions,
    permissions.REPORT_EXPORT,
    permissions.EMPLOYEE_SELF_READ,
    permissions.EMPLOYEE_SELF_WRITE,
    permissions.TEAM_READ,
    permissions.TEAM_APPROVE,
  ],
  EMPLOYEE: [
    ...basePermissions,
    permissions.EMPLOYEE_SELF_READ,
    permissions.EMPLOYEE_SELF_WRITE,
  ],
  TRAINER: [
    ...basePermissions,
    permissions.REPORT_EXPORT,
    permissions.EMPLOYEE_SELF_READ,
    permissions.EMPLOYEE_SELF_WRITE,
  ],
  COMPLIANCE_OFFICER: [
    ...basePermissions,
    permissions.RBAC_READ,
    permissions.AUDIT_READ,
    permissions.REPORT_EXPORT,
    permissions.EMPLOYEE_SELF_READ,
    permissions.EMPLOYEE_SELF_WRITE,
  ],
};

export function getRolePermissions(role) {
  return rolePermissions[role] || [];
}

export function hasPermission(role, permission) {
  return getRolePermissions(role).includes(permission);
}

export function getModulePermissions(role) {
  return moduleCatalog
    .filter((module) => module.readRoles.includes(role) || module.writeRoles.includes(role))
    .map((module) => ({
      key: module.key,
      label: module.label,
      domain: module.domain,
      path: module.path,
      canRead: module.readRoles.includes(role),
      canWrite: module.writeRoles.includes(role),
    }));
}

export function getRbacMatrix() {
  return Object.keys(roles).map((role) => ({
    role,
    label: roles[role],
    permissions: getRolePermissions(role),
    modules: getModulePermissions(role),
  }));
}
