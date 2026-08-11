import {
  Award,
  BarChart3,
  Bell,
  BookOpenCheck,
  BriefcaseBusiness,
  CalendarCheck,
  ClipboardCheck,
  DoorOpen,
  FileCheck2,
  GraduationCap,
  LayoutDashboard,
  Network,
  ShieldCheck,
  UserCheck,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type Role = "SUPER_ADMIN" | "HR_ADMIN" | "REPORTING_MANAGER" | "EMPLOYEE" | "TRAINER" | "COMPLIANCE_OFFICER";

export type Module = {
  id: string;
  label: string;
  domain: string;
  description: string;
  roles: Role[];
  metrics: string[];
  fields: string[];
  icon: LucideIcon;
};

export const roles: Record<Role, string> = {
  SUPER_ADMIN: "Super Admin",
  HR_ADMIN: "HR Admin",
  REPORTING_MANAGER: "Reporting Manager",
  EMPLOYEE: "Employee",
  TRAINER: "Trainer",
  COMPLIANCE_OFFICER: "Compliance Officer",
};

export const modules: Module[] = [
  { id: "dashboard", label: "HR Dashboard", domain: "Analytics", description: "Headcount, attrition, new joiners, attendance, leave, probation, training, and policy compliance.", roles: ["SUPER_ADMIN", "HR_ADMIN", "REPORTING_MANAGER", "COMPLIANCE_OFFICER"], metrics: ["50 headcount", "7 pending approvals", "72% training", "91% policy"], fields: ["Headcount", "Attrition", "Compliance"], icon: LayoutDashboard },
  { id: "pre-hire", label: "Pre-Hire", domain: "Recruitment", description: "Candidate management, interview tracking, and offer management.", roles: ["HR_ADMIN", "REPORTING_MANAGER"], metrics: ["2 requisitions", "18 candidates", "3 offers"], fields: ["Candidate", "Interview", "Offer"], icon: BriefcaseBusiness },
  { id: "onboarding", label: "Onboarding", domain: "Joining", description: "Employee creation, document collection, onboarding tasks, policies, and learning paths.", roles: ["HR_ADMIN", "REPORTING_MANAGER", "EMPLOYEE", "TRAINER"], metrics: ["3 active joiners", "9 tasks", "2 overdue"], fields: ["Task", "Owner", "Due Date"], icon: UserCheck },
  { id: "employees", label: "Employee Management", domain: "Core HR", description: "Employee master, departments, designations, hierarchy, documents, directory, and org chart.", roles: ["SUPER_ADMIN", "HR_ADMIN", "REPORTING_MANAGER", "EMPLOYEE"], metrics: ["50 employees", "8 departments", "6 locations"], fields: ["Employee", "Department", "Manager"], icon: Users },
  { id: "attendance", label: "Attendance", domain: "Time", description: "Tracking, check-in/out, WFH, regularization, shifts, and attendance reports.", roles: ["HR_ADMIN", "REPORTING_MANAGER", "EMPLOYEE"], metrics: ["30 present", "7 WFH", "2 regularizations"], fields: ["Date", "Mode", "Status"], icon: ClipboardCheck },
  { id: "leave", label: "Leave", domain: "Time", description: "CL, SL, EL, comp-off, accruals, holidays, and approval workflows.", roles: ["HR_ADMIN", "REPORTING_MANAGER", "EMPLOYEE"], metrics: ["3 pending", "4 leave types", "3 holidays"], fields: ["Type", "Balance", "Approver"], icon: CalendarCheck },
  { id: "comp-off", label: "Comp-Off", domain: "Time", description: "Comp-off request, approval, expiry tracking, and utilization tracking.", roles: ["HR_ADMIN", "REPORTING_MANAGER", "EMPLOYEE"], metrics: ["2 requests", "1 expiring", "0.5 used"], fields: ["Worked Date", "Expiry", "Utilization"], icon: Award },
  { id: "probation", label: "Probation", domain: "Lifecycle", description: "30/60/90-day reviews, confirmation recommendation, and extension workflow.", roles: ["HR_ADMIN", "REPORTING_MANAGER"], metrics: ["3 due", "1 confirm", "1 extension"], fields: ["Review Day", "Outcome", "Status"], icon: FileCheck2 },
  { id: "performance", label: "Performance", domain: "Growth", description: "Goals, KPIs, reviews, manager feedback, and annual assessments.", roles: ["HR_ADMIN", "REPORTING_MANAGER", "EMPLOYEE"], metrics: ["FY26 H1", "86 avg KPI", "12 pending"], fields: ["Goal", "KPI", "Feedback"], icon: BarChart3 },
  { id: "learning", label: "Learning", domain: "Growth", description: "Training calendar, mandatory trainings, attendance, completion, and certificates.", roles: ["HR_ADMIN", "REPORTING_MANAGER", "EMPLOYEE", "TRAINER"], metrics: ["3 trainings", "72% complete", "2 certificates"], fields: ["Training", "Session", "Certificate"], icon: GraduationCap },
  { id: "policies", label: "Policy Management", domain: "Compliance", description: "Policy repository, version control, effective dates, expiry reviews, and acknowledgements.", roles: ["HR_ADMIN", "COMPLIANCE_OFFICER", "EMPLOYEE", "REPORTING_MANAGER"], metrics: ["3 policies", "1 pending ack", "2 reviews"], fields: ["Version", "Effective", "Acknowledged"], icon: BookOpenCheck },
  { id: "certifications", label: "Certifications", domain: "Compliance", description: "Employee certifications, expiry tracking, and renewal reminders.", roles: ["HR_ADMIN", "COMPLIANCE_OFFICER", "EMPLOYEE", "REPORTING_MANAGER"], metrics: ["2 tracked", "1 expiring", "5 reminders"], fields: ["Issuer", "Expiry", "Evidence"], icon: ShieldCheck },
  { id: "manager", label: "Manager Portal", domain: "Manager", description: "Team attendance, leave status, probation reviews, training compliance, and performance.", roles: ["REPORTING_MANAGER"], metrics: ["12 team", "4 approvals", "2 gaps"], fields: ["Team", "Approvals", "Compliance"], icon: Network },
  { id: "self-service", label: "Self Service", domain: "Employee", description: "Profile updates, leave, attendance, training, policies, and documents.", roles: ["EMPLOYEE", "REPORTING_MANAGER", "HR_ADMIN", "TRAINER", "COMPLIANCE_OFFICER"], metrics: ["5 actions", "2 documents", "1 acknowledgement"], fields: ["Request", "Document", "Policy"], icon: Bell },
  { id: "exit", label: "Exit Management", domain: "Separation", description: "Resignation, notice period, checklist, asset recovery, KT, and full/final settlement.", roles: ["HR_ADMIN", "REPORTING_MANAGER", "EMPLOYEE"], metrics: ["1 active exit", "2 checklist", "1 asset"], fields: ["Notice", "Checklist", "F&F"], icon: DoorOpen },
];

export const demoRows = [
  { employee: "Aakansha Yadav", module: "Leave", request: "Earned Leave", status: "PENDING_MANAGER", owner: "Kiran Pole" },
  { employee: "Aarti Shah", module: "Policy", request: "Information Security v1.3", status: "SUBMITTED", owner: "Compliance Officer" },
  { employee: "Abdul Barie", module: "Certification", request: "Renewal due", status: "EXPIRING_SOON", owner: "Compliance Officer" },
  { employee: "Avanish Kumar Dubey", module: "Attendance", request: "WFH regularization", status: "PENDING_MANAGER", owner: "Kiran Pole" },
  { employee: "New Joiner", module: "Onboarding", request: "Document checklist", status: "PENDING_HR", owner: "Doris Anna T" },
];
