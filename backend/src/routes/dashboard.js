import express from "express";
import { db } from "../store.js";

const router = express.Router();
const today = new Date("2026-06-20");

function isWithinDays(dateString, days) {
  if (!dateString) return false;
  const then = new Date(dateString);
  const diff = (then - today) / (1000 * 60 * 60 * 24);
  return diff >= 0 && diff <= days;
}

function groupBy(items, field) {
  return Object.entries(
    items.reduce((acc, item) => {
      const key = item[field] || "Unassigned";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {})
  ).map(([name, count]) => ({ name, count }));
}

router.get("/", (req, res) => {
  const employees = db.employees.filter((employee) => !employee.deletedAt);
  const active = employees.filter((employee) => employee.lifecycleStatus === "ACTIVE").length;
  const teamEmployeeIds = req.user.role === "REPORTING_MANAGER" ? employees.slice(0, 12).map((employee) => employee.id) : null;
  const roleFilter = (item) => !teamEmployeeIds || teamEmployeeIds.includes(item.employeeId);

  res.json({
    data: {
      headcount: employees.length,
      active,
      exited: employees.length - active,
      newJoiners: employees.sort((a, b) => new Date(b.joiningDate) - new Date(a.joiningDate)).slice(0, 6),
      departmentHeadcount: groupBy(employees, "team").slice(0, 8),
      pendingApprovals: [
        ...db.leaveRequests,
        ...db.attendanceRegularizations,
        ...db.compOffRequests,
        ...db.probationReviews,
        ...db.exitCases,
      ].filter((item) => roleFilter(item) && String(item.status).startsWith("PENDING")).length,
      attendanceAnalytics: {
        presentToday: db.attendance.filter(roleFilter).length,
        wfhToday: db.attendance.filter((item) => roleFilter(item) && item.mode === "WFH").length,
        missingCheckout: db.attendance.filter((item) => roleFilter(item) && !item.checkOut).length,
      },
      leaveAnalytics: {
        pending: db.leaveRequests.filter((item) => roleFilter(item) && item.status === "PENDING_MANAGER").length,
        approved: db.leaveRequests.filter((item) => roleFilter(item) && item.status === "APPROVED").length,
      },
      probationStatus: db.probationReviews.filter((item) => roleFilter(item) && isWithinDays(item.dueDate, 30)),
      trainingCompliance: {
        mandatoryCompletion: 72,
        pendingAssignments: db.trainingAssignments.filter((item) => roleFilter(item) && item.status !== "APPROVED").length,
      },
      policyCompliance: {
        acknowledged: db.policyAcknowledgements.filter((item) => item.acknowledgedAt).length,
        pending: db.policyAcknowledgements.filter((item) => !item.acknowledgedAt).length,
      },
      expiryAlerts: [
        ...db.documents.filter((item) => isWithinDays(item.expiryDate, 90)),
        ...db.certifications.filter((item) => isWithinDays(item.expiresOn, 90)),
      ],
      notifications: db.notifications,
    },
  });
});

export default router;
