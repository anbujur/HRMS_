import bcrypt from "bcryptjs";

const passwordHash = bcrypt.hashSync("Password@123", 10);

export const users = [
  {
    id: "u-super-admin",
    employeeId: null,
    name: "System Super Admin",
    email: "super.admin@cuculus.example",
    role: "SUPER_ADMIN",
    passwordHash,
  },
  {
    id: "u-hr-admin",
    employeeId: 11,
    name: "Doris Anna T",
    email: "hr.admin@cuculus.example",
    role: "HR_ADMIN",
    passwordHash,
  },
  {
    id: "u-manager",
    employeeId: 2,
    name: "Kiran Pole",
    email: "manager@cuculus.example",
    role: "REPORTING_MANAGER",
    passwordHash,
  },
  {
    id: "u-employee",
    employeeId: 1,
    name: "Aakansha Yadav",
    email: "employee@cuculus.example",
    role: "EMPLOYEE",
    passwordHash,
  },
  {
    id: "u-trainer",
    employeeId: 8,
    name: "Training Lead",
    email: "trainer@cuculus.example",
    role: "TRAINER",
    passwordHash,
  },
  {
    id: "u-compliance",
    employeeId: 12,
    name: "Compliance Officer",
    email: "compliance@cuculus.example",
    role: "COMPLIANCE_OFFICER",
    passwordHash,
  },
];
