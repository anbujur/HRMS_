import express from "express";
import { db, nextId, audit } from "../store.js";
import { authorize } from "../middleware/auth.js";
import {
  buildOrgChart,
  canAccessEmployee,
  createEmployee,
  employeeStats,
  employeeSummary,
  filterEmployees,
  paginate,
  updateEmployee,
} from "../services/employeeService.js";

const router = express.Router();

function findEmployee(req, res, next) {
  const employee = db.employees.find((item) => String(item.id) === String(req.params.id));
  if (!employee || employee.deletedAt) return res.status(404).json({ message: "Employee not found" });
  if (!canAccessEmployee(req.user, employee)) return res.status(403).json({ message: "Insufficient permissions for employee" });
  req.employee = employee;
  return next();
}

function validateEmployeePayload(req, res, next) {
  const requiredFields = ["fullName", "joiningDate", "department", "designation"];
  const missing = requiredFields.filter((field) => !req.body[field]);
  if (missing.length) {
    return res.status(422).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Employee validation failed",
        details: missing.map((field) => ({ field, message: `${field} is required` })),
      },
    });
  }
  const employeeCode = req.body.employeeCode || req.body.employeeId;
  if (employeeCode && db.employees.some((employee) => String(employee.employeeCode || employee.employeeId).toLowerCase() === String(employeeCode).toLowerCase())) {
    return res.status(409).json({ error: { code: "DUPLICATE_EMPLOYEE_CODE", message: "Employee code already exists" } });
  }
  if (req.body.officialEmail && db.employees.some((employee) => String(employee.officialEmail || "").toLowerCase() === String(req.body.officialEmail).toLowerCase())) {
    return res.status(409).json({ error: { code: "DUPLICATE_OFFICIAL_EMAIL", message: "Official email already exists" } });
  }
  return next();
}

router.get("/", (req, res) => {
  const employees = filterEmployees(req).map(employeeSummary);
  res.json(paginate(employees, req));
});

router.get("/directory", (req, res) => {
  const employees = filterEmployees(req).map((employee) => ({
    id: employee.id,
    employeeCode: employee.employeeCode || employee.employeeId,
    fullName: employee.fullName,
    designation: employee.designation,
    department: employee.team || employee.department,
    reportingManager: employee.reportingManager,
    location: employee.location,
    email: employee.officialEmail || employee.personalEmail,
    mobileNumber: employee.mobileNumber,
  }));
  res.json(paginate(employees, req));
});

router.get("/stats", authorize("SUPER_ADMIN", "HR_ADMIN", "REPORTING_MANAGER"), (req, res) => {
  res.json({ data: employeeStats(filterEmployees(req)) });
});

router.get("/org-chart", (req, res) => {
  res.json({ data: buildOrgChart() });
});

router.get("/documents", authorize("SUPER_ADMIN", "HR_ADMIN", "COMPLIANCE_OFFICER"), (req, res) => {
  res.json(paginate(db.documents, req));
});

router.post("/", authorize("HR_ADMIN"), validateEmployeePayload, (req, res) => {
  const employee = createEmployee(req);
  res.status(201).json({ data: employee });
});

router.get("/:id", findEmployee, (req, res) => {
  const employee = req.employee;
  res.json({
    data: {
      ...employee,
      documents: db.documents.filter((document) => String(document.employeeId) === String(employee.id)),
      jobHistory: db.employeeJobHistory.filter((history) => String(history.employeeId) === String(employee.id)),
      leaveBalances: db.leaveBalances.filter((balance) => String(balance.employeeId) === String(employee.id)),
    },
  });
});

router.put("/:id", authorize("HR_ADMIN"), findEmployee, (req, res) => {
  const updated = updateEmployee(req, req.employee);
  res.json({ data: updated });
});

router.delete("/:id", authorize("HR_ADMIN"), findEmployee, (req, res) => {
  const oldValue = { ...req.employee };
  req.employee.deletedAt = new Date().toISOString();
  req.employee.updatedBy = req.user.sub;
  req.employee.updatedAt = new Date().toISOString();
  audit(req.user, "SOFT_DELETE", "employees", req.employee.id, oldValue, req.employee);
  res.status(204).send();
});

router.get("/:id/documents", findEmployee, (req, res) => {
  const documents = db.documents.filter((document) => String(document.employeeId) === String(req.employee.id));
  res.json(paginate(documents, req));
});

router.post("/:id/documents", findEmployee, (req, res) => {
  if (!["SUPER_ADMIN", "HR_ADMIN"].includes(req.user.role) && String(req.user.employeeId) !== String(req.employee.id)) {
    return res.status(403).json({ message: "Insufficient permissions to upload document" });
  }
  const requiredFields = ["documentType", "fileName", "storageKey"];
  const missing = requiredFields.filter((field) => !req.body[field]);
  if (missing.length) {
    return res.status(422).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Document validation failed",
        details: missing.map((field) => ({ field, message: `${field} is required` })),
      },
    });
  }
  const document = {
    id: nextId(db.documents),
    employeeId: req.employee.id,
    employeeName: req.employee.fullName,
    status: "VALID",
    uploadedBy: req.user.sub,
    uploadedAt: new Date().toISOString(),
    ...req.body,
  };
  db.documents.push(document);
  audit(req.user, "UPLOAD_DOCUMENT", "employee_documents", document.id, null, document);
  res.status(201).json({ data: document });
});

router.get("/:id/job-history", findEmployee, (req, res) => {
  const history = db.employeeJobHistory.filter((item) => String(item.employeeId) === String(req.employee.id));
  res.json(paginate(history, req));
});

export default router;
