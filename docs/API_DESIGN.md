# HRMS REST API Specifications

Base URL: `/api/v1`

Authentication uses JWT access tokens and refresh token rotation. All protected endpoints require:

```http
Authorization: Bearer <accessToken>
Content-Type: application/json
```

## 1. API Standards

### 1.1 Response Envelope

List response:

```json
{
  "data": [],
  "meta": {
    "page": 1,
    "pageSize": 20,
    "total": 0
  }
}
```

Single resource response:

```json
{
  "data": {
    "id": "uuid"
  }
}
```

Action response:

```json
{
  "data": {
    "success": true,
    "message": "Action completed successfully"
  }
}
```

Error response:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      {
        "field": "fromDate",
        "message": "fromDate is required"
      }
    ],
    "requestId": "req_123456"
  }
}
```

### 1.2 Common Query Parameters

All list endpoints should support applicable filters:

| Parameter | Type | Description |
| --- | --- | --- |
| `page` | number | Page number, default `1` |
| `pageSize` | number | Page size, default `20`, max `100` |
| `search` | string | Full-text style search |
| `status` | string | Workflow/status filter |
| `from` | ISO date | Start date filter |
| `to` | ISO date | End date filter |
| `departmentId` | UUID | Department filter |
| `designationId` | UUID | Designation filter |
| `managerId` | UUID | Reporting manager filter |
| `employeeId` | UUID | Employee filter |
| `location` | string | Location filter |
| `sortBy` | string | Sort field |
| `sortOrder` | `asc` or `desc` | Sort direction |

### 1.3 Demo Users

All demo users use password `Password@123`.

| Role | Email |
| --- | --- |
| Super Admin | `super.admin@cuculus.example` |
| HR Admin | `hr.admin@cuculus.example` |
| Reporting Manager | `manager@cuculus.example` |
| Employee | `employee@cuculus.example` |
| Trainer | `trainer@cuculus.example` |
| Compliance Officer | `compliance@cuculus.example` |

## 2. Permissions Model

| Role | API Permission Scope |
| --- | --- |
| `SUPER_ADMIN` | Platform configuration, audit logs, override actions, all read access |
| `HR_ADMIN` | HR lifecycle administration, employees, leave rules, onboarding, exits, reports |
| `REPORTING_MANAGER` | Assigned team records, approvals, probation, team reports |
| `EMPLOYEE` | Own self-service data, requests, documents, policies, trainings |
| `TRAINER` | Training, sessions, attendance, completions, certificates |
| `COMPLIANCE_OFFICER` | Policies, certifications, compliance tasks, compliance reports |

### 2.1 Permission Rules

- API authorization is authoritative; UI hiding is not sufficient.
- Employee role can only access own records unless explicitly allowed.
- Manager role can only access assigned team records.
- HR Admin can administer employee lifecycle records.
- Compliance Officer can access compliance data but not unrestricted compensation data.
- Super Admin override actions require comments and audit logging.

## 3. Authentication Endpoints

### `POST /auth/login`

Authenticates a user and returns access and refresh tokens.

Permissions: Public

Request:

```json
{
  "email": "hr.admin@cuculus.example",
  "password": "Password@123"
}
```

Response:

```json
{
  "accessToken": "jwt-access-token",
  "refreshToken": "jwt-refresh-token",
  "user": {
    "id": "u-hr-admin",
    "employeeId": 11,
    "name": "Doris Anna T",
    "email": "hr.admin@cuculus.example",
    "role": "HR_ADMIN"
  }
}
```

Validation:

- `email` is required and must be a valid email.
- `password` is required.
- User must be active.

Errors:

- `401 INVALID_CREDENTIALS`
- `403 USER_INACTIVE`

### `POST /auth/refresh`

Rotates refresh token and returns a new session.

Permissions: Public with valid refresh token

Request:

```json
{
  "refreshToken": "jwt-refresh-token"
}
```

Response:

```json
{
  "accessToken": "new-access-token",
  "refreshToken": "new-refresh-token",
  "user": {
    "id": "u-employee",
    "name": "Aakansha Yadav",
    "role": "EMPLOYEE"
  }
}
```

Validation:

- `refreshToken` is required.
- Token must be valid, unexpired, and not revoked.

### `POST /auth/logout`

Revokes the supplied refresh token.

Permissions: Authenticated

Request:

```json
{
  "refreshToken": "jwt-refresh-token"
}
```

Response: `204 No Content`

### `GET /auth/me`

Returns current authenticated user.

Permissions: Authenticated

Response:

```json
{
  "user": {
    "sub": "u-hr-admin",
    "role": "HR_ADMIN",
    "name": "Doris Anna T",
    "email": "hr.admin@cuculus.example",
    "employeeId": 11
  }
}
```

## 4. System and Dashboard Endpoints

| Method | Endpoint | Permissions | Purpose |
| --- | --- | --- | --- |
| GET | `/modules` | Authenticated | Returns modules visible to current role |
| GET | `/dashboard` | Authenticated | Returns role-filtered dashboard metrics |
| GET | `/rbac/me` | Authenticated | Returns current user's role, permissions, and module access |
| GET | `/rbac/roles` | `rbac.read` | Returns role definitions and assigned permissions |
| GET | `/rbac/permissions` | `rbac.read` | Returns permission catalog |
| GET | `/rbac/matrix` | `rbac.read` | Returns role-to-module permission matrix |
| GET | `/notifications` | Authenticated | User notifications |
| PUT | `/notifications/:id/read` | Authenticated owner | Mark notification read |

### `GET /dashboard`

Response:

```json
{
  "data": {
    "headcount": 50,
    "active": 48,
    "exited": 2,
    "pendingApprovals": 7,
    "attendanceAnalytics": {
      "presentToday": 30,
      "wfhToday": 7,
      "missingCheckout": 2
    },
    "leaveAnalytics": {
      "pending": 3,
      "approved": 1
    },
    "trainingCompliance": {
      "mandatoryCompletion": 72,
      "pendingAssignments": 4
    },
    "policyCompliance": {
      "acknowledged": 42,
      "pending": 8
    }
  }
}
```

Permissions:

- HR Admin sees organization-wide metrics.
- Manager sees team-scoped metrics.
- Employee sees own metrics.
- Compliance Officer sees compliance metrics.
- Trainer sees learning metrics.

### `GET /rbac/me`

Returns the authenticated user's effective permissions and visible modules.

Permissions: Authenticated

Response:

```json
{
  "data": {
    "role": "HR_ADMIN",
    "permissions": [
      "auth.session.read",
      "rbac.read",
      "audit.read",
      "report.export",
      "approval.override"
    ],
    "modules": [
      {
        "key": "employees",
        "label": "Employee Master",
        "domain": "Employee Management",
        "path": "/employees",
        "canRead": true,
        "canWrite": true
      }
    ]
  }
}
```

### `GET /rbac/matrix`

Returns the complete role-to-permission and role-to-module access matrix.

Permissions: `rbac.read`

Response:

```json
{
  "data": [
    {
      "role": "HR_ADMIN",
      "label": "HR Admin",
      "permissions": ["auth.session.read", "rbac.read"],
      "modules": [
        {
          "key": "employees",
          "canRead": true,
          "canWrite": true
        }
      ]
    }
  ]
}
```

Validation:

- Caller must have `rbac.read`.
- Permissions are computed from server-side role mappings.

## 5. Recruitment API

### 5.1 Endpoints

| Method | Endpoint | Permissions | Purpose |
| --- | --- | --- | --- |
| GET | `/recruitment/requisitions` | HR Admin, Manager | List requisitions |
| POST | `/recruitment/requisitions` | HR Admin, Manager | Create requisition |
| GET | `/recruitment/requisitions/:id` | HR Admin, Manager | View requisition |
| PUT | `/recruitment/requisitions/:id` | HR Admin, Manager | Update requisition |
| DELETE | `/recruitment/requisitions/:id` | HR Admin | Soft-delete requisition |
| GET | `/recruitment/candidates` | HR Admin, Manager | List candidates |
| POST | `/recruitment/candidates` | HR Admin, Manager | Create candidate |
| GET | `/recruitment/interviews` | HR Admin, Manager | List interviews |
| POST | `/recruitment/interviews` | HR Admin, Manager | Schedule interview |
| GET | `/recruitment/offers` | HR Admin, Manager | List offers |
| POST | `/recruitment/offers` | HR Admin | Create offer |

### 5.2 Create Requisition Payload

```json
{
  "title": "Senior Product Support Engineer",
  "departmentId": "uuid",
  "designationId": "uuid",
  "openings": 2,
  "hiringManagerId": "uuid",
  "targetJoiningDate": "2026-08-01",
  "status": "SUBMITTED"
}
```

Validation:

- `title`, `departmentId`, `openings`, and `hiringManagerId` are required.
- `openings` must be greater than `0`.
- `targetJoiningDate` cannot be in the past for new requisitions.

### 5.3 Candidate Payload

```json
{
  "requisitionId": "uuid",
  "fullName": "Riya Mehta",
  "email": "riya.mehta@example.com",
  "phone": "+91 9000011111",
  "source": "Referral",
  "stage": "SCREENING",
  "rating": 4.2,
  "resumeStorageKey": "resumes/riya-mehta.pdf"
}
```

Validation:

- `fullName` is required.
- Either `email` or `phone` is required.
- `rating` must be between `0` and `5` when supplied.

## 6. Onboarding API

| Method | Endpoint | Permissions | Purpose |
| --- | --- | --- | --- |
| GET | `/onboarding/tasks` | HR Admin, Manager, Employee, Trainer, Compliance Officer | List onboarding tasks |
| POST | `/onboarding/tasks` | HR Admin, Manager | Create onboarding task |
| PUT | `/onboarding/tasks/:id` | HR Admin, Manager, assigned owner | Update task |
| GET | `/onboarding/document-checklists` | HR Admin, Employee | List document checklist |
| POST | `/onboarding/document-checklists` | HR Admin | Create checklist item |

Task payload:

```json
{
  "employeeId": "uuid",
  "taskName": "Submit identity documents",
  "taskType": "DOCUMENT",
  "ownerRole": "EMPLOYEE",
  "dueDate": "2026-07-01",
  "status": "SUBMITTED"
}
```

Validation:

- `employeeId`, `taskName`, `taskType`, `ownerRole`, and `dueDate` are required.
- `ownerRole` must be one of the supported roles.
- `dueDate` must be on or after task creation date.

## 7. Employee Management API

### 7.1 Endpoints

| Method | Endpoint | Permissions | Purpose |
| --- | --- | --- | --- |
| GET | `/employees` | HR Admin, Manager, Employee self | List employees by scope |
| POST | `/employees` | HR Admin | Create employee |
| GET | `/employees/directory` | HR Admin, Manager, Employee self | Employee directory |
| GET | `/employees/stats` | HR Admin, Manager | Employee statistics |
| GET | `/employees/org-chart` | HR Admin, Manager, Employee | Organization chart |
| GET | `/employees/documents` | HR Admin, Compliance Officer | Employee document register |
| GET | `/employees/:id` | HR Admin, Manager team, Employee self | Employee profile |
| PUT | `/employees/:id` | HR Admin | Update employee |
| DELETE | `/employees/:id` | HR Admin | Soft-delete employee |
| GET | `/employees/:id/documents` | HR Admin, Manager team, Employee self, Compliance Officer | Employee documents |
| POST | `/employees/:id/documents` | HR Admin, Employee self | Upload document metadata |
| GET | `/employees/:id/job-history` | HR Admin, Manager team, Employee self | Employee job history |
| GET | `/departments` | HR Admin, Super Admin | List departments |
| POST | `/departments` | HR Admin, Super Admin | Create department |
| GET | `/designations` | HR Admin, Super Admin | List designations |
| POST | `/designations` | HR Admin, Super Admin | Create designation |

### 7.2 Employee Create Payload

```json
{
  "employeeCode": "CCI-1101",
  "officialEmail": "employee@company.com",
  "fullName": "Aakansha Yadav",
  "gender": "Female",
  "dateOfBirth": "1994-02-14",
  "personalEmail": "aakansha@example.com",
  "mobileNumber": "+91 9000012345",
  "joiningDate": "2026-07-01",
  "employeeType": "Full Time",
  "departmentId": "uuid",
  "designationId": "uuid",
  "reportingManagerId": "uuid",
  "location": "Bengaluru",
  "legalEntity": "Cuculus India",
  "lifecycleStatus": "ACTIVE"
}
```

Validation:

- `employeeCode`, `fullName`, `joiningDate`, `departmentId`, and `designationId` are required.
- `employeeCode` and `officialEmail` must be unique.
- `reportingManagerId` cannot equal employee `id`.
- `joiningDate` must be valid ISO date.

### 7.3 Document Metadata Payload

```json
{
  "documentType": "Passport",
  "fileName": "passport.pdf",
  "storageKey": "employees/CCI-1101/passport.pdf",
  "mimeType": "application/pdf",
  "issueDate": "2024-01-01",
  "expiryDate": "2034-01-01"
}
```

Validation:

- `documentType`, `fileName`, and `storageKey` are required.
- `expiryDate` must be after `issueDate` when both are provided.
- `mimeType` must be in allowed file MIME types.

## 8. Attendance API

| Method | Endpoint | Permissions | Purpose |
| --- | --- | --- | --- |
| GET | `/attendance/entries` | HR Admin, Manager team, Employee self | List attendance |
| GET | `/attendance/today` | Employee self, HR Admin, Manager team | Current date attendance |
| GET | `/attendance/stats` | HR Admin, Manager | Attendance statistics |
| POST | `/attendance/check-in` | Employee | Check in |
| POST | `/attendance/check-out` | Employee | Check out |
| POST | `/attendance/regularizations` | Employee | Submit correction |
| PUT | `/attendance/regularizations/:id` | Manager, HR Admin | Approve/reject correction |
| GET | `/attendance/shifts` | HR Admin, Manager, Employee | List shifts |
| POST | `/attendance/shifts` | HR Admin | Create shift |
| GET | `/attendance/shift-assignments` | HR Admin, Manager | List shift assignments |
| POST | `/attendance/shift-assignments` | HR Admin | Assign shift |
| GET | `/attendance/reports/daily` | HR Admin, Manager | Daily attendance report |

Check-in payload:

```json
{
  "mode": "OFFICE",
  "timestamp": "2026-06-20T09:30:00.000Z",
  "location": "Bengaluru"
}
```

Regularization payload:

```json
{
  "attendanceEntryId": "uuid",
  "employeeId": "uuid",
  "reason": "Forgot checkout due to client call",
  "requestedCheckIn": "2026-06-20T09:30:00.000Z",
  "requestedCheckOut": "2026-06-20T18:30:00.000Z"
}
```

Validation:

- One attendance entry per employee per date.
- `checkOut` must be after `checkIn`.
- Regularization requires `reason`.
- Employee can only regularize own attendance.
- Rejected regularization requires comments.
- Shift creation requires `name`, `startsAt`, and `endsAt`.

## 9. Leave and Comp-Off API

### 9.1 Leave Endpoints

| Method | Endpoint | Permissions | Purpose |
| --- | --- | --- | --- |
| GET | `/leave/types` | HR Admin, Manager, Employee | List leave types |
| POST | `/leave/types` | HR Admin | Create leave type |
| GET | `/leave/accrual-rules` | HR Admin | List accrual rules |
| POST | `/leave/accrual-rules` | HR Admin | Create accrual rule |
| GET | `/leave/balances` | HR Admin, Manager team, Employee self | Leave balances |
| GET | `/leave/requests` | HR Admin, Manager team, Employee self | List leave requests |
| POST | `/leave/requests` | Employee, HR Admin | Submit leave |
| PUT | `/leave/requests/:id` | Manager, HR Admin | Approve/reject/update leave |
| GET | `/leave/holidays` | Authenticated | List holidays |
| POST | `/leave/holidays` | HR Admin | Create holiday |

Leave request payload:

```json
{
  "employeeId": "uuid",
  "leaveTypeId": "uuid",
  "fromDate": "2026-06-25",
  "toDate": "2026-06-27",
  "days": 3,
  "reason": "Planned family travel"
}
```

Validation:

- `employeeId`, `leaveTypeId`, `fromDate`, `toDate`, and `days` are required.
- `toDate` must be on or after `fromDate`.
- `days` must be greater than `0`.
- Employee must have sufficient balance unless HR override is used.
- Sick leave may require document if leave type requires it.

### 9.2 Comp-Off Endpoints

| Method | Endpoint | Permissions | Purpose |
| --- | --- | --- | --- |
| GET | `/comp-off/requests` | HR Admin, Manager team, Employee self | List comp-off |
| POST | `/comp-off/requests` | Employee, HR Admin | Request comp-off |
| PUT | `/comp-off/requests/:id` | Manager, HR Admin | Approve/reject/update |
| GET | `/comp-off/utilizations` | HR Admin, Employee self | Utilization details |
| GET | `/comp-off/stats` | HR Admin, Manager | Comp-off summary |

Comp-off payload:

```json
{
  "employeeId": "uuid",
  "sourceWorkDate": "2026-06-15",
  "earnedDays": 1,
  "expiresOn": "2026-09-15",
  "reason": "Weekend deployment"
}
```

Validation:

- `sourceWorkDate`, `earnedDays`, `expiresOn`, and `reason` are required.
- `earnedDays` must be greater than `0`.
- `expiresOn` must be after `sourceWorkDate`.

## 10. Probation API

| Method | Endpoint | Permissions | Purpose |
| --- | --- | --- | --- |
| GET | `/probation/reviews` | HR Admin, Manager | List reviews |
| POST | `/probation/reviews` | HR Admin | Create review |
| GET | `/probation/reviews/:id` | HR Admin, Manager | Review details |
| PUT | `/probation/reviews/:id/manager-review` | Manager, HR Admin | Submit manager feedback |
| PUT | `/probation/reviews/:id/hr-decision` | HR Admin | Submit HR decision |
| GET | `/probation/stats` | HR Admin, Manager | Probation summary |
| GET | `/probation/timeline/:employeeId` | HR Admin, Manager | Employee probation timeline |
| GET | `/probation/due` | HR Admin, Manager | Reviews due soon |

Payload:

```json
{
  "employeeId": "uuid",
  "reviewDay": 30,
  "dueDate": "2026-07-30",
  "managerFeedback": "Good progress on role expectations",
  "outcome": "CONTINUE",
  "status": "PENDING_HR"
}
```

Validation:

- `reviewDay` must be `30`, `60`, or `90`.
- One review per employee per review day.
- HR decision requires manager feedback unless overridden.

## 11. Performance API

| Method | Endpoint | Permissions | Purpose |
| --- | --- | --- | --- |
| GET | `/performance/cycles` | HR Admin, Manager, Employee | List cycles |
| POST | `/performance/cycles` | HR Admin | Create cycle |
| GET | `/performance/goals` | HR Admin, Manager team, Employee self | List goals |
| POST | `/performance/goals` | Manager, Employee | Create goal |
| GET | `/performance/kpis` | HR Admin, Manager team, Employee self | List KPIs |
| POST | `/performance/kpis` | Manager, Employee | Create KPI |
| GET | `/performance/reviews` | HR Admin, Manager team, Employee self | List reviews |
| PUT | `/performance/reviews/:id` | HR Admin, Manager, Employee self | Submit review step |

Goal payload:

```json
{
  "employeeId": "uuid",
  "cycleId": "uuid",
  "title": "Improve first response SLA",
  "description": "Reduce average first response time by 15%",
  "weight": 30
}
```

Validation:

- Goal weights per employee/cycle should total `100`.
- KPI score must be numeric when supplied.
- Employee can edit self goals only before manager approval.

## 12. Learning API

| Method | Endpoint | Permissions | Purpose |
| --- | --- | --- | --- |
| GET | `/learning/trainings` | HR Admin, Trainer, Manager, Employee | List trainings |
| POST | `/learning/trainings` | HR Admin, Trainer | Create training |
| GET | `/learning/sessions` | HR Admin, Trainer, Employee | List sessions |
| POST | `/learning/sessions` | HR Admin, Trainer | Create session |
| GET | `/learning/assignments` | HR Admin, Trainer, Manager, Employee | List assignments |
| POST | `/learning/assignments` | HR Admin, Trainer | Assign training |
| PUT | `/learning/assignments/:id` | Trainer, HR Admin | Update completion |
| GET | `/learning/certificates` | HR Admin, Trainer, Employee | List certificates |

Training payload:

```json
{
  "title": "Data Privacy and Labour Compliance",
  "category": "Mandatory",
  "isMandatory": true,
  "audienceRule": {
    "type": "ALL_EMPLOYEES"
  },
  "ownerId": "uuid"
}
```

Validation:

- `title` and `category` are required.
- Session `endsAt` must be after `startsAt`.
- Assignment must not duplicate `trainingId` and `employeeId`.

## 13. Policy and Compliance API

### 13.1 Policy Endpoints

| Method | Endpoint | Permissions | Purpose |
| --- | --- | --- | --- |
| GET | `/policies` | HR Admin, Compliance Officer, Manager, Employee | List policies |
| POST | `/policies` | HR Admin, Compliance Officer | Create policy |
| GET | `/policies/:id/versions` | HR Admin, Compliance Officer, Employee | List versions |
| POST | `/policies/:id/versions` | HR Admin, Compliance Officer | Create version |
| GET | `/policies/assignments` | HR Admin, Compliance Officer, Manager, Employee | List assignments |
| POST | `/policies/assignments` | HR Admin, Compliance Officer | Assign policy |
| POST | `/policies/acknowledgements` | Employee | Acknowledge policy |

Policy acknowledgement payload:

```json
{
  "policyAssignmentId": "uuid",
  "employeeId": "uuid",
  "accepted": true
}
```

Validation:

- `accepted` must be `true`.
- Employee can only acknowledge own assignment.
- Duplicate acknowledgement for same assignment/employee is not allowed.

### 13.2 Compliance Endpoints

| Method | Endpoint | Permissions | Purpose |
| --- | --- | --- | --- |
| GET | `/compliance/tasks` | HR Admin, Compliance Officer | List tasks |
| POST | `/compliance/tasks` | HR Admin, Compliance Officer | Create task |
| PUT | `/compliance/tasks/:id` | HR Admin, Compliance Officer | Update task |
| GET | `/compliance/certifications` | HR Admin, Compliance Officer, Manager team, Employee self | List certifications |
| POST | `/compliance/certifications` | HR Admin, Compliance Officer, Employee | Create certification |
| PUT | `/compliance/certifications/:id` | HR Admin, Compliance Officer | Verify/update certification |
| GET | `/compliance/dashboard` | HR Admin, Compliance Officer | Compliance metrics |

Certification payload:

```json
{
  "employeeId": "uuid",
  "certificationName": "AWS Solutions Architect",
  "issuer": "AWS",
  "issuedOn": "2025-09-01",
  "expiresOn": "2026-09-01",
  "certificateStorageKey": "certifications/aws-sa.pdf"
}
```

Validation:

- `employeeId`, `certificationName`, and `expiresOn` are required.
- `expiresOn` must be after `issuedOn` when issued date is supplied.

## 14. Manager Portal API

| Method | Endpoint | Permissions | Purpose |
| --- | --- | --- | --- |
| GET | `/manager/team-attendance` | Reporting Manager | Team attendance |
| GET | `/manager/team-leave` | Reporting Manager | Team leave status |
| GET | `/manager/team-performance` | Reporting Manager | Team performance status |
| GET | `/manager/team-compliance` | Reporting Manager | Team compliance status |
| GET | `/manager/approvals` | Reporting Manager | Consolidated approval queue |

Response:

```json
{
  "data": {
    "teamSize": 12,
    "pendingApprovals": 4,
    "attendanceGaps": 2,
    "probationDue": 1,
    "trainingCompliance": 84,
    "policyCompliance": 91
  }
}
```

## 15. Self-Service API

| Method | Endpoint | Permissions | Purpose |
| --- | --- | --- | --- |
| GET | `/self-service/profile` | Employee | Own profile |
| PUT | `/self-service/profile` | Employee | Request profile update |
| GET | `/self-service/requests` | Employee | Own requests |
| POST | `/self-service/requests` | Employee | Create generic request |
| GET | `/self-service/documents` | Employee | Own documents |
| POST | `/self-service/documents` | Employee | Upload document metadata |

Generic request payload:

```json
{
  "requestType": "PROFILE_UPDATE",
  "payload": {
    "mobileNumber": "+91 9000012345",
    "address": "Updated address"
  },
  "reason": "Personal details changed"
}
```

Validation:

- `requestType` and `reason` are required.
- Payload fields must match allowed self-service update fields.

## 16. Exit API

| Method | Endpoint | Permissions | Purpose |
| --- | --- | --- | --- |
| GET | `/exits/resignations` | HR Admin, Manager team, Employee self | List resignations |
| POST | `/exits/resignations` | Employee, HR Admin | Submit resignation |
| PUT | `/exits/resignations/:id` | Manager, HR Admin | Review/update resignation |
| GET | `/exits/checklists` | HR Admin, Manager | Exit checklist |
| POST | `/exits/checklists` | HR Admin | Create checklist item |
| GET | `/exits/assets` | HR Admin | Asset recovery |
| PUT | `/exits/assets/:id` | HR Admin | Update recovery |
| GET | `/exits/knowledge-transfer` | HR Admin, Manager | KT status |
| PUT | `/exits/knowledge-transfer/:id` | Manager, HR Admin | Update KT |
| GET | `/exits/fnf` | HR Admin | F&F tracking |
| PUT | `/exits/fnf/:id` | HR Admin | Update settlement |

Resignation payload:

```json
{
  "employeeId": "uuid",
  "resignationDate": "2026-06-20",
  "requestedLastWorkingDay": "2026-07-20",
  "reason": "Personal reasons"
}
```

Validation:

- `resignationDate`, `requestedLastWorkingDay`, and `reason` are required.
- Requested last working day must be after resignation date.
- Employee can have only one active resignation workflow.

## 17. Reports API

| Method | Endpoint | Permissions | Purpose |
| --- | --- | --- | --- |
| GET | `/reports` | HR Admin, Manager, Trainer, Compliance Officer | List accessible reports |
| GET | `/reports/attendance` | HR Admin, Manager | Attendance report |
| GET | `/reports/leave` | HR Admin, Manager | Leave report |
| GET | `/reports/headcount` | HR Admin | Headcount report |
| GET | `/reports/attrition` | HR Admin | Attrition report |
| GET | `/reports/probation` | HR Admin, Manager | Probation report |
| GET | `/reports/training` | HR Admin, Trainer, Manager | Training report |
| GET | `/reports/policyCompliance` | HR Admin, Compliance Officer, Manager | Policy compliance report |
| GET | `/reports/certifications` | HR Admin, Compliance Officer | Certification report |

Query example:

```http
GET /api/v1/reports/leave?from=2026-06-01&to=2026-06-30&departmentId=uuid&status=APPROVED&export=excel
```

Response:

```json
{
  "data": {
    "summary": {
      "pending": 3,
      "approved": 12
    },
    "rows": []
  }
}
```

Validation:

- `from` must be before or equal to `to`.
- `export` must be `excel`, `pdf`, or omitted.
- Managers can export only team-scoped reports.

## 18. Approval Actions API

| Method | Endpoint | Permissions | Purpose |
| --- | --- | --- | --- |
| POST | `/approvals/actions` | Assigned approver, HR Admin, Super Admin | Approve/reject/send back/override |
| GET | `/approvals/actions` | HR Admin, Manager, Compliance Officer | Approval history |

Payload:

```json
{
  "entityType": "LEAVE_REQUEST",
  "entityId": "uuid",
  "action": "APPROVE",
  "fromStatus": "PENDING_MANAGER",
  "toStatus": "APPROVED",
  "comments": "Approved for planned leave coverage"
}
```

Validation:

- `entityType`, `entityId`, and `action` are required.
- `comments` are required for `REJECT`, `SEND_BACK`, and `OVERRIDE`.
- Actor must be assigned approver or hold override permission.

## 19. File Storage API

| Method | Endpoint | Permissions | Purpose |
| --- | --- | --- | --- |
| POST | `/files/presign-upload` | Authenticated | Generate signed upload URL |
| POST | `/files/presign-download` | Authorized owner/role | Generate signed download URL |
| DELETE | `/files/:storageKey` | HR Admin, owner rules | Mark file removed |

Upload presign payload:

```json
{
  "module": "EMPLOYEE_DOCUMENT",
  "entityId": "uuid",
  "fileName": "passport.pdf",
  "mimeType": "application/pdf",
  "sizeBytes": 450000
}
```

Validation:

- `module`, `entityId`, `fileName`, `mimeType`, and `sizeBytes` are required.
- File size must be within configured limit.
- MIME type must be allowed for the module.
- User must have permission to upload against the entity.

## 20. Notification API

| Method | Endpoint | Permissions | Purpose |
| --- | --- | --- | --- |
| GET | `/notifications` | Authenticated | List current user's notifications |
| PUT | `/notifications/:id/read` | Notification owner | Mark read |
| PUT | `/notifications/read-all` | Authenticated | Mark all read |

Notification response:

```json
{
  "data": [
    {
      "id": "uuid",
      "title": "Leave approval pending",
      "body": "Aakansha Yadav requested Earned Leave",
      "linkUrl": "/leave/requests/uuid",
      "readAt": null,
      "createdAt": "2026-06-20T08:00:00.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "pageSize": 20,
    "total": 1
  }
}
```

## 21. Validation Rules

### 21.1 Common Validation

- UUID fields must be valid UUIDs.
- Required fields must be present and non-empty.
- Date fields must be valid ISO dates.
- Timestamp fields must be valid ISO date-time values.
- Enum fields must match approved enum values.
- Pagination values must be numeric and within limits.
- String lengths must not exceed database column lengths.
- Soft-deleted records cannot be updated unless restored by authorized role.

### 21.2 Business Validation

| Area | Rule |
| --- | --- |
| Employee | Employee code and official email must be unique |
| Reporting | Employee cannot report to self |
| Attendance | Only one attendance entry per employee per date |
| Attendance | Check-out must be after check-in |
| Leave | Leave days must be positive |
| Leave | Leave balance must be sufficient unless HR override |
| Comp-Off | Expired comp-off cannot be used |
| Probation | Review day must be 30, 60, or 90 |
| Policy | Policy version number must be unique per policy |
| Policy | Duplicate acknowledgement is not allowed |
| Training | Duplicate assignment for same employee/training is not allowed |
| Exit | Employee can have only one active resignation |

## 22. Error Handling

### 22.1 HTTP Status Codes

| Status | Code | Meaning |
| --- | --- | --- |
| 200 | OK | Request succeeded |
| 201 | CREATED | Resource created |
| 204 | NO_CONTENT | Request succeeded without body |
| 400 | BAD_REQUEST | Invalid request format |
| 401 | UNAUTHORIZED | Missing/invalid/expired token |
| 403 | FORBIDDEN | Insufficient permissions |
| 404 | NOT_FOUND | Resource not found |
| 409 | CONFLICT | Unique/business conflict |
| 422 | VALIDATION_ERROR | Field validation failed |
| 429 | RATE_LIMITED | Too many requests |
| 500 | INTERNAL_SERVER_ERROR | Unexpected server error |

### 22.2 Error Codes

| Error Code | Scenario |
| --- | --- |
| `INVALID_CREDENTIALS` | Login failed |
| `TOKEN_EXPIRED` | JWT expired |
| `TOKEN_REVOKED` | Refresh token revoked |
| `FORBIDDEN_ROLE` | Role not allowed |
| `RESOURCE_NOT_FOUND` | Entity does not exist |
| `VALIDATION_ERROR` | Field validation failed |
| `DUPLICATE_RECORD` | Unique constraint violation |
| `INSUFFICIENT_LEAVE_BALANCE` | Leave balance too low |
| `INVALID_WORKFLOW_TRANSITION` | Status transition not allowed |
| `APPROVER_REQUIRED` | Approval actor missing |
| `COMMENTS_REQUIRED` | Reject/override missing comments |
| `FILE_TYPE_NOT_ALLOWED` | Invalid file MIME type |
| `FILE_SIZE_EXCEEDED` | File too large |

### 22.3 Example Validation Error

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Leave request validation failed",
    "details": [
      {
        "field": "days",
        "message": "days must be greater than 0"
      },
      {
        "field": "toDate",
        "message": "toDate must be on or after fromDate"
      }
    ],
    "requestId": "req_20260620_001"
  }
}
```

### 22.4 Example Permission Error

```json
{
  "error": {
    "code": "FORBIDDEN_ROLE",
    "message": "Insufficient permissions for Employee Master",
    "requestId": "req_20260620_002"
  }
}
```

## 23. Audit Requirements

The API must write audit records for:

- Login and logout.
- Failed login.
- Create, update, delete, and restore.
- Approval, rejection, send-back, override, and closure.
- File upload and download.
- Report export.
- Policy acknowledgement.
- Certification verification.
- Exit closure.

Audit record minimum fields:

```json
{
  "actorUserId": "uuid",
  "action": "UPDATE",
  "entityType": "EMPLOYEE",
  "entityId": "uuid",
  "oldValue": {},
  "newValue": {},
  "ipAddress": "127.0.0.1",
  "createdAt": "2026-06-20T10:00:00.000Z"
}
```

## 24. Implementation Notes

- Current backend routes expose generic module CRUD under the documented `/api/v1` paths.
- Future service implementation should add request validators per payload in this document.
- Database constraints in `backend/database/schema.sql` must remain the final guardrail for uniqueness and referential integrity.
- S3 upload/download APIs should use signed URLs and private buckets.
- Email notifications should be sent through `email_queue` worker processing.
