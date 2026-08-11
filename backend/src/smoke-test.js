import request from "supertest";

process.env.NODE_ENV = "test";

const { app } = await import("./server.js");

const login = await request(app).post("/api/v1/auth/login").send({
  email: "hr.admin@cuculus.example",
  password: "Password@123",
});

if (login.status !== 200 || !login.body.accessToken || !login.body.refreshToken) {
  throw new Error("Login smoke test failed");
}

const auth = { Authorization: `Bearer ${login.body.accessToken}` };

const dashboard = await request(app).get("/api/v1/dashboard").set(auth);
if (dashboard.status !== 200 || dashboard.body.data.headcount !== 50) {
  throw new Error("Dashboard smoke test failed");
}

const modules = await request(app).get("/api/v1/modules").set(auth);
if (modules.status !== 200 || modules.body.data.length < 10) {
  throw new Error("Module catalog smoke test failed");
}

const rbacMe = await request(app).get("/api/v1/rbac/me").set(auth);
if (rbacMe.status !== 200 || !rbacMe.body.data.permissions.includes("rbac.read")) {
  throw new Error("RBAC self permissions smoke test failed");
}

const rbacMatrix = await request(app).get("/api/v1/rbac/matrix").set(auth);
if (rbacMatrix.status !== 200 || rbacMatrix.body.data.length !== 6) {
  throw new Error("RBAC matrix smoke test failed");
}

const employees = await request(app).get("/api/v1/employees?pageSize=10").set(auth);
if (employees.status !== 200 || employees.body.meta.total !== 50) {
  throw new Error("Employee list smoke test failed");
}

const employeeStats = await request(app).get("/api/v1/employees/stats").set(auth);
if (employeeStats.status !== 200 || employeeStats.body.data.headcount !== 50) {
  throw new Error("Employee stats smoke test failed");
}

const orgChart = await request(app).get("/api/v1/employees/org-chart").set(auth);
if (orgChart.status !== 200 || !Array.isArray(orgChart.body.data)) {
  throw new Error("Employee org chart smoke test failed");
}

const attendanceStats = await request(app).get("/api/v1/attendance/stats").set(auth);
if (attendanceStats.status !== 200 || attendanceStats.body.data.total < 1) {
  throw new Error("Attendance stats smoke test failed");
}

const shifts = await request(app).get("/api/v1/attendance/shifts").set(auth);
if (shifts.status !== 200 || shifts.body.meta.total < 1) {
  throw new Error("Attendance shifts smoke test failed");
}

const leaveStats = await request(app).get("/api/v1/leave/stats").set(auth);
if (leaveStats.status !== 200 || leaveStats.body.data.total < 1) {
  throw new Error("Leave stats smoke test failed");
}

const compOffStats = await request(app).get("/api/v1/comp-off/stats").set(auth);
if (compOffStats.status !== 200 || compOffStats.body.data.total < 1) {
  throw new Error("Comp-off stats smoke test failed");
}

const probationStats = await request(app).get("/api/v1/probation/stats").set(auth);
if (probationStats.status !== 200 || probationStats.body.data.total < 1) {
  throw new Error("Probation stats smoke test failed");
}

const probationDue = await request(app).get("/api/v1/probation/due").set(auth);
if (probationDue.status !== 200 || probationDue.body.meta.total < 1) {
  throw new Error("Probation due smoke test failed");
}

console.log("Smoke tests passed");
