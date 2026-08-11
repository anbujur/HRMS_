import express from "express";
import { db } from "../store.js";

const router = express.Router();

function group(items, field) {
  return Object.entries(
    items.reduce((acc, item) => {
      const key = item[field] || "Unassigned";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {})
  ).map(([name, count]) => ({ name, count }));
}

const reportBuilders = {
  attendance: () => ({
    rows: db.attendance,
    summary: {
      presentToday: db.attendance.length,
      wfh: db.attendance.filter((item) => item.mode === "WFH").length,
      missingCheckout: db.attendance.filter((item) => !item.checkOut).length,
    },
  }),
  leave: () => ({
    rows: db.leaveRequests,
    summary: {
      pending: db.leaveRequests.filter((item) => item.status === "PENDING_MANAGER").length,
      approved: db.leaveRequests.filter((item) => item.status === "APPROVED").length,
    },
  }),
  headcount: () => ({ rows: group(db.employees, "team"), summary: { total: db.employees.length } }),
  attrition: () => ({
    rows: db.employees.filter((employee) => employee.lifecycleStatus === "EXITED"),
    summary: {
      rate: 4.2,
      exitedEmployees: db.employees.filter((employee) => employee.lifecycleStatus === "EXITED").length,
    },
  }),
  probation: () => ({ rows: db.probationReviews, summary: { due: db.probationReviews.length } }),
  training: () => ({ rows: db.trainings, summary: { mandatoryCompletion: 72 } }),
  policyCompliance: () => ({
    rows: db.policyAcknowledgements,
    summary: {
      acknowledged: db.policyAcknowledgements.filter((item) => item.acknowledgedAt).length,
      pending: db.policyAcknowledgements.filter((item) => !item.acknowledgedAt).length,
    },
  }),
  certifications: () => ({ rows: db.certifications, summary: { expiringSoon: db.certifications.filter((item) => item.status === "EXPIRING_SOON").length } }),
};

router.get("/", (req, res) => {
  res.json({ data: Object.keys(reportBuilders).map((key) => ({ key, endpoint: `/api/v1/reports/${key}` })) });
});

router.get("/:reportKey", (req, res) => {
  const build = reportBuilders[req.params.reportKey];
  if (!build) return res.status(404).json({ message: "Report not found" });
  res.json({ data: build() });
});

export default router;
