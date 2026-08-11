import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import authRouter from "./routes/auth.js";
import rbacRouter from "./routes/rbac.js";
import dashboardRouter from "./routes/dashboard.js";
import employeeRouter from "./routes/employees.js";
import attendanceRouter from "./routes/attendance.js";
import leaveRouter from "./routes/leave.js";
import compOffRouter from "./routes/compOff.js";
import probationRouter from "./routes/probation.js";
import reportsRouter from "./routes/reports.js";
import { authenticate } from "./middleware/auth.js";
import { moduleRouter } from "./routes/crud.js";
import { moduleCatalog } from "./config/modules.js";

export const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_ORIGIN || "http://localhost:3000" }));
app.use(express.json({ limit: "10mb" }));
app.use(morgan("dev"));

app.get("/health", (req, res) => res.json({ status: "ok", service: "enterprise-hrms-api", version: "1.0.0" }));
app.use("/api/v1/auth", authRouter);

app.use("/api/v1", authenticate);
app.get("/api/v1/modules", (req, res) => {
  res.json({ data: moduleCatalog.filter((module) => module.readRoles.includes(req.user.role)) });
});
app.use("/api/v1/dashboard", dashboardRouter);
app.use("/api/v1/rbac", rbacRouter);
app.use("/api/v1/employees", employeeRouter);
app.use("/api/v1/attendance", attendanceRouter);
app.use("/api/v1/leave", leaveRouter);
app.use("/api/v1/comp-off", compOffRouter);
app.use("/api/v1/probation", probationRouter);
app.use("/api/v1/reports", reportsRouter);

for (const module of moduleCatalog) {
  if (["employees", "documents", "attendance", "attendanceRegularizations", "leaveRequests", "leaveBalances", "holidays", "compOffRequests", "probationReviews"].includes(module.key)) continue;
  app.use(`/api/v1${module.path}`, moduleRouter(module));
}

app.use((req, res) => res.status(404).json({ message: "Route not found" }));

const port = process.env.PORT || 4000;
if (process.env.NODE_ENV !== "test") {
  app.listen(port, () => console.log(`HRMS API running on http://localhost:${port}`));
}
