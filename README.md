# Enterprise HRMS

Production-ready HRMS blueprint and application scaffold for a 50-employee organization, scalable to 500+ employees.

## Stack

- Frontend: Next.js, TypeScript, Tailwind CSS
- Backend: Node.js, Express
- Database: PostgreSQL
- Auth: JWT access tokens and refresh token rotation
- Storage: S3-compatible object storage metadata model
- Deployment: Docker Compose and Nginx

## Covered Lifecycle

- Pre-hire, onboarding, employee management, attendance, leave, comp-off, probation, performance, learning, policies, acknowledgements, certifications, self-service, manager portal, HR dashboard, exit management, reports, RBAC, audit logs, notifications, Excel/PDF-ready exports.

## Phase Documents

- `docs/BRD_FUNCTIONAL_REQUIREMENTS.md`
- `docs/SYSTEM_ARCHITECTURE.md`
- `docs/DATABASE_SCHEMA_ERD.md`
- `docs/WIREFRAMES.md`
- `docs/API_DESIGN.md`
- `docs/PROJECT_MEMORY.md`

## Demo Login

All demo accounts use `Password@123`.

| Role | Email |
| --- | --- |
| Super Admin | `super.admin@cuculus.example` |
| HR Admin | `hr.admin@cuculus.example` |
| Reporting Manager | `manager@cuculus.example` |
| Employee | `employee@cuculus.example` |
| Trainer | `trainer@cuculus.example` |
| Compliance Officer | `compliance@cuculus.example` |

## Run Locally

```bash
npm install
npm run dev
```

- Frontend: `http://localhost:3000`
- Backend: `http://localhost:4000`

## Docker

```bash
docker compose up --build
```

Nginx serves the app at `http://localhost:8080`.
