import { db, nextId, audit } from "../store.js";

export function canAccessEmployeeScoped(user, record) {
  if (["SUPER_ADMIN", "HR_ADMIN"].includes(user.role)) return true;
  if (String(user.employeeId) === String(record.employeeId)) return true;
  if (user.role === "REPORTING_MANAGER") {
    const employee = db.employees.find((item) => String(item.id) === String(record.employeeId));
    return String(employee?.reportingManagerId || "") === String(user.employeeId) || employee?.reportingManager === user.name;
  }
  return false;
}

export function paginate(items, req) {
  const page = Math.max(Number(req.query.page || 1), 1);
  const pageSize = Math.min(Math.max(Number(req.query.pageSize || 20), 1), 100);
  const start = (page - 1) * pageSize;
  return { data: items.slice(start, start + pageSize), meta: { page, pageSize, total: items.length } };
}

export function filterScoped(req, records) {
  const search = String(req.query.search || "").toLowerCase();
  const status = req.query.status;
  const employeeId = req.query.employeeId;
  const from = req.query.from ? new Date(String(req.query.from)) : null;
  const to = req.query.to ? new Date(String(req.query.to)) : null;
  return records
    .filter((record) => canAccessEmployeeScoped(req.user, record))
    .filter((record) => !search || JSON.stringify(record).toLowerCase().includes(search))
    .filter((record) => !status || record.status === status)
    .filter((record) => !employeeId || String(record.employeeId) === String(employeeId))
    .filter((record) => {
      const dateValue = record.fromDate || record.sourceWorkDate || record.createdAt || record.asOfDate;
      if (!dateValue) return true;
      const date = new Date(dateValue);
      return (!from || date >= from) && (!to || date <= to);
    });
}

export function leaveStats(records = db.leaveRequests) {
  return {
    total: records.length,
    pending: records.filter((item) => item.status === "PENDING_MANAGER" || item.status === "PENDING_HR").length,
    approved: records.filter((item) => item.status === "APPROVED").length,
    rejected: records.filter((item) => item.status === "REJECTED").length,
    totalDaysRequested: records.reduce((sum, item) => sum + Number(item.days || 0), 0),
  };
}

export function compOffStats(records = db.compOffRequests) {
  const today = new Date("2026-06-20");
  return {
    total: records.length,
    pending: records.filter((item) => item.status === "PENDING_MANAGER" || item.status === "PENDING_HR").length,
    approved: records.filter((item) => item.status === "APPROVED").length,
    expiringSoon: records.filter((item) => {
      const expiry = new Date(item.expiresOn);
      const diff = (expiry - today) / 86400000;
      return diff >= 0 && diff <= 30;
    }).length,
    availableDays: records
      .filter((item) => item.status === "APPROVED" && new Date(item.expiresOn) >= today)
      .reduce((sum, item) => sum + Number(item.earnedDays || 0) - Number(item.utilizedDays || 0), 0),
  };
}

export function findBalance(employeeId, leaveType) {
  return db.leaveBalances.find((item) => String(item.employeeId) === String(employeeId) && item.leaveType === leaveType);
}

export function createLeaveRequest(req) {
  const employeeId = req.user.role === "EMPLOYEE" ? req.user.employeeId : req.body.employeeId;
  const employee = db.employees.find((item) => String(item.id) === String(employeeId));
  if (!employee) return { error: { status: 404, code: "EMPLOYEE_NOT_FOUND", message: "Employee not found" } };

  const required = ["leaveType", "fromDate", "toDate", "days", "reason"];
  const missing = required.filter((field) => !req.body[field]);
  if (missing.length) return { error: { status: 422, code: "VALIDATION_ERROR", message: `${missing.join(", ")} required` } };
  if (new Date(req.body.toDate) < new Date(req.body.fromDate)) {
    return { error: { status: 422, code: "INVALID_DATE_RANGE", message: "toDate must be on or after fromDate" } };
  }
  if (Number(req.body.days) <= 0) {
    return { error: { status: 422, code: "INVALID_DAYS", message: "days must be greater than 0" } };
  }

  const balance = findBalance(employee.id, req.body.leaveType);
  if (balance && Number(balance.balance) < Number(req.body.days) && req.user.role !== "HR_ADMIN") {
    return { error: { status: 409, code: "INSUFFICIENT_LEAVE_BALANCE", message: "Insufficient leave balance" } };
  }

  const request = {
    id: nextId(db.leaveRequests),
    employeeId: employee.id,
    employeeName: employee.fullName,
    leaveType: req.body.leaveType,
    fromDate: req.body.fromDate,
    toDate: req.body.toDate,
    days: Number(req.body.days),
    reason: req.body.reason,
    status: req.body.status || "PENDING_MANAGER",
    approver: employee.reportingManager || "Reporting Manager",
    createdAt: new Date().toISOString(),
  };
  db.leaveRequests.push(request);
  audit(req.user, "CREATE", "leave_requests", request.id, null, request);
  return { data: request };
}

