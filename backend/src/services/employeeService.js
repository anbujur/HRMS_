import { db, nextId, audit } from "../store.js";

export function canAccessEmployee(user, employee) {
  if (!employee) return false;
  if (["SUPER_ADMIN", "HR_ADMIN", "COMPLIANCE_OFFICER"].includes(user.role)) return true;
  if (String(user.employeeId) === String(employee.id)) return true;
  if (user.role === "REPORTING_MANAGER" && String(employee.reportingManagerId || employee.managerId || "") === String(user.employeeId)) return true;
  return false;
}

export function employeeSummary(employee) {
  return {
    id: employee.id,
    employeeCode: employee.employeeCode || employee.employeeId,
    fullName: employee.fullName,
    officialEmail: employee.officialEmail || employee.personalEmail,
    designation: employee.designation,
    department: employee.department,
    team: employee.team,
    reportingManager: employee.reportingManager,
    location: employee.location,
    lifecycleStatus: employee.lifecycleStatus,
    joiningDate: employee.joiningDate,
  };
}

export function filterEmployees(req) {
  const search = String(req.query.search || "").toLowerCase();
  const status = req.query.status;
  const department = req.query.department;
  const location = req.query.location;
  const manager = req.query.manager;

  return db.employees
    .filter((employee) => !employee.deletedAt)
    .filter((employee) => canAccessEmployee(req.user, employee))
    .filter((employee) => !search || JSON.stringify(employee).toLowerCase().includes(search))
    .filter((employee) => !status || employee.lifecycleStatus === status || employee.employmentStatus === status)
    .filter((employee) => !department || employee.department === department || employee.team === department)
    .filter((employee) => !location || employee.location === location)
    .filter((employee) => !manager || employee.reportingManager === manager || String(employee.reportingManagerId) === String(manager));
}

export function paginate(items, req) {
  const page = Math.max(Number(req.query.page || 1), 1);
  const pageSize = Math.min(Math.max(Number(req.query.pageSize || 20), 1), 100);
  const start = (page - 1) * pageSize;
  return {
    data: items.slice(start, start + pageSize),
    meta: { page, pageSize, total: items.length },
  };
}

export function createEmployee(req) {
  const employee = {
    id: nextId(db.employees),
    employeeId: req.body.employeeCode || req.body.employeeId || `CCI-${1100 + db.employees.length}`,
    employeeCode: req.body.employeeCode || req.body.employeeId || `CCI-${1100 + db.employees.length}`,
    fullName: req.body.fullName,
    officialEmail: req.body.officialEmail,
    personalEmail: req.body.personalEmail,
    mobileNumber: req.body.mobileNumber,
    joiningDate: req.body.joiningDate,
    department: req.body.department,
    team: req.body.team || req.body.department,
    designation: req.body.designation,
    reportingManager: req.body.reportingManager,
    reportingManagerId: req.body.reportingManagerId,
    location: req.body.location,
    employmentStatus: "Active",
    lifecycleStatus: req.body.lifecycleStatus || "ACTIVE",
    createdBy: req.user.sub,
    updatedBy: req.user.sub,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  db.employees.push(employee);
  db.employeeJobHistory.push({
    id: nextId(db.employeeJobHistory),
    employeeId: employee.id,
    employeeName: employee.fullName,
    department: employee.department,
    designation: employee.designation,
    reportingManager: employee.reportingManager,
    effectiveFrom: employee.joiningDate,
    reason: "Employee created",
    createdAt: new Date().toISOString(),
  });
  audit(req.user, "CREATE", "employees", employee.id, null, employee);
  return employee;
}

export function updateEmployee(req, employee) {
  const oldValue = { ...employee };
  const updated = {
    ...employee,
    ...req.body,
    id: employee.id,
    employeeCode: req.body.employeeCode || employee.employeeCode || employee.employeeId,
    updatedBy: req.user.sub,
    updatedAt: new Date().toISOString(),
  };
  const index = db.employees.findIndex((item) => String(item.id) === String(employee.id));
  db.employees[index] = updated;

  const jobChanged = ["department", "team", "designation", "reportingManager", "reportingManagerId"].some((field) => oldValue[field] !== updated[field]);
  if (jobChanged) {
    db.employeeJobHistory.push({
      id: nextId(db.employeeJobHistory),
      employeeId: updated.id,
      employeeName: updated.fullName,
      department: updated.department,
      designation: updated.designation,
      reportingManager: updated.reportingManager,
      effectiveFrom: req.body.effectiveFrom || new Date().toISOString().slice(0, 10),
      reason: req.body.changeReason || "Employee job data updated",
      createdAt: new Date().toISOString(),
    });
  }

  audit(req.user, "UPDATE", "employees", updated.id, oldValue, updated);
  return updated;
}

export function buildOrgChart() {
  const employees = db.employees.filter((employee) => !employee.deletedAt);
  const byManager = employees.reduce((acc, employee) => {
    const manager = employee.reportingManager || "Leadership";
    acc[manager] = acc[manager] || [];
    acc[manager].push(employeeSummary(employee));
    return acc;
  }, {});

  return Object.entries(byManager).map(([manager, reports]) => ({
    manager,
    reports,
  }));
}

export function employeeStats(employees = db.employees) {
  const activeEmployees = employees.filter((employee) => !employee.deletedAt);
  const group = (field) =>
    Object.entries(
      activeEmployees.reduce((acc, employee) => {
        const key = employee[field] || "Unassigned";
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {})
    ).map(([name, count]) => ({ name, count }));

  return {
    headcount: activeEmployees.length,
    active: activeEmployees.filter((employee) => employee.lifecycleStatus === "ACTIVE" || employee.employmentStatus === "Active").length,
    exited: activeEmployees.filter((employee) => employee.lifecycleStatus === "EXITED" || employee.employmentStatus !== "Active").length,
    byDepartment: group("team"),
    byLocation: group("location"),
    byLifecycleStatus: group("lifecycleStatus"),
  };
}
