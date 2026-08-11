import express from "express";
import { db } from "../store.js";
import { authorize } from "../middleware/auth.js";
import {
  buildProbationTimeline,
  canAccessProbation,
  createProbationReview,
  filterProbation,
  paginate,
  probationStats,
  submitHrDecision,
  submitManagerReview,
} from "../services/probationService.js";

const router = express.Router();

function sendResult(res, result, status = 200) {
  if (result.error) return res.status(result.error.status).json({ error: { code: result.error.code, message: result.error.message } });
  return res.status(status).json({ data: result.data });
}

function findReview(req, res, next) {
  const review = db.probationReviews.find((item) => String(item.id) === String(req.params.id));
  if (!review) return res.status(404).json({ message: "Probation review not found" });
  if (!canAccessProbation(req.user, review)) return res.status(403).json({ message: "Insufficient permissions for probation review" });
  req.probationReview = review;
  return next();
}

router.get("/reviews", (req, res) => {
  res.json(paginate(filterProbation(req), req));
});

router.post("/reviews", authorize("SUPER_ADMIN", "HR_ADMIN"), (req, res) => {
  sendResult(res, createProbationReview(req), 201);
});

router.get("/reviews/:id", findReview, (req, res) => {
  res.json({ data: req.probationReview });
});

router.put("/reviews/:id/manager-review", authorize("SUPER_ADMIN", "HR_ADMIN", "REPORTING_MANAGER"), findReview, (req, res) => {
  sendResult(res, submitManagerReview(req, req.probationReview));
});

router.put("/reviews/:id/hr-decision", authorize("SUPER_ADMIN", "HR_ADMIN"), findReview, (req, res) => {
  sendResult(res, submitHrDecision(req, req.probationReview));
});

router.get("/stats", authorize("SUPER_ADMIN", "HR_ADMIN", "REPORTING_MANAGER"), (req, res) => {
  res.json({ data: probationStats(filterProbation(req)) });
});

router.get("/timeline/:employeeId", authorize("SUPER_ADMIN", "HR_ADMIN", "REPORTING_MANAGER"), (req, res) => {
  const employeeReviews = db.probationReviews.filter((item) => String(item.employeeId) === String(req.params.employeeId));
  if (employeeReviews.length && !employeeReviews.some((review) => canAccessProbation(req.user, review))) {
    return res.status(403).json({ message: "Insufficient permissions for probation timeline" });
  }
  res.json({ data: buildProbationTimeline(req.params.employeeId) });
});

router.get("/due", authorize("SUPER_ADMIN", "HR_ADMIN", "REPORTING_MANAGER"), (req, res) => {
  const days = Number(req.query.days || 30);
  const today = new Date("2026-06-20");
  const due = filterProbation(req).filter((review) => {
    const diff = (new Date(review.dueDate) - today) / 86400000;
    return diff >= 0 && diff <= days;
  });
  res.json(paginate(due, req));
});

export default router;
