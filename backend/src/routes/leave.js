import express from "express";
import { db, nextId, audit } from "../store.js";
import { authorize } from "../middleware/auth.js";
import {
  compOffStats,
  createCompOffRequest,
  createLeaveRequest,
  decideCompOffRequest,
  decideLeaveRequest,
  filterScoped,
  leaveStats,
  paginate,
} from "../services/leaveService.js";

const router = express.Router();

function sendResult(res, result, status = 200) {
  if (result.error) return res.status(result.error.status).json({ error: { code: result.error.code, message: result.error.message } });
  return res.status(status).json({ data: result.data });
}

router.get("/types", (req, res) => res.json(paginate(db.leaveTypes, req)));

router.post("/types", authorize("SUPER_ADMIN", "HR_ADMIN"), (req, res) => {
  const required = ["code", "name", "annualQuota"];
  const missing = required.filter((field) => !req.body[field]);
  if (missing.length) return res.status(422).json({ error: { code: "VALIDATION_ERROR", message: `${missing.join(", ")} required` } });
  const type = { id: nextId(db.leaveTypes), isPaid: true, requiresDocument: false, isActive: true, ...req.body };
  db.leaveTypes.push(type);
  audit(req.user, "CREATE", "leave_types", type.id, null, type);
  res.status(201).json({ data: type });
});

router.get("/accrual-rules", authorize("SUPER_ADMIN", "HR_ADMIN"), (req, res) => res.json(paginate(db.leaveAccrualRules, req)));

router.post("/accrual-rules", authorize("SUPER_ADMIN", "HR_ADMIN"), (req, res) => {
  const rule = { id: nextId(db.leaveAccrualRules), ...req.body, createdAt: new Date().toISOString() };
  db.leaveAccrualRules.push(rule);
  audit(req.user, "CREATE", "leave_accrual_rules", rule.id, null, rule);
  res.status(201).json({ data: rule });
});

router.get("/balances", (req, res) => res.json(paginate(filterScoped(req, db.leaveBalances), req)));

router.get("/ledger", (req, res) => res.json(paginate(filterScoped(req, db.leaveLedger), req)));

router.get("/requests", (req, res) => res.json(paginate(filterScoped(req, db.leaveRequests), req)));

router.get("/stats", authorize("SUPER_ADMIN", "HR_ADMIN", "REPORTING_MANAGER"), (req, res) => {
  res.json({ data: leaveStats(filterScoped(req, db.leaveRequests)) });
});

router.post("/requests", (req, res) => sendResult(res, createLeaveRequest(req), 201));

router.put("/requests/:id", authorize("SUPER_ADMIN", "HR_ADMIN", "REPORTING_MANAGER"), (req, res) => {
  const request = db.leaveRequests.find((item) => String(item.id) === String(req.params.id));
  if (!request) return res.status(404).json({ message: "Leave request not found" });
  sendResult(res, decideLeaveRequest(req, request));
});

router.get("/holidays", (req, res) => {
  const location = req.query.location;
  const records = db.holidays.filter((holiday) => !location || holiday.location === location);
  res.json(paginate(records, req));
});

router.post("/holidays", authorize("SUPER_ADMIN", "HR_ADMIN"), (req, res) => {
  const holiday = { id: nextId(db.holidays), isOptional: false, ...req.body };
  db.holidays.push(holiday);
  audit(req.user, "CREATE", "holiday_calendars", holiday.id, null, holiday);
  res.status(201).json({ data: holiday });
});

router.get("/comp-off/requests", (req, res) => res.json(paginate(filterScoped(req, db.compOffRequests), req)));
router.get("/requests", (req, res, next) => {
  if (!req.baseUrl.endsWith("/comp-off")) return next();
  return res.json(paginate(filterScoped(req, db.compOffRequests), req));
});

router.get("/comp-off/stats", authorize("SUPER_ADMIN", "HR_ADMIN", "REPORTING_MANAGER"), (req, res) => {
  res.json({ data: compOffStats(filterScoped(req, db.compOffRequests)) });
});
router.get("/stats", authorize("SUPER_ADMIN", "HR_ADMIN", "REPORTING_MANAGER"), (req, res, next) => {
  if (!req.baseUrl.endsWith("/comp-off")) return next();
  return res.json({ data: compOffStats(filterScoped(req, db.compOffRequests)) });
});

router.get("/comp-off/utilizations", (req, res) => {
  const records = filterScoped(req, db.compOffRequests).map((item) => ({
    id: item.id,
    employeeId: item.employeeId,
    employeeName: item.employeeName,
    earnedDays: item.earnedDays,
    utilizedDays: item.utilizedDays,
    availableDays: Number(item.earnedDays || 0) - Number(item.utilizedDays || 0),
    expiresOn: item.expiresOn,
    status: item.status,
  }));
  res.json(paginate(records, req));
});
router.get("/utilizations", (req, res, next) => {
  if (!req.baseUrl.endsWith("/comp-off")) return next();
  const records = filterScoped(req, db.compOffRequests).map((item) => ({
    id: item.id,
    employeeId: item.employeeId,
    employeeName: item.employeeName,
    earnedDays: item.earnedDays,
    utilizedDays: item.utilizedDays,
    availableDays: Number(item.earnedDays || 0) - Number(item.utilizedDays || 0),
    expiresOn: item.expiresOn,
    status: item.status,
  }));
  return res.json(paginate(records, req));
});

router.post("/comp-off/requests", (req, res) => sendResult(res, createCompOffRequest(req), 201));
router.post("/requests", (req, res, next) => {
  if (!req.baseUrl.endsWith("/comp-off")) return next();
  return sendResult(res, createCompOffRequest(req), 201);
});

router.put("/comp-off/requests/:id", authorize("SUPER_ADMIN", "HR_ADMIN", "REPORTING_MANAGER"), (req, res) => {
  const request = db.compOffRequests.find((item) => String(item.id) === String(req.params.id));
  if (!request) return res.status(404).json({ message: "Comp-off request not found" });
  sendResult(res, decideCompOffRequest(req, request));
});
router.put("/requests/:id", authorize("SUPER_ADMIN", "HR_ADMIN", "REPORTING_MANAGER"), (req, res, next) => {
  if (!req.baseUrl.endsWith("/comp-off")) return next();
  const request = db.compOffRequests.find((item) => String(item.id) === String(req.params.id));
  if (!request) return res.status(404).json({ message: "Comp-off request not found" });
  return sendResult(res, decideCompOffRequest(req, request));
});

export default router;
