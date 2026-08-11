# HRMS Project Memory

This document is the canonical implementation memory for all future HRMS work. Any new module, table, endpoint, or screen must conform to this file before code is generated.

## Business Rules

- Organization starts at 50 employees and must scale to 500+ without schema redesign.
- One employee may have exactly one active reporting manager at a time, but reporting history is auditable through `employee_job_history`.
- Employee lifecycle states are `CANDIDATE`, `OFFERED`, `ONBOARDING`, `ACTIVE`, `PROBATION`, `CONFIRMED`, `NOTICE`, `EXITED`.
- Every employee-facing request must have an owner, status, timestamps, and audit trail.
- Files are stored in S3-compatible object storage; PostgreSQL stores metadata and object keys only.
- All mutable business records require `created_at`, `updated_at`, `created_by`, and `updated_by` when user-originated.
- All destructive actions use soft-delete (`deleted_at`) unless legally required purge is approved by Super Admin.
- Reports must use filters for date range, department, location, manager, employee status, and export type.

## Naming Conventions

- Database tables use plural `snake_case` names.
- Primary keys are `id UUID PRIMARY KEY`.
- Foreign keys use singular table name plus `_id`, for example `employee_id`.
- API paths use kebab-case resource names under `/api/v1`.
- TypeScript types and React components use `PascalCase`.
- Variables, functions, and JSON fields use `camelCase`.
- Role constants use uppercase snake case: `SUPER_ADMIN`, `HR_ADMIN`, `REPORTING_MANAGER`, `EMPLOYEE`, `TRAINER`, `COMPLIANCE_OFFICER`.

## Database Standards

- PostgreSQL is the system of record.
- UUIDs are generated through `gen_random_uuid()`.
- Use lookup/config tables for extensible rules: leave types, workflow definitions, policy categories, training categories.
- Use JSONB only for flexible metadata, not for core relational attributes.
- Add indexes on all foreign keys, status fields used in dashboards, and date fields used in reports.
- Add unique constraints for employee codes, official emails, policy version pairs, and attendance employee/date rows.
- Keep recruitment, employee master, attendance, leave, learning, compliance, and exit data in separate tables; do not duplicate employee attributes.

## Approval Workflows

- Workflow statuses: `DRAFT`, `SUBMITTED`, `PENDING_MANAGER`, `PENDING_HR`, `PENDING_COMPLIANCE`, `APPROVED`, `REJECTED`, `CANCELLED`, `CLOSED`.
- Reporting Manager approves employee leave, attendance regularization, comp-off, probation recommendation, and team performance feedback.
- HR Admin approves employee creation, onboarding closure, leave overrides, policy assignment, probation confirmation, exit closure, and master data.
- Compliance Officer approves policy exceptions, statutory compliance tasks, certifications requiring evidence, and compliance dashboards.
- Super Admin manages tenant/system configuration and may override any workflow with audit reason.
- All approvals require actor, action, comments, action timestamp, old status, and new status in `approval_actions`.

## Leave Rules

- Casual Leave, Sick Leave, Earned Leave, and Comp-Off are mandatory leave types.
- Leave can be full-day or half-day.
- Leave balance is tracked in `leave_balances`; transactions are tracked in `leave_ledger`.
- Earned Leave accrues monthly unless configured otherwise in `leave_accrual_rules`.
- Sick Leave and Casual Leave may be front-loaded annually or accrued monthly based on rule config.
- Comp-Off expires according to `comp_off_requests.expires_on`; expired balances cannot be utilized.
- Holidays are maintained per location in `holiday_calendars`.
- Leave cancellation reverses ledger entries only after approval if original request was approved.

## Probation Rules

- Probation reviews occur at 30, 60, and 90 days from joining date.
- Review outcomes are `CONTINUE`, `CONFIRM`, `EXTEND`, `TERMINATE`.
- Confirmation requires manager recommendation and HR approval.
- Extension requires reason, revised end date, and HR approval.
- Probation records must be visible in Manager Portal and HR Dashboard.

## Compliance Rules

- Policies must have version number, effective date, owner, review date, and status.
- Employees must acknowledge assigned policies digitally with timestamp and IP/user-agent metadata where available.
- Mandatory training and policy compliance are measured by assigned population versus completed/acknowledged count.
- Certification expiry reminders are generated before 90, 60, 30, 15, and 7 days.
- Compliance dashboards must show overdue policy acknowledgements, expired certifications, and pending statutory tasks.
