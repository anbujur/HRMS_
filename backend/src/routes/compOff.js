import express from "express";
import { db } from "../store.js";
import { authorize } from "../middleware/auth.js";
import {
  compOffStats,
  createCompOffRequest,
  decideCompOffRequest,
  filterScoped,
  paginate,
} from "../services/leaveService.js";

const router = express.Router();

function sendResult(res, result, status = 200) {
  if (result.error) return res.status(result.error.status).json({ error: { code: result.error.code, message: result.error.message } });
  return res.status(status).json({ data: result.data });
}

function utilizationRows(req) {
  return filterScoped(req, db.compOffRequests).map((item) => ({
    id: item.id,
    employeeId: item.employeeId,
    employeeName: item.employeeName,
    earnedDays: item.earnedDays,
    utilizedDays: item.utilizedDays,
    availableDays: Number(item.earnedDays || 0) - Number(item.utilizedDays || 0),
    expiresOn: item.expiresOn,
    status: item.status,
  }));
}

router.get("/requests", (req, res) => res.json(paginate(filterScoped(req, db.compOffRequests), req)));

router.get("/stats", authorize("SUPER_ADMIN", "HR_ADMIN", "REPORTING_MANAGER"), (req, res) => {
  res.json({ data: compOffStats(filterScoped(req, db.compOffRequests)) });
});

router.get("/utilizations", (req, res) => res.json(paginate(utilizationRows(req), req)));

router.post("/requests", (req, res) => sendResult(res, createCompOffRequest(req), 201));

router.put("/requests/:id", authorize("SUPER_ADMIN", "HR_ADMIN", "REPORTING_MANAGER"), (req, res) => {
  const request = db.compOffRequests.find((item) => String(item.id) === String(req.params.id));
  if (!request) return res.status(404).json({ message: "Comp-off request not found" });
  sendResult(res, decideCompOffRequest(req, request));
});

export default router;
