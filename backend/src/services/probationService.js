import { db, nextId, audit } from "../store.js";

const allowedReviewDays = [30, 60, 90];
const allowedOutcomes = ["CONTINUE", "CONFIRM", "EXTEND", "TERMINATE"];

export function canAccessProbation(user, review) {
  if (["SUPER_ADMIN", "HR_ADMIN"].includes(user.role)) return true;
  if (user.role === "REPORTING_MANAGER") {
    const employee = db.employees.find((item) => String(item.id) === String(review.employeeId));
    return String(employee?.reportingManagerId || "") === String(user.employeeId) || employee?.reportingManager === user.name;
  }
  return false;
}

export function filterProbation(req) {
  const search = String(req.query.search || "").toLowerCase();
  const status = req.query.status;
  const reviewDay = req.query.reviewDay;
  const employeeId = req.query.employeeId;
  const from = req.query.from ? new Date(String(req.query.from)) : null;
  const to = req.query.to ? new Date(String(req.query.to)) : null;

  return db.probationReviews
    .filter((review) => canAccessProbation(req.user, review))
    .filter((review) => !search || JSON.stringify(review).toLowerCase().includes(search))
    .filter((review) => !status || review.status === status)
    .filter((review) => !reviewDay || Number(review.reviewDay) === Number(reviewDay))
    .filter((review) => !employeeId || String(review.employeeId) === String(employeeId))
    .filter((review) => {
      const dueDate = new Date(review.dueDate);
      return (!from || dueDate >= from) && (!to || dueDate <= to);
    });
}

export function paginate(items, req) {
  const page = Math.max(Number(req.query.page || 1), 1);
  const pageSize = Math.min(Math.max(Number(req.query.pageSize || 20), 1), 100);
  const start = (page - 1) * pageSize;
  return { data: items.slice(start, start + pageSize), meta: { page, pageSize, total: items.length } };
}

export function probationStats(records = db.probationReviews) {
  const today = new Date("2026-06-20");
  return {
    total: records.length,
    pendingManager: records.filter((item) => item.status === "PENDING_MANAGER").length,
    pendingHr: records.filter((item) => item.status === "PENDING_HR").length,
    approved: records.filter((item) => item.status === "APPROVED").length,
    overdue: records.filter((item) => new Date(item.dueDate) < today && !["APPROVED", "CLOSED"].includes(item.status)).length,
    dueIn30Days: records.filter((item) => {
      const diff = (new Date(item.dueDate) - today) / 86400000;
      return diff >= 0 && diff <= 30;
    }).length,
    confirmationRecommended: records.filter((item) => item.outcome === "CONFIRM").length,
    extensionRecommended: records.filter((item) => item.outcome === "EXTEND").length,
  };
}

export function createProbationReview(req) {
  const required = ["employeeId", "reviewDay", "dueDate"];
  const missing = required.filter((field) => !req.body[field]);
  if (missing.length) return { error: { status: 422, code: "VALIDATION_ERROR", message: `${missing.join(", ")} required` } };
  if (!allowedReviewDays.includes(Number(req.body.reviewDay))) {
    return { error: { status: 422, code: "INVALID_REVIEW_DAY", message: "reviewDay must be 30, 60, or 90" } };
  }
  const employee = db.employees.find((item) => String(item.id) === String(req.body.employeeId));
  if (!employee) return { error: { status: 404, code: "EMPLOYEE_NOT_FOUND", message: "Employee not found" } };
  const duplicate = db.probationReviews.some((item) => String(item.employeeId) === String(employee.id) && Number(item.reviewDay) === Number(req.body.reviewDay));
  if (duplicate) return { error: { status: 409, code: "DUPLICATE_PROBATION_REVIEW", message: "Review already exists for employee and review day" } };

  const review = {
    id: nextId(db.probationReviews),
    employeeId: employee.id,
    employeeName: employee.fullName,
    reviewDay: Number(req.body.reviewDay),
    dueDate: req.body.dueDate,
    managerFeedback: req.body.managerFeedback,
    hrFeedback: req.body.hrFeedback,
    outcome: req.body.outcome || null,
    status: req.body.status || "PENDING_MANAGER",
    createdAt: new Date().toISOString(),
  };
  db.probationReviews.push(review);
  audit(req.user, "CREATE", "probation_reviews", review.id, null, review);
  return { data: review };
}

export function submitManagerReview(req, review) {
  if (!req.body.managerFeedback || !req.body.outcome) {
    return { error: { status: 422, code: "VALIDATION_ERROR", message: "managerFeedback and outcome are required" } };
  }
  if (!allowedOutcomes.includes(req.body.outcome)) {
    return { error: { status: 422, code: "INVALID_OUTCOME", message: "Invalid probation outcome" } };
  }
  const oldValue = { ...review };
  review.managerFeedback = req.body.managerFeedback;
  review.outcome = req.body.outcome;
  review.managerRating = req.body.managerRating;
  review.status = "PENDING_HR";
  review.managerSubmittedBy = req.user.sub;
  review.managerSubmittedAt = new Date().toISOString();
  audit(req.user, "MANAGER_REVIEW", "probation_reviews", review.id, oldValue, review);
  return { data: review };
}

export function submitHrDecision(req, review) {
  if (!req.body.hrFeedback || !req.body.outcome) {
    return { error: { status: 422, code: "VALIDATION_ERROR", message: "hrFeedback and outcome are required" } };
  }
  if (!allowedOutcomes.includes(req.body.outcome)) {
    return { error: { status: 422, code: "INVALID_OUTCOME", message: "Invalid probation outcome" } };
  }
  if (req.body.outcome === "EXTEND" && !req.body.extensionUntil) {
    return { error: { status: 422, code: "EXTENSION_DATE_REQUIRED", message: "extensionUntil is required for extension" } };
  }

  const oldValue = { ...review };
  review.hrFeedback = req.body.hrFeedback;
  review.outcome = req.body.outcome;
  review.extensionUntil = req.body.extensionUntil;
  review.status = req.body.outcome === "CONTINUE" || req.body.outcome === "EXTEND" ? "APPROVED" : "CLOSED";
  review.hrDecidedBy = req.user.sub;
  review.hrDecidedAt = new Date().toISOString();

  const employee = db.employees.find((item) => String(item.id) === String(review.employeeId));
  if (employee && req.body.outcome === "CONFIRM") {
    employee.lifecycleStatus = "CONFIRMED";
    employee.confirmationDate = req.body.confirmationDate || new Date().toISOString().slice(0, 10);
  }
  if (employee && req.body.outcome === "EXTEND") {
    employee.lifecycleStatus = "PROBATION";
    employee.probationExtendedUntil = req.body.extensionUntil;
  }

  audit(req.user, "HR_DECISION", "probation_reviews", review.id, oldValue, review);
  return { data: review };
}

export function buildProbationTimeline(employeeId) {
  return db.probationReviews
    .filter((item) => String(item.employeeId) === String(employeeId))
    .sort((a, b) => Number(a.reviewDay) - Number(b.reviewDay))
    .map((item) => ({
      id: item.id,
      reviewDay: item.reviewDay,
      dueDate: item.dueDate,
      status: item.status,
      outcome: item.outcome,
      managerSubmittedAt: item.managerSubmittedAt,
      hrDecidedAt: item.hrDecidedAt,
    }));
}
