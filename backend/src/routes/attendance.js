import express from "express";
import { db, nextId, audit } from "../store.js";
import { authorize } from "../middleware/auth.js";
import {
  attendanceStats,
  canAccessAttendance,
  checkIn,
  checkOut,
  createRegularization,
  decideRegularization,
  filterAttendance,
  getTodayEntry,
  paginate,
} from "../services/attendanceService.js";

const router = express.Router();

function sendServiceResult(res, result, status = 200) {
  if (result.error) {
    return res.status(result.error.status).json({ error: { code: result.error.code, message: result.error.message } });
  }
  return res.status(status).json({ data: result.data });
}

router.get("/entries", (req, res) => {
  res.json(paginate(filterAttendance(req), req));
});

router.get("/today", (req, res) => {
  const employeeId = req.query.employeeId || req.user.employeeId;
  const date = String(req.query.date || new Date().toISOString().slice(0, 10));
  const entry = getTodayEntry(employeeId, date);
  if (entry && !canAccessAttendance(req.user, entry)) return res.status(403).json({ message: "Insufficient permissions for attendance" });
  res.json({ data: entry || null });
});

router.get("/stats", authorize("SUPER_ADMIN", "HR_ADMIN", "REPORTING_MANAGER"), (req, res) => {
  const records = filterAttendance(req);
  res.json({ data: attendanceStats(records) });
});

router.post("/check-in", (req, res) => {
  sendServiceResult(res, checkIn(req), 201);
});

router.post("/check-out", (req, res) => {
  sendServiceResult(res, checkOut(req));
});

router.get("/regularizations", (req, res) => {
  const records = db.attendanceRegularizations.filter((regularization) => canAccessAttendance(req.user, regularization));
  res.json(paginate(records, req));
});

router.post("/regularizations", (req, res) => {
  sendServiceResult(res, createRegularization(req), 201);
});

router.put("/regularizations/:id", authorize("SUPER_ADMIN", "HR_ADMIN", "REPORTING_MANAGER"), (req, res) => {
  const regularization = db.attendanceRegularizations.find((item) => String(item.id) === String(req.params.id));
  if (!regularization) return res.status(404).json({ message: "Regularization not found" });
  if (!canAccessAttendance(req.user, regularization)) return res.status(403).json({ message: "Insufficient permissions for regularization" });
  sendServiceResult(res, decideRegularization(req, regularization));
});

router.get("/shifts", (req, res) => {
  res.json(paginate(db.shifts, req));
});

router.post("/shifts", authorize("SUPER_ADMIN", "HR_ADMIN"), (req, res) => {
  const required = ["name", "startsAt", "endsAt"];
  const missing = required.filter((field) => !req.body[field]);
  if (missing.length) {
    return res.status(422).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Shift validation failed",
        details: missing.map((field) => ({ field, message: `${field} is required` })),
      },
    });
  }
  const shift = {
    id: nextId(db.shifts),
    name: req.body.name,
    startsAt: req.body.startsAt,
    endsAt: req.body.endsAt,
    graceMinutes: Number(req.body.graceMinutes || 0),
    createdAt: new Date().toISOString(),
  };
  db.shifts.push(shift);
  audit(req.user, "CREATE", "shifts", shift.id, null, shift);
  res.status(201).json({ data: shift });
});

router.get("/shift-assignments", authorize("SUPER_ADMIN", "HR_ADMIN", "REPORTING_MANAGER"), (req, res) => {
  res.json(paginate(db.shiftAssignments, req));
});

router.post("/shift-assignments", authorize("SUPER_ADMIN", "HR_ADMIN"), (req, res) => {
  const required = ["employeeId", "shiftId", "effectiveFrom"];
  const missing = required.filter((field) => !req.body[field]);
  if (missing.length) {
    return res.status(422).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Shift assignment validation failed",
        details: missing.map((field) => ({ field, message: `${field} is required` })),
      },
    });
  }
  const employee = db.employees.find((item) => String(item.id) === String(req.body.employeeId));
  const shift = db.shifts.find((item) => String(item.id) === String(req.body.shiftId));
  if (!employee || !shift) return res.status(404).json({ message: "Employee or shift not found" });
  const assignment = {
    id: nextId(db.shiftAssignments),
    employeeId: employee.id,
    employeeName: employee.fullName,
    shiftId: shift.id,
    shiftName: shift.name,
    effectiveFrom: req.body.effectiveFrom,
    effectiveTo: req.body.effectiveTo,
    createdAt: new Date().toISOString(),
  };
  db.shiftAssignments.push(assignment);
  audit(req.user, "CREATE", "shift_assignments", assignment.id, null, assignment);
  res.status(201).json({ data: assignment });
});

router.get("/reports/daily", authorize("SUPER_ADMIN", "HR_ADMIN", "REPORTING_MANAGER"), (req, res) => {
  const records = filterAttendance(req);
  res.json({
    data: {
      summary: attendanceStats(records),
      rows: records,
    },
  });
});

export default router;
