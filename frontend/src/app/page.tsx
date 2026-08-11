"use client";

import { useMemo, useState } from "react";
import { Download, Filter, LogOut, Menu, Plus, Search, Sparkles } from "lucide-react";
import { Module, Role, demoRows, modules, roles } from "@/lib/hrms";

const roleOrder = Object.keys(roles) as Role[];

function statusClass(status: string) {
  if (status.includes("APPROVED") || status.includes("VALID")) return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  if (status.includes("PENDING") || status.includes("EXPIRING")) return "bg-amber-50 text-amber-700 ring-amber-200";
  return "bg-slate-100 text-slate-700 ring-slate-200";
}

function exportCsv(rows: Record<string, string>[], fileName: string) {
  const headers = Object.keys(rows[0] ?? {});
  const csv = [headers.join(","), ...rows.map((row) => headers.map((header) => `"${String(row[header]).replaceAll('"', '""')}"`).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

export default function Home() {
  const [role, setRole] = useState<Role>("HR_ADMIN");
  const [activeId, setActiveId] = useState("dashboard");
  const [query, setQuery] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);

  const allowedModules = useMemo(() => modules.filter((module) => module.roles.includes(role)), [role]);
  const activeModule = allowedModules.find((module) => module.id === activeId) ?? allowedModules[0];
  const filteredModules = allowedModules.filter((module) => `${module.label} ${module.description} ${module.domain}`.toLowerCase().includes(query.toLowerCase()));

  function changeRole(nextRole: Role) {
    setRole(nextRole);
    const firstModule = modules.find((module) => module.roles.includes(nextRole));
    setActiveId(firstModule?.id ?? "dashboard");
  }

  return (
    <main className="min-h-screen bg-slate-100">
      <aside className={`fixed inset-y-0 left-0 z-30 w-80 border-r border-slate-200 bg-white p-4 shadow-xl transition lg:translate-x-0 ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="mb-6 flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-brand-600 text-lg font-black text-white">HR</div>
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-brand-600">Enterprise HRMS</p>
            <h1 className="text-lg font-black text-slate-950">People Cloud</h1>
          </div>
        </div>

        <label className="mb-4 block text-sm font-semibold text-slate-700">
          Role workspace
          <select className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm focus-ring" value={role} onChange={(event) => changeRole(event.target.value as Role)}>
            {roleOrder.map((roleKey) => (
              <option key={roleKey} value={roleKey}>{roles[roleKey]}</option>
            ))}
          </select>
        </label>

        <nav className="space-y-2 overflow-y-auto pb-24">
          {allowedModules.map((module) => {
            const Icon = module.icon;
            return (
              <button
                key={module.id}
                className={`flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm font-semibold transition focus-ring ${
                  activeModule.id === module.id ? "bg-brand-600 text-white shadow-lg shadow-brand-600/20" : "text-slate-700 hover:bg-slate-100"
                }`}
                onClick={() => {
                  setActiveId(module.id);
                  setMobileOpen(false);
                }}
              >
                <Icon size={18} />
                <span>{module.label}</span>
              </button>
            );
          })}
        </nav>
      </aside>

      <section className="lg:pl-80">
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur lg:px-8">
          <div className="flex flex-wrap items-center gap-3">
            <button className="rounded-xl border border-slate-200 p-3 lg:hidden" onClick={() => setMobileOpen(!mobileOpen)} aria-label="Open navigation">
              <Menu size={18} />
            </button>
            <div className="relative min-w-[260px] flex-1">
              <Search className="absolute left-4 top-3.5 text-slate-400" size={18} />
              <input
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm focus-ring"
                placeholder="Search modules, workflows, reports..."
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>
            <button className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-ring">
              <Filter className="mr-2 inline" size={16} /> Filters
            </button>
            <button className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800 focus-ring" onClick={() => exportCsv(demoRows, "hrms-workflow-queue.csv")}>
              <Download className="mr-2 inline" size={16} /> Excel
            </button>
            <button className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-ring">
              <LogOut className="mr-2 inline" size={16} /> Logout
            </button>
          </div>
        </header>

        <div className="p-4 lg:p-8">
          <section className="mb-6 overflow-hidden rounded-3xl bg-gradient-to-br from-brand-900 via-brand-600 to-cyan-500 p-6 text-white shadow-xl">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="mb-3 inline-flex rounded-full bg-white/15 px-3 py-1 text-xs font-bold uppercase tracking-wide ring-1 ring-white/20">
                  {roles[role]} Workspace
                </p>
                <h2 className="text-3xl font-black tracking-tight lg:text-5xl">{activeModule.label}</h2>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-blue-50 lg:text-base">{activeModule.description}</p>
              </div>
              <button className="w-fit rounded-2xl bg-white px-5 py-3 text-sm font-black text-brand-900 shadow-lg focus-ring">
                <Plus className="mr-2 inline" size={16} /> New Workflow
              </button>
            </div>
          </section>

          <section className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {activeModule.metrics.map((metric) => (
              <article key={metric} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-sm font-semibold text-slate-500">{activeModule.domain}</p>
                <strong className="mt-2 block text-2xl font-black text-slate-950">{metric}</strong>
              </article>
            ))}
          </section>

          <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
            <ModuleWorkspace activeModule={activeModule} visibleModules={filteredModules} />
            <WorkflowQueue />
          </div>
        </div>
      </section>
    </main>
  );
}

function ModuleWorkspace({ activeModule, visibleModules }: { activeModule: Module; visibleModules: Module[] }) {
  return (
    <section className="space-y-6">
      <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h3 className="text-xl font-black text-slate-950">Functional Coverage</h3>
            <p className="text-sm text-slate-500">End-to-end features mapped from BRD to UI, API, and database.</p>
          </div>
          <Sparkles className="text-brand-600" />
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {activeModule.fields.map((field) => (
            <div key={field} className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Core Data</p>
              <p className="mt-1 font-black text-slate-800">{field}</p>
            </div>
          ))}
        </div>
      </article>

      <article className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-5">
          <h3 className="text-xl font-black text-slate-950">Module Registry</h3>
          <p className="text-sm text-slate-500">Role-filtered modules prevent duplicate functionality and keep navigation aligned with the architecture.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="p-4">Module</th>
                <th className="p-4">Domain</th>
                <th className="p-4">Primary Metrics</th>
                <th className="p-4">Roles</th>
              </tr>
            </thead>
            <tbody>
              {visibleModules.map((module) => (
                <tr key={module.id} className="border-t border-slate-100">
                  <td className="p-4 font-bold text-slate-900">{module.label}</td>
                  <td className="p-4 text-slate-600">{module.domain}</td>
                  <td className="p-4 text-slate-600">{module.metrics.join(" · ")}</td>
                  <td className="p-4 text-slate-600">{module.roles.length} roles</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>
    </section>
  );
}

function WorkflowQueue() {
  return (
    <aside className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4">
        <h3 className="text-xl font-black text-slate-950">Approval Queue</h3>
        <p className="text-sm text-slate-500">Shared workflow model for leave, attendance, probation, policies, certifications, and exits.</p>
      </div>
      <div className="space-y-3">
        {demoRows.map((row) => (
          <article key={`${row.employee}-${row.module}`} className="rounded-2xl border border-slate-100 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-black text-slate-900">{row.employee}</p>
                <p className="text-sm text-slate-500">{row.module} · {row.request}</p>
              </div>
              <span className={`rounded-full px-2.5 py-1 text-xs font-black ring-1 ${statusClass(row.status)}`}>{row.status}</span>
            </div>
            <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Owner: {row.owner}</p>
          </article>
        ))}
      </div>
    </aside>
  );
}