export function decideLeaveRequest(req, request) {
  const action = String(req.body.action || "").toUpperCase();
  if (!["APPROVE", "REJECT", "CANCEL"].includes(action)) {
    return { error: { status: 422, code: "INVALID_ACTION", message: "action must be APPROVE, REJECT, or CANCEL" } };
  }
  if (["REJECT", "CANCEL"].includes(action) && !req.body.comments) {
    return { error: { status: 422, code: "COMMENTS_REQUIRED", message: "comments are required" } };
  }
  const oldValue = { ...request };
  request.status = action === "APPROVE" ? "APPROVED" : action === "REJECT" ? "REJECTED" : "CANCELLED";
  request.comments = req.body.comments;
  request.decidedBy = req.user.sub;
  request.decidedAt = new Date().toISOString();

  if (action === "APPROVE") {
    const balance = findBalance(request.employeeId, request.leaveType);
    if (balance) balance.balance = Number(balance.balance) - Number(request.days);
    db.leaveLedger.push({
      id: nextId(db.leaveLedger),
      employeeId: request.employeeId,
      employeeName: request.employeeName,
      leaveType: request.leaveType,
      leaveRequestId: request.id,
      transactionType: "DEBIT",
      days: Number(request.days),
      notes: "Leave approved",
      createdAt: new Date().toISOString(),
    });
  }

  audit(req.user, action, "leave_requests", request.id, oldValue, request);
  return { data: request };
}

export function createCompOffRequest(req) {
  const employeeId = req.user.role === "EMPLOYEE" ? req.user.employeeId : req.body.employeeId;
  const employee = db.employees.find((item) => String(item.id) === String(employeeId));
  if (!employee) return { error: { status: 404, code: "EMPLOYEE_NOT_FOUND", message: "Employee not found" } };
  const required = ["sourceWorkDate", "earnedDays", "expiresOn", "reason"];
  const missing = required.filter((field) => !req.body[field]);
  if (missing.length) return { error: { status: 422, code: "VALIDATION_ERROR", message: `${missing.join(", ")} required` } };
  if (new Date(req.body.expiresOn) <= new Date(req.body.sourceWorkDate)) {
    return { error: { status: 422, code: "INVALID_EXPIRY", message: "expiresOn must be after sourceWorkDate" } };
  }

  const request = {
    id: nextId(db.compOffRequests),
    employeeId: employee.id,
    employeeName: employee.fullName,
    sourceWorkDate: req.body.sourceWorkDate,
    earnedDays: Number(req.body.earnedDays),
    utilizedDays: 0,
    expiresOn: req.body.expiresOn,
    status: "PENDING_MANAGER",
    reason: req.body.reason,
    createdAt: new Date().toISOString(),
  };
  db.compOffRequests.push(request);
  audit(req.user, "CREATE", "comp_off_requests", request.id, null, request);
  return { data: request };
}

export function decideCompOffRequest(req, request) {
  const action = String(req.body.action || "").toUpperCase();
  if (!["APPROVE", "REJECT"].includes(action)) {
    return { error: { status: 422, code: "INVALID_ACTION", message: "action must be APPROVE or REJECT" } };
  }
  if (action === "REJECT" && !req.body.comments) {
    return { error: { status: 422, code: "COMMENTS_REQUIRED", message: "comments are required" } };
  }
  const oldValue = { ...request };
  request.status = action === "APPROVE" ? "APPROVED" : "REJECTED";
  request.comments = req.body.comments;
  request.decidedBy = req.user.sub;
  request.decidedAt = new Date().toISOString();
  audit(req.user, action, "comp_off_requests", request.id, oldValue, request);
  return { data: request };
}
