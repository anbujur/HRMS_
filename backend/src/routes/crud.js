import express from "express";
import { db, nextId, audit } from "../store.js";
import { authorizeModule } from "../middleware/auth.js";

function matchesQuery(item, req) {
  const search = String(req.query.search || "").toLowerCase();
  const status = req.query.status;
  const from = req.query.from ? new Date(String(req.query.from)) : null;
  const to = req.query.to ? new Date(String(req.query.to)) : null;
  const textMatch = !search || JSON.stringify(item).toLowerCase().includes(search);
  const statusMatch = !status || item.status === status || item.lifecycleStatus === status;
  const dateValue = item.createdAt || item.attendanceDate || item.fromDate || item.trainingDate || item.dueDate || item.expiresOn;
  const parsedDate = dateValue ? new Date(dateValue) : null;
  const fromMatch = !from || (parsedDate && parsedDate >= from);
  const toMatch = !to || (parsedDate && parsedDate <= to);
  return textMatch && statusMatch && fromMatch && toMatch;
}

function paginate(items, req) {
  const page = Math.max(Number(req.query.page || 1), 1);
  const pageSize = Math.min(Math.max(Number(req.query.pageSize || 20), 1), 100);
  const start = (page - 1) * pageSize;
  return {
    data: items.slice(start, start + pageSize),
    meta: { page, pageSize, total: items.length },
  };
}

export function moduleRouter(module) {
  const router = express.Router();

  router.get("/", authorizeModule(module, "read"), (req, res) => {
    const items = db[module.key].filter((item) => matchesQuery(item, req));
    res.json(paginate(items, req));
  });

  router.get("/:id", authorizeModule(module, "read"), (req, res) => {
    const item = db[module.key].find((entry) => String(entry.id) === String(req.params.id));
    if (!item) return res.status(404).json({ message: "Record not found" });
    return res.json({ data: item });
  });

  router.post("/", authorizeModule(module, "write"), (req, res) => {
    const item = { id: nextId(db[module.key]), ...req.body, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    db[module.key].push(item);
    audit(req.user, "CREATE", module.key, item.id, null, item);
    res.status(201).json({ data: item });
  });

  router.put("/:id", authorizeModule(module, "write"), (req, res) => {
    const index = db[module.key].findIndex((entry) => String(entry.id) === String(req.params.id));
    if (index === -1) return res.status(404).json({ message: "Record not found" });
    const oldValue = db[module.key][index];
    const nextValue = { ...oldValue, ...req.body, id: oldValue.id, updatedAt: new Date().toISOString() };
    db[module.key][index] = nextValue;
    audit(req.user, "UPDATE", module.key, nextValue.id, oldValue, nextValue);
    return res.json({ data: nextValue });
  });

  router.delete("/:id", authorizeModule({ ...module, writeRoles: ["SUPER_ADMIN", "HR_ADMIN"] }, "write"), (req, res) => {
    const index = db[module.key].findIndex((entry) => String(entry.id) === String(req.params.id));
    if (index === -1) return res.status(404).json({ message: "Record not found" });
    const oldValue = db[module.key][index];
    db[module.key][index] = { ...oldValue, deletedAt: new Date().toISOString() };
    audit(req.user, "SOFT_DELETE", module.key, oldValue.id, oldValue, db[module.key][index]);
    return res.status(204).send();
  });

  return router;
}
