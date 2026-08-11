# Employee Management Module

## 1. Module Purpose

The Employee Management module is the HRMS source of truth for employee master data, employee directory, documents, reporting hierarchy, job history, employee statistics, and organization chart.

## 2. Roles and Permissions

| Role | Access |
| --- | --- |
| Super Admin | Read all employee data and hierarchy |
| HR Admin | Create, update, soft-delete, view all employees, manage documents |
| Reporting Manager | View assigned team directory, profiles, documents, and hierarchy |
| Employee | View own profile, own documents, own job information |
| Trainer | No employee master write access; limited employee references through learning module |
| Compliance Officer | View compliance-relevant documents and certification-linked employee data |

## 3. Backend Endpoints

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/api/v1/employees` | Scoped employee master list |
| POST | `/api/v1/employees` | Create employee |
| GET | `/api/v1/employees/directory` | Scoped employee directory |
| GET | `/api/v1/employees/stats` | Headcount/status/location/department statistics |
| GET | `/api/v1/employees/org-chart` | Organization chart grouped by manager |
| GET | `/api/v1/employees/documents` | HR/compliance employee document register |
| GET | `/api/v1/employees/:id` | Employee profile with documents, job history, leave balances |
| PUT | `/api/v1/employees/:id` | Update employee master data |
| DELETE | `/api/v1/employees/:id` | Soft-delete employee |
| GET | `/api/v1/employees/:id/documents` | Employee-specific documents |
| POST | `/api/v1/employees/:id/documents` | Add employee document metadata |
| GET | `/api/v1/employees/:id/job-history` | Employee job history |

## 4. Employee Create Payload

```json
{
  "employeeCode": "CCI-1101",
  "fullName": "Aakansha Yadav",
  "officialEmail": "aakansha@company.com",
  "personalEmail": "aakansha@example.com",
  "mobileNumber": "+91 9000012345",
  "joiningDate": "2026-07-01",
  "department": "People, Talent & Culture",
  "team": "People Operations",
  "designation": "HR Operations Specialist",
  "reportingManager": "Doris Anna T",
  "reportingManagerId": 11,
  "location": "Bengaluru",
  "lifecycleStatus": "ACTIVE"
}
```

## 5. Validation Rules

- `fullName`, `joiningDate`, `department`, and `designation` are required.
- `employeeCode` must be unique when provided.
- `officialEmail` must be unique when provided.
- Employee updates that change department, designation, or manager automatically create a job history entry.
- Deletes are soft deletes using `deletedAt`.
- Employees can view only their own profile unless they are HR/Admin/Compliance or assigned manager.

## 6. Response Examples

### Employee List

```json
{
  "data": [
    {
      "id": 1,
      "employeeCode": "CCI-1001",
      "fullName": "Aakansha Yadav",
      "designation": "Engineer",
      "department": "Product Operations",
      "reportingManager": "Kiran Pole",
      "location": "Bengaluru",
      "lifecycleStatus": "ACTIVE"
    }
  ],
  "meta": {
    "page": 1,
    "pageSize": 20,
    "total": 50
  }
}
```

### Employee Stats

```json
{
  "data": {
    "headcount": 50,
    "active": 48,
    "exited": 2,
    "byDepartment": [],
    "byLocation": [],
    "byLifecycleStatus": []
  }
}
```

## 7. UI Screens

- Employee Directory
- Employee Master List
- Employee Profile Drawer/Page
- Employee Create/Edit Form
- Employee Documents
- Employee Job History
- Organization Chart
- Employee Statistics Dashboard

## 8. Audit Events

- `CREATE employees`
- `UPDATE employees`
- `SOFT_DELETE employees`
- `UPLOAD_DOCUMENT employee_documents`

## 9. Scalability Notes

- Employee lists are paginated.
- Search and filters are applied before pagination.
- Employee hierarchy is derived from existing employee master data.
- Database indexes exist for department, designation, manager, lifecycle status, joining date, and search name.
