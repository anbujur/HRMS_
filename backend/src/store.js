import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const employeeSeed = JSON.parse(fs.readFileSync(path.join(__dirname, "data", "employees.json"), "utf8"));
const today = new Date("2026-06-20");

function employeeName(employeeId) {
  return employeeSeed.find((employee) => Number(employee.id) === Number(employeeId))?.fullName || "Unassigned";
}

function dateIn(days) {
  const value = new Date(today);
  value.setDate(value.getDate() + days);
  return value.toISOString().slice(0, 10);
}

export const db = {
  employees: employeeSeed.map((employee) => ({
    ...employee,
    employeeCode: employee.employeeId,
    lifecycleStatus: employee.employmentStatus === "Active" ? "ACTIVE" : "EXITED",
  })),
  employeeJobHistory: employeeSeed.slice(0, 20).map((employee, index) => ({
    id: index + 1,
    employeeId: employee.id,
    employeeName: employee.fullName,
    department: employee.department,
    designation: employee.designation,
    reportingManager: employee.reportingManager,
    effectiveFrom: employee.joiningDate,
    reason: "Initial employee import",
    createdAt: "2026-06-20T00:00:00.000Z",
  })),
  documents: employeeSeed.slice(0, 16).flatMap((employee, index) => [
    {
      id: index * 2 + 1,
      employeeId: employee.id,
      employeeName: employee.fullName,
      documentType: "Passport",
      fileName: `${employee.employeeId}-passport.pdf`,
      storageKey: `employees/${employee.employeeId}/passport.pdf`,
      expiryDate: employee.passportExpiry,
      status: new Date(employee.passportExpiry) < today ? "EXPIRED" : "VALID",
    },
    {
      id: index * 2 + 2,
      employeeId: employee.id,
      employeeName: employee.fullName,
      documentType: "Visa",
      fileName: `${employee.employeeId}-visa.pdf`,
      storageKey: `employees/${employee.employeeId}/visa.pdf`,
      expiryDate: employee.visaExpiry,
      status: new Date(employee.visaExpiry) < today ? "EXPIRED" : "VALID",
    },
  ]),
  requisitions: [
    { id: 1, title: "Senior Product Support Engineer", department: "Product Operations", openings: 2, hiringManager: "Kiran Pole", status: "SUBMITTED", targetJoiningDate: dateIn(45) },
    { id: 2, title: "HR Operations Specialist", department: "People, Talent & Culture", openings: 1, hiringManager: "Doris Anna T", status: "PENDING_HR", targetJoiningDate: dateIn(30) },
  ],
  candidates: [
    { id: 1, requisitionId: 1, fullName: "Riya Mehta", email: "riya.mehta@example.com", phone: "+91 90000 11111", stage: "TECHNICAL_INTERVIEW", rating: 4.2, resumeUrl: "s3://hrms/resumes/riya.pdf" },
    { id: 2, requisitionId: 2, fullName: "Arjun Rao", email: "arjun.rao@example.com", phone: "+91 90000 22222", stage: "OFFER_RELEASED", rating: 4.7, resumeUrl: "s3://hrms/resumes/arjun.pdf" },
  ],
  interviews: [
    { id: 1, candidateName: "Riya Mehta", round: "Technical", interviewer: "Kiran Pole", scheduledAt: "2026-06-24T10:30:00.000Z", status: "SUBMITTED", score: 4.1 },
    { id: 2, candidateName: "Arjun Rao", round: "HR Discussion", interviewer: "Doris Anna T", scheduledAt: "2026-06-22T11:00:00.000Z", status: "APPROVED", score: 4.8 },
  ],
  offers: [
    { id: 1, candidateName: "Arjun Rao", offeredCtc: 1250000, joiningDate: dateIn(21), status: "PENDING_HR", acceptedAt: null },
  ],
  onboardingTasks: [
    { id: 1, employeeId: 50, employeeName: employeeName(50), taskName: "Collect identity documents", taskType: "DOCUMENT", ownerRole: "EMPLOYEE", dueDate: dateIn(5), status: "SUBMITTED" },
    { id: 2, employeeId: 50, employeeName: employeeName(50), taskName: "Assign laptop and email", taskType: "IT", ownerRole: "HR_ADMIN", dueDate: dateIn(3), status: "PENDING_HR" },
    { id: 3, employeeId: 50, employeeName: employeeName(50), taskName: "Complete induction training", taskType: "LEARNING", ownerRole: "TRAINER", dueDate: dateIn(10), status: "SUBMITTED" },
  ],
  shifts: [
    { id: 1, name: "General Shift", startsAt: "09:30", endsAt: "18:30", graceMinutes: 10 },
    { id: 2, name: "Early Support Shift", startsAt: "07:00", endsAt: "16:00", graceMinutes: 10 },
    { id: 3, name: "Late Support Shift", startsAt: "13:00", endsAt: "22:00", graceMinutes: 10 },
  ],
  shiftAssignments: employeeSeed.slice(0, 30).map((employee, index) => ({
    id: index + 1,
    employeeId: employee.id,
    employeeName: employee.fullName,
    shiftId: (index % 3) + 1,
    shiftName: ["General Shift", "Early Support Shift", "Late Support Shift"][index % 3],
    effectiveFrom: "2026-06-01",
  })),
  attendance: employeeSeed.slice(0, 30).map((employee, index) => ({
    id: index + 1,
    employeeId: employee.id,
    employeeName: employee.fullName,
    attendanceDate: "2026-06-20",
    mode: index % 4 === 0 ? "WFH" : "OFFICE",
    checkIn: "2026-06-20T09:30:00.000Z",
    checkOut: index % 5 === 0 ? null : "2026-06-20T18:20:00.000Z",
    totalMinutes: index % 5 === 0 ? null : 530,
    status: index % 5 === 0 ? "SUBMITTED" : "APPROVED",
  })),
  attendanceRegularizations: [
    { id: 1, employeeId: 3, employeeName: employeeName(3), attendanceDate: "2026-06-19", reason: "Client call overran checkout", status: "PENDING_MANAGER" },
    { id: 2, employeeId: 14, employeeName: employeeName(14), attendanceDate: "2026-06-18", reason: "VPN issue during WFH", status: "PENDING_MANAGER" },
  ],
  leaveTypes: [
    { id: 1, code: "CL", name: "Casual Leave", annualQuota: 6, isPaid: true, requiresDocument: false, isActive: true },
    { id: 2, code: "SL", name: "Sick Leave", annualQuota: 5, isPaid: true, requiresDocument: true, isActive: true },
    { id: 3, code: "EL", name: "Earned Leave", annualQuota: 18, isPaid: true, requiresDocument: false, isActive: true },
    { id: 4, code: "CO", name: "Comp-Off", annualQuota: 0, isPaid: true, requiresDocument: false, isActive: true },
  ],
  leaveAccrualRules: [
    { id: 1, leaveType: "Earned Leave", accrualFrequency: "MONTHLY", accrualAmount: 1.5, maxCarryForward: 12, effectiveFrom: "2026-01-01" },
    { id: 2, leaveType: "Casual Leave", accrualFrequency: "ANNUAL", accrualAmount: 6, maxCarryForward: 0, effectiveFrom: "2026-01-01" },
    { id: 3, leaveType: "Sick Leave", accrualFrequency: "ANNUAL", accrualAmount: 5, maxCarryForward: 0, effectiveFrom: "2026-01-01" },
  ],
  leaveRequests: [
    { id: 1, employeeId: 1, employeeName: employeeName(1), leaveType: "Earned Leave", fromDate: "2026-06-25", toDate: "2026-06-27", days: 3, status: "PENDING_MANAGER", approver: "Kiran Pole" },
    { id: 2, employeeId: 10, employeeName: employeeName(10), leaveType: "Sick Leave", fromDate: "2026-06-21", toDate: "2026-06-21", days: 1, status: "APPROVED", approver: "Doris Anna T" },
    { id: 3, employeeId: 14, employeeName: employeeName(14), leaveType: "Casual Leave", fromDate: "2026-07-01", toDate: "2026-07-01", days: 1, status: "PENDING_MANAGER", approver: "Kiran Pole" },
  ],
  leaveBalances: employeeSeed.slice(0, 12).flatMap((employee) => [
    { id: `${employee.id}-CL`, employeeId: employee.id, employeeName: employee.fullName, leaveType: "Casual Leave", balance: 6, asOfDate: "2026-06-20" },
    { id: `${employee.id}-SL`, employeeId: employee.id, employeeName: employee.fullName, leaveType: "Sick Leave", balance: 5, asOfDate: "2026-06-20" },
    { id: `${employee.id}-EL`, employeeId: employee.id, employeeName: employee.fullName, leaveType: "Earned Leave", balance: 12, asOfDate: "2026-06-20" },
  ]),
  leaveLedger: [
    { id: 1, employeeId: 10, employeeName: employeeName(10), leaveType: "Sick Leave", leaveRequestId: 2, transactionType: "DEBIT", days: 1, notes: "Approved sick leave", createdAt: "2026-06-20T00:00:00.000Z" },
  ],
  holidays: [
    { id: 1, location: "Bengaluru", holidayDate: "2026-08-15", name: "Independence Day", isOptional: false },
    { id: 2, location: "Bengaluru", holidayDate: "2026-10-20", name: "Diwali", isOptional: false },
    { id: 3, location: "Hyderabad", holidayDate: "2026-09-05", name: "Regional Holiday", isOptional: true },
  ],
  compOffRequests: [
    { id: 1, employeeId: 5, employeeName: employeeName(5), sourceWorkDate: "2026-06-15", earnedDays: 1, utilizedDays: 0, expiresOn: "2026-09-15", status: "PENDING_MANAGER", reason: "Weekend deployment" },
    { id: 2, employeeId: 9, employeeName: employeeName(9), sourceWorkDate: "2026-05-30", earnedDays: 0.5, utilizedDays: 0.5, expiresOn: "2026-08-30", status: "APPROVED", reason: "Client support" },
  ],
  probationReviews: [
    { id: 1, employeeId: 47, employeeName: employeeName(47), reviewDay: 30, dueDate: dateIn(4), outcome: null, status: "PENDING_MANAGER" },
    { id: 2, employeeId: 48, employeeName: employeeName(48), reviewDay: 60, dueDate: dateIn(12), outcome: "CONTINUE", status: "PENDING_HR" },
    { id: 3, employeeId: 49, employeeName: employeeName(49), reviewDay: 90, dueDate: dateIn(20), outcome: "CONFIRM", status: "PENDING_HR" },
  ],
  performanceReviews: [
    { id: 1, employeeId: 1, employeeName: employeeName(1), cycle: "FY26 H1", goal: "Improve first response SLA", kpiScore: 86, status: "PENDING_MANAGER" },
    { id: 2, employeeId: 11, employeeName: employeeName(11), cycle: "FY26 H1", goal: "Reduce hiring TAT", kpiScore: 91, status: "SUBMITTED" },
  ],
  trainings: [
    { id: 1, title: "Data Privacy and Labour Compliance", category: "Mandatory", audience: "All Employees", trainingDate: "2026-06-28", completionRate: 72, status: "SUBMITTED" },
    { id: 2, title: "Advanced PostgreSQL Operations", category: "Department", audience: "ITS", trainingDate: "2026-07-02", completionRate: 35, status: "SUBMITTED" },
    { id: 3, title: "Manager Essentials", category: "Leadership", audience: "Managers", trainingDate: "2026-07-10", completionRate: 18, status: "SUBMITTED" },
  ],
  trainingAssignments: [
    { id: 1, employeeId: 1, employeeName: employeeName(1), trainingTitle: "Data Privacy and Labour Compliance", status: "APPROVED", completedAt: "2026-06-18T12:00:00.000Z" },
    { id: 2, employeeId: 2, employeeName: employeeName(2), trainingTitle: "Manager Essentials", status: "SUBMITTED", completedAt: null },
  ],
  policies: [
    { id: 1, name: "Leave Policy", category: "HR", version: "v2.0", effectiveDate: "2026-04-01", reviewDate: "2027-04-01", status: "APPROVED" },
    { id: 2, name: "Information Security Policy", category: "Security", version: "v1.3", effectiveDate: "2026-05-01", reviewDate: "2027-05-01", status: "APPROVED" },
    { id: 3, name: "Travel and Reimbursement Policy", category: "Finance", version: "v1.1", effectiveDate: "2026-03-18", reviewDate: "2027-03-18", status: "APPROVED" },
  ],
  policyAcknowledgements: [
    { id: 1, employeeId: 1, employeeName: employeeName(1), policyName: "Leave Policy", version: "v2.0", acknowledgedAt: "2026-04-02T09:15:00.000Z", status: "APPROVED" },
    { id: 2, employeeId: 2, employeeName: employeeName(2), policyName: "Information Security Policy", version: "v1.3", acknowledgedAt: null, status: "SUBMITTED" },
  ],
  certifications: [
    { id: 1, employeeId: 6, employeeName: employeeName(6), certificationName: "AWS Solutions Architect", issuer: "AWS", issuedOn: "2025-09-01", expiresOn: "2026-09-01", status: "VALID" },
    { id: 2, employeeId: 12, employeeName: employeeName(12), certificationName: "Labour Compliance Practitioner", issuer: "SHRM", issuedOn: "2024-08-01", expiresOn: "2026-07-15", status: "EXPIRING_SOON" },
  ],
  complianceTasks: [
    { id: 1, title: "PF Filing", complianceType: "Statutory", owner: "Compliance Officer", dueDate: "2026-06-25", status: "SUBMITTED" },
    { id: 2, title: "Policy Expiry Review", complianceType: "Policy", owner: "HR Admin", dueDate: "2026-07-01", status: "PENDING_COMPLIANCE" },
  ],
  exitCases: [
    { id: 1, employeeId: 44, employeeName: employeeName(44), resignationDate: "2026-06-10", lastWorkingDay: "2026-07-09", noticeDays: 30, status: "PENDING_MANAGER" },
  ],
  exitChecklists: [
    { id: 1, employeeId: 44, employeeName: employeeName(44), itemName: "Recover laptop", ownerRole: "HR_ADMIN", dueDate: "2026-07-08", status: "SUBMITTED" },
    { id: 2, employeeId: 44, employeeName: employeeName(44), itemName: "Knowledge transfer", ownerRole: "REPORTING_MANAGER", dueDate: "2026-07-05", status: "PENDING_MANAGER" },
  ],
  notifications: [
    { id: 1, title: "Leave approval pending", body: "Aakansha Yadav requested Earned Leave", readAt: null, createdAt: "2026-06-20T08:00:00.000Z" },
    { id: 2, title: "Certification expiring", body: "Labour Compliance Practitioner expires in 25 days", readAt: null, createdAt: "2026-06-20T08:05:00.000Z" },
  ],
  auditLogs: [],
};

export function nextId(collection) {
  const numericIds = collection.map((item) => Number(item.id)).filter((id) => Number.isFinite(id));
  return numericIds.length ? Math.max(...numericIds) + 1 : collection.length + 1;
}

export function audit(actor, action, entityType, entityId, oldValue, newValue) {
  db.auditLogs.push({
    id: nextId(db.auditLogs),
    actorUserId: actor?.sub,
    action,
    entityType,
    entityId,
    oldValue,
    newValue,
    createdAt: new Date().toISOString(),
  });
}
