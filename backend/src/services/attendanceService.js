import { db, nextId, audit } from "../store.js";

export function canAccessAttendance(user, entry) {
  if (["SUPER_ADMIN", "HR_ADMIN"].includes(user.role)) return true;
  if (String(user.employeeId) === String(entry.employeeId)) return true;
  if (user.role === "REPORTING_MANAGER") {
    const employee = db.employees.find((item) => String(item.id) === String(entry.employeeId));
    return String(employee?.reportingManagerId || "") === String(user.employeeId) || employee?.reportingManager === user.name;
  }
  return false;
}

export function filterAttendance(req, records = db.attendance) {
  const search = String(req.query.search || "").toLowerCase();
  const status = req.query.status;
  const mode = req.query.mode;
  const employeeId = req.query.employeeId;
  const from = req.query.from ? new Date(String(req.query.from)) : null;
  const to = req.query.to ? new Date(String(req.query.to)) : null;

  return records
    .filter((entry) => canAccessAttendance(req.user, entry))
    .filter((entry) => !search || JSON.stringify(entry).toLowerCase().includes(search))
    .filter((entry) => !status || entry.status === status)
    .filter((entry) => !mode || entry.mode === mode)
    .filter((entry) => !employeeId || String(entry.employeeId) === String(employeeId))
    .filter((entry) => {
      const date = new Date(entry.attendanceDate);
      return (!from || date >= from) && (!to || date <= to);
    });
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

export function attendanceStats(records) {
  return {
    total: records.length,
    office: records.filter((entry) => entry.mode === "OFFICE").length,
    wfh: records.filter((entry) => entry.mode === "WFH").length,
    remote: records.filter((entry) => entry.mode === "REMOTE").length,
    missingCheckout: records.filter((entry) => entry.checkIn && !entry.checkOut).length,
    pendingRegularizations: db.attendanceRegularizations.filter((entry) => ["PENDING_MANAGER", "PENDING_HR"].includes(entry.status)).length,
    approved: records.filter((entry) => entry.status === "APPROVED").length,
    submitted: records.filter((entry) => entry.status === "SUBMITTED").length,
  };
}

export function getTodayEntry(employeeId, date = new Date().toISOString().slice(0, 10)) {
  return db.attendance.find((entry) => String(entry.employeeId) === String(employeeId) && entry.attendanceDate === date);
}

export function checkIn(req) {
  const employee = db.employees.find((item) => String(item.id) === String(req.user.employeeId || req.body.employeeId));
  if (!employee) {
    return { error: { status: 404, code: "EMPLOYEE_NOT_FOUND", message: "Employee not found" } };
  }

  const timestamp = req.body.timestamp || new Date().toISOString();
  const attendanceDate = req.body.attendanceDate || timestamp.slice(0, 10);
  const existing = getTodayEntry(employee.id, attendanceDate);
  if (existing?.checkIn) {
    return { error: { status: 409, code: "ALREADY_CHECKED_IN", message: "Attendance check-in already exists for this date" } };
  }

  const entry = existing || {
    id: nextId(db.attendance),
    employeeId: employee.id,
    employeeName: employee.fullName,
    attendanceDate,
    mode: req.body.mode || "OFFICE",
    checkOut: null,
    totalMinutes: null,
    status: "SUBMITTED",
  };

  entry.checkIn = timestamp;
  entry.mode = req.body.mode || entry.mode || "OFFICE";
  entry.status = "SUBMITTED";

  if (!existing) db.attendance.push(entry);
  audit(req.user, "ATTENDANCE_CHECK_IN", "attendance", entry.id, null, entry);
  return { data: entry };
}

export function checkOut(req) {
  const employeeId = req.user.employeeId || req.body.employeeId;
  const timestamp = req.body.timestamp || new Date().toISOString();
  const attendanceDate = req.body.attendanceDate || timestamp.slice(0, 10);
  const entry = getTodayEntry(employeeId, attendanceDate);

  if (!entry?.checkIn) {
    return { error: { status: 404, code: "CHECK_IN_NOT_FOUND", message: "Check-in not found for this date" } };
  }
  if (entry.checkOut) {
    return { error: { status: 409, code: "ALREADY_CHECKED_OUT", message: "Attendance check-out already exists for this date" } };
  }
  if (new Date(timestamp) <= new Date(entry.checkIn)) {
    return { error: { status: 422, code: "INVALID_CHECKOUT_TIME", message: "Check-out must be after check-in" } };
  }

  const oldValue = { ...entry };
  entry.checkOut = timestamp;
  entry.totalMinutes = Math.round((new Date(entry.checkOut) - new Date(entry.checkIn)) / 60000);
  entry.status = "APPROVED";
  audit(req.user, "ATTENDANCE_CHECK_OUT", "attendance", entry.id, oldValue, entry);
  return { data: entry };
}

export function createRegularization(req) {
  const employee = db.employees.find((item) => String(item.id) === String(req.user.employeeId || req.body.employeeId));
  if (!employee) {
    return { error: { status: 404, code: "EMPLOYEE_NOT_FOUND", message: "Employee not found" } };
  }
  if (!req.body.attendanceDate || !req.body.reason) {
    return { error: { status: 422, code: "VALIDATION_ERROR", message: "attendanceDate and reason are required" } };
  }
  const regularization = {
    id: nextId(db.attendanceRegularizations),
    employeeId: employee.id,
    employeeName: employee.fullName,
    attendanceEntryId: req.body.attendanceEntryId,
    attendanceDate: req.body.attendanceDate,
    reason: req.body.reason,
    requestedCheckIn: req.body.requestedCheckIn,
    requestedCheckOut: req.body.requestedCheckOut,
    status: "PENDING_MANAGER",
    createdAt: new Date().toISOString(),
  };
  db.attendanceRegularizations.push(regularization);
  audit(req.user, "CREATE", "attendance_regularizations", regularization.id, null, regularization);
  return { data: regularization };
}

export function decideRegularization(req, regularization) {
  const action = String(req.body.action || "").toUpperCase();
  if (!["APPROVE", "REJECT"].includes(action)) {
    return { error: { status: 422, code: "INVALID_ACTION", message: "action must be APPROVE or REJECT" } };
  }
  if (action === "REJECT" && !req.body.comments) {
    return { error: { status: 422, code: "COMMENTS_REQUIRED", message: "comments are required for rejection" } };
  }

  const oldValue = { ...regularization };
  regularization.status = action === "APPROVE" ? "APPROVED" : "REJECTED";
  regularization.comments = req.body.comments;
  regularization.decidedBy = req.user.sub;
  regularization.decidedAt = new Date().toISOString();

  if (action === "APPROVE") {
    let entry = db.attendance.find((item) => String(item.id) === String(regularization.attendanceEntryId));
    if (!entry) {
      entry = {
        id: nextId(db.attendance),
        employeeId: regularization.employeeId,
        employeeName: regularization.employeeName,
        attendanceDate: regularization.attendanceDate,
        mode: req.body.mode || "OFFICE",
        status: "APPROVED",
      };
      db.attendance.push(entry);
    }
    entry.checkIn = regularization.requestedCheckIn || entry.checkIn;
    entry.checkOut = regularization.requestedCheckOut || entry.checkOut;
    entry.totalMinutes = entry.checkIn && entry.checkOut ? Math.round((new Date(entry.checkOut) - new Date(entry.checkIn)) / 60000) : entry.totalMinutes;
    entry.status = "APPROVED";
  }

  audit(req.user, action, "attendance_regularizations", regularization.id, oldValue, regularization);
  return { data: regularization };
}
