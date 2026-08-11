CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TYPE user_role AS ENUM (
  'SUPER_ADMIN',
  'HR_ADMIN',
  'REPORTING_MANAGER',
  'EMPLOYEE',
  'TRAINER',
  'COMPLIANCE_OFFICER'
);

CREATE TYPE lifecycle_status AS ENUM (
  'CANDIDATE',
  'OFFERED',
  'ONBOARDING',
  'ACTIVE',
  'PROBATION',
  'CONFIRMED',
  'NOTICE',
  'EXITED'
);

CREATE TYPE workflow_status AS ENUM (
  'DRAFT',
  'SUBMITTED',
  'PENDING_MANAGER',
  'PENDING_HR',
  'PENDING_COMPLIANCE',
  'APPROVED',
  'REJECTED',
  'CANCELLED',
  'CLOSED'
);

CREATE TYPE attendance_mode AS ENUM ('OFFICE', 'WFH', 'REMOTE', 'CLIENT_SITE', 'HOLIDAY', 'LEAVE', 'ABSENT');
CREATE TYPE review_outcome AS ENUM ('CONTINUE', 'CONFIRM', 'EXTEND', 'TERMINATE');

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID,
  name VARCHAR(160) NOT NULL,
  email VARCHAR(180) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role user_role NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_login_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  revoked_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(60) UNIQUE NOT NULL,
  name VARCHAR(160) UNIQUE NOT NULL,
  parent_id UUID REFERENCES departments(id),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE designations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id UUID REFERENCES departments(id),
  title VARCHAR(160) NOT NULL,
  level VARCHAR(60),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE(department_id, title)
);

CREATE TABLE employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_code VARCHAR(40) UNIQUE NOT NULL,
  official_email VARCHAR(180) UNIQUE,
  full_name VARCHAR(180) NOT NULL,
  gender VARCHAR(30),
  date_of_birth DATE,
  marital_status VARCHAR(40),
  nationality VARCHAR(80),
  personal_email VARCHAR(180),
  mobile_number VARCHAR(40),
  address TEXT,
  emergency_contact VARCHAR(180),
  joining_date DATE NOT NULL,
  confirmation_date DATE,
  employee_type VARCHAR(80),
  department_id UUID REFERENCES departments(id),
  designation_id UUID REFERENCES designations(id),
  reporting_manager_id UUID REFERENCES employees(id),
  location VARCHAR(120),
  legal_entity VARCHAR(160),
  lifecycle_status lifecycle_status NOT NULL DEFAULT 'ACTIVE',
  cost_centre VARCHAR(160),
  ctc NUMERIC(14,2),
  variable_pay NUMERIC(14,2),
  bonus NUMERIC(14,2),
  bank_name VARCHAR(160),
  tax_regime VARCHAR(80),
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id),
  deleted_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

ALTER TABLE users ADD CONSTRAINT fk_users_employee FOREIGN KEY (employee_id) REFERENCES employees(id);

CREATE TABLE employee_job_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  department_id UUID REFERENCES departments(id),
  designation_id UUID REFERENCES designations(id),
  reporting_manager_id UUID REFERENCES employees(id),
  effective_from DATE NOT NULL,
  effective_to DATE,
  reason VARCHAR(180),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE employee_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  document_type VARCHAR(100) NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  storage_key TEXT NOT NULL,
  mime_type VARCHAR(120),
  issue_date DATE,
  expiry_date DATE,
  status VARCHAR(40) DEFAULT 'VALID',
  uploaded_by UUID REFERENCES users(id),
  uploaded_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE requisitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(180) NOT NULL,
  department_id UUID REFERENCES departments(id),
  designation_id UUID REFERENCES designations(id),
  openings INT NOT NULL CHECK (openings > 0),
  hiring_manager_id UUID REFERENCES employees(id),
  status workflow_status NOT NULL DEFAULT 'DRAFT',
  target_joining_date DATE,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requisition_id UUID REFERENCES requisitions(id),
  full_name VARCHAR(180) NOT NULL,
  email VARCHAR(180),
  phone VARCHAR(40),
  source VARCHAR(100),
  stage VARCHAR(80) NOT NULL DEFAULT 'SCREENING',
  rating NUMERIC(3,1),
  resume_storage_key TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE interviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  interviewer_id UUID REFERENCES employees(id),
  interview_round VARCHAR(100) NOT NULL,
  scheduled_at TIMESTAMP NOT NULL,
  feedback TEXT,
  score NUMERIC(4,2),
  status workflow_status NOT NULL DEFAULT 'SUBMITTED'
);

CREATE TABLE offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  offered_ctc NUMERIC(14,2),
  joining_date DATE,
  status workflow_status NOT NULL DEFAULT 'PENDING_HR',
  accepted_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE onboarding_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  task_name VARCHAR(160) NOT NULL,
  task_type VARCHAR(80) NOT NULL,
  owner_role user_role NOT NULL,
  due_date DATE,
  status workflow_status NOT NULL DEFAULT 'SUBMITTED',
  completed_at TIMESTAMP
);

CREATE TABLE shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) UNIQUE NOT NULL,
  starts_at TIME NOT NULL,
  ends_at TIME NOT NULL,
  grace_minutes INT NOT NULL DEFAULT 0
);

CREATE TABLE shift_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  shift_id UUID NOT NULL REFERENCES shifts(id),
  effective_from DATE NOT NULL,
  effective_to DATE
);

CREATE TABLE attendance_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  attendance_date DATE NOT NULL,
  mode attendance_mode NOT NULL,
  check_in TIMESTAMP,
  check_out TIMESTAMP,
  total_minutes INT,
  status workflow_status NOT NULL DEFAULT 'APPROVED',
  UNIQUE(employee_id, attendance_date)
);

CREATE TABLE attendance_regularizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attendance_entry_id UUID REFERENCES attendance_entries(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  requested_check_in TIMESTAMP,
  requested_check_out TIMESTAMP,
  status workflow_status NOT NULL DEFAULT 'PENDING_MANAGER',
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE leave_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(40) UNIQUE NOT NULL,
  name VARCHAR(100) UNIQUE NOT NULL,
  annual_quota NUMERIC(6,2) NOT NULL,
  is_paid BOOLEAN NOT NULL DEFAULT TRUE,
  requires_document BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE leave_accrual_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  leave_type_id UUID NOT NULL REFERENCES leave_types(id) ON DELETE CASCADE,
  accrual_frequency VARCHAR(40) NOT NULL,
  accrual_amount NUMERIC(6,2) NOT NULL,
  max_carry_forward NUMERIC(6,2) DEFAULT 0,
  effective_from DATE NOT NULL,
  effective_to DATE
);

CREATE TABLE leave_balances (
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  leave_type_id UUID NOT NULL REFERENCES leave_types(id),
  balance NUMERIC(6,2) NOT NULL DEFAULT 0,
  as_of_date DATE NOT NULL DEFAULT CURRENT_DATE,
  PRIMARY KEY (employee_id, leave_type_id)
);

CREATE TABLE leave_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  leave_type_id UUID NOT NULL REFERENCES leave_types(id),
  from_date DATE NOT NULL,
  to_date DATE NOT NULL,
  days NUMERIC(6,2) NOT NULL CHECK (days > 0),
  reason TEXT,
  status workflow_status NOT NULL DEFAULT 'PENDING_MANAGER',
  approver_id UUID REFERENCES employees(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE leave_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  leave_type_id UUID NOT NULL REFERENCES leave_types(id),
  leave_request_id UUID REFERENCES leave_requests(id),
  transaction_type VARCHAR(40) NOT NULL,
  days NUMERIC(6,2) NOT NULL,
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE holiday_calendars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location VARCHAR(120) NOT NULL,
  holiday_date DATE NOT NULL,
  name VARCHAR(160) NOT NULL,
  is_optional BOOLEAN NOT NULL DEFAULT FALSE,
  UNIQUE(location, holiday_date, name)
);

CREATE TABLE comp_off_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  source_work_date DATE NOT NULL,
  earned_days NUMERIC(5,2) NOT NULL,
  utilized_days NUMERIC(5,2) NOT NULL DEFAULT 0,
  expires_on DATE NOT NULL,
  status workflow_status NOT NULL DEFAULT 'PENDING_MANAGER',
  reason TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE probation_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  review_day INT NOT NULL CHECK (review_day IN (30, 60, 90)),
  due_date DATE NOT NULL,
  manager_feedback TEXT,
  hr_feedback TEXT,
  outcome review_outcome,
  status workflow_status NOT NULL DEFAULT 'PENDING_MANAGER',
  UNIQUE(employee_id, review_day)
);

CREATE TABLE performance_cycles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(120) UNIQUE NOT NULL,
  starts_on DATE NOT NULL,
  ends_on DATE NOT NULL,
  status workflow_status NOT NULL DEFAULT 'DRAFT'
);

CREATE TABLE goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  cycle_id UUID NOT NULL REFERENCES performance_cycles(id),
  title VARCHAR(180) NOT NULL,
  description TEXT,
  weight NUMERIC(5,2) NOT NULL DEFAULT 0,
  status workflow_status NOT NULL DEFAULT 'SUBMITTED'
);

CREATE TABLE kpis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  metric_name VARCHAR(160) NOT NULL,
  target_value VARCHAR(80),
  actual_value VARCHAR(80),
  score NUMERIC(5,2)
);

CREATE TABLE performance_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  cycle_id UUID NOT NULL REFERENCES performance_cycles(id),
  self_comments TEXT,
  manager_feedback TEXT,
  final_rating NUMERIC(4,2),
  status workflow_status NOT NULL DEFAULT 'SUBMITTED',
  UNIQUE(employee_id, cycle_id)
);

CREATE TABLE trainings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(180) NOT NULL,
  category VARCHAR(100),
  is_mandatory BOOLEAN NOT NULL DEFAULT FALSE,
  audience_rule JSONB,
  owner_id UUID REFERENCES employees(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE training_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  training_id UUID NOT NULL REFERENCES trainings(id) ON DELETE CASCADE,
  trainer_id UUID REFERENCES employees(id),
  starts_at TIMESTAMP NOT NULL,
  ends_at TIMESTAMP NOT NULL,
  location VARCHAR(160),
  meeting_url TEXT
);

CREATE TABLE training_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  training_id UUID NOT NULL REFERENCES trainings(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  status workflow_status NOT NULL DEFAULT 'SUBMITTED',
  completed_at TIMESTAMP,
  UNIQUE(training_id, employee_id)
);

CREATE TABLE training_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES training_sessions(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  attended BOOLEAN NOT NULL DEFAULT FALSE,
  marked_by UUID REFERENCES users(id),
  UNIQUE(session_id, employee_id)
);

CREATE TABLE policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(180) NOT NULL,
  category VARCHAR(100) NOT NULL,
  owner_id UUID REFERENCES employees(id),
  status workflow_status NOT NULL DEFAULT 'DRAFT',
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE policy_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id UUID NOT NULL REFERENCES policies(id) ON DELETE CASCADE,
  version_no VARCHAR(40) NOT NULL,
  effective_date DATE NOT NULL,
  review_date DATE,
  expiry_date DATE,
  storage_key TEXT,
  body TEXT,
  UNIQUE(policy_id, version_no)
);

CREATE TABLE policy_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_version_id UUID NOT NULL REFERENCES policy_versions(id) ON DELETE CASCADE,
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  department_id UUID REFERENCES departments(id),
  designation_id UUID REFERENCES designations(id),
  due_date DATE NOT NULL,
  status workflow_status NOT NULL DEFAULT 'SUBMITTED'
);

CREATE TABLE policy_acknowledgements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_assignment_id UUID NOT NULL REFERENCES policy_assignments(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  acknowledged_at TIMESTAMP NOT NULL DEFAULT NOW(),
  ip_address VARCHAR(80),
  user_agent TEXT,
  UNIQUE(policy_assignment_id, employee_id)
);

CREATE TABLE compliance_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(180) NOT NULL,
  compliance_type VARCHAR(120) NOT NULL,
  owner_id UUID REFERENCES users(id),
  due_date DATE NOT NULL,
  status workflow_status NOT NULL DEFAULT 'SUBMITTED',
  evidence_storage_key TEXT
);

CREATE TABLE employee_certifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  certification_name VARCHAR(180) NOT NULL,
  issuer VARCHAR(160),
  issued_on DATE,
  expires_on DATE,
  certificate_storage_key TEXT,
  status VARCHAR(60) NOT NULL DEFAULT 'VALID'
);

CREATE TABLE resignations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  resignation_date DATE NOT NULL,
  requested_last_working_day DATE NOT NULL,
  approved_last_working_day DATE,
  reason TEXT,
  status workflow_status NOT NULL DEFAULT 'PENDING_MANAGER'
);

CREATE TABLE exit_checklists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resignation_id UUID NOT NULL REFERENCES resignations(id) ON DELETE CASCADE,
  item_name VARCHAR(160) NOT NULL,
  owner_role user_role NOT NULL,
  due_date DATE,
  status workflow_status NOT NULL DEFAULT 'SUBMITTED',
  completed_at TIMESTAMP
);

CREATE TABLE asset_recoveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resignation_id UUID NOT NULL REFERENCES resignations(id) ON DELETE CASCADE,
  asset_name VARCHAR(160) NOT NULL,
  serial_number VARCHAR(120),
  recovered_at TIMESTAMP,
  status workflow_status NOT NULL DEFAULT 'SUBMITTED'
);

CREATE TABLE knowledge_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resignation_id UUID NOT NULL REFERENCES resignations(id) ON DELETE CASCADE,
  topic VARCHAR(180) NOT NULL,
  recipient_employee_id UUID REFERENCES employees(id),
  status workflow_status NOT NULL DEFAULT 'SUBMITTED',
  notes TEXT
);

CREATE TABLE fnf_settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resignation_id UUID NOT NULL REFERENCES resignations(id) ON DELETE CASCADE,
  payroll_status workflow_status NOT NULL DEFAULT 'SUBMITTED',
  settlement_amount NUMERIC(14,2),
  paid_at TIMESTAMP,
  notes TEXT
);

CREATE TABLE approval_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type VARCHAR(80) NOT NULL,
  entity_id UUID NOT NULL,
  actor_user_id UUID NOT NULL REFERENCES users(id),
  action VARCHAR(40) NOT NULL,
  from_status workflow_status,
  to_status workflow_status,
  comments TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(180) NOT NULL,
  body TEXT,
  link_url TEXT,
  read_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE email_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  to_email VARCHAR(180) NOT NULL,
  subject VARCHAR(180) NOT NULL,
  body TEXT NOT NULL,
  status VARCHAR(40) NOT NULL DEFAULT 'PENDING',
  attempts INT NOT NULL DEFAULT 0,
  scheduled_at TIMESTAMP NOT NULL DEFAULT NOW(),
  sent_at TIMESTAMP
);

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id UUID REFERENCES users(id),
  action VARCHAR(120) NOT NULL,
  entity_type VARCHAR(80) NOT NULL,
  entity_id UUID,
  old_value JSONB,
  new_value JSONB,
  ip_address VARCHAR(80),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX idx_departments_parent ON departments(parent_id);
CREATE INDEX idx_designations_department ON designations(department_id);
CREATE INDEX idx_employees_department ON employees(department_id);
CREATE INDEX idx_employees_designation ON employees(designation_id);
CREATE INDEX idx_employees_manager ON employees(reporting_manager_id);
CREATE INDEX idx_employees_status ON employees(lifecycle_status);
CREATE INDEX idx_employees_joining_date ON employees(joining_date);
CREATE INDEX idx_employees_search_name ON employees(full_name);
CREATE INDEX idx_job_history_employee ON employee_job_history(employee_id);
CREATE INDEX idx_documents_expiry ON employee_documents(expiry_date);
CREATE INDEX idx_documents_employee ON employee_documents(employee_id);
CREATE INDEX idx_requisitions_department ON requisitions(department_id);
CREATE INDEX idx_requisitions_status ON requisitions(status);
CREATE INDEX idx_candidates_requisition ON candidates(requisition_id);
CREATE INDEX idx_candidates_stage ON candidates(stage);
CREATE INDEX idx_interviews_candidate ON interviews(candidate_id);
CREATE INDEX idx_offers_candidate ON offers(candidate_id);
CREATE INDEX idx_onboarding_employee_status ON onboarding_tasks(employee_id, status);
CREATE INDEX idx_shift_assignments_employee ON shift_assignments(employee_id);
CREATE INDEX idx_attendance_employee_date ON attendance_entries(employee_id, attendance_date);
CREATE INDEX idx_attendance_date ON attendance_entries(attendance_date);
CREATE INDEX idx_attendance_regularizations_employee_status ON attendance_regularizations(employee_id, status);
CREATE INDEX idx_leave_balances_employee ON leave_balances(employee_id);
CREATE INDEX idx_leave_status ON leave_requests(status);
CREATE INDEX idx_leave_dates ON leave_requests(from_date, to_date);
CREATE INDEX idx_leave_employee_status ON leave_requests(employee_id, status);
CREATE INDEX idx_leave_ledger_employee ON leave_ledger(employee_id, leave_type_id);
CREATE INDEX idx_comp_off_expiry ON comp_off_requests(expires_on);
CREATE INDEX idx_comp_off_employee_status ON comp_off_requests(employee_id, status);
CREATE INDEX idx_probation_due ON probation_reviews(due_date, status);
CREATE INDEX idx_probation_employee ON probation_reviews(employee_id);
CREATE INDEX idx_goals_employee_cycle ON goals(employee_id, cycle_id);
CREATE INDEX idx_kpis_goal ON kpis(goal_id);
CREATE INDEX idx_performance_reviews_employee_cycle ON performance_reviews(employee_id, cycle_id);
CREATE INDEX idx_training_sessions_training ON training_sessions(training_id);
CREATE INDEX idx_training_assignments_status ON training_assignments(status);
CREATE INDEX idx_training_assignments_employee ON training_assignments(employee_id);
CREATE INDEX idx_training_attendance_session ON training_attendance(session_id);
CREATE INDEX idx_policy_versions_policy ON policy_versions(policy_id);
CREATE INDEX idx_policy_assignments_due ON policy_assignments(due_date, status);
CREATE INDEX idx_policy_assignments_employee ON policy_assignments(employee_id);
CREATE INDEX idx_policy_ack_employee ON policy_acknowledgements(employee_id);
CREATE INDEX idx_compliance_tasks_due ON compliance_tasks(due_date, status);
CREATE INDEX idx_certifications_expiry ON employee_certifications(expires_on);
CREATE INDEX idx_certifications_employee ON employee_certifications(employee_id);
CREATE INDEX idx_resignations_status ON resignations(status);
CREATE INDEX idx_resignations_employee ON resignations(employee_id);
CREATE INDEX idx_exit_checklists_resignation ON exit_checklists(resignation_id);
CREATE INDEX idx_asset_recoveries_resignation ON asset_recoveries(resignation_id);
CREATE INDEX idx_knowledge_transfers_resignation ON knowledge_transfers(resignation_id);
CREATE INDEX idx_fnf_settlements_resignation ON fnf_settlements(resignation_id);
CREATE INDEX idx_approval_actions_entity ON approval_actions(entity_type, entity_id);
CREATE INDEX idx_approval_actions_actor ON approval_actions(actor_user_id);
CREATE INDEX idx_notifications_user ON notifications(user_id, read_at);
CREATE INDEX idx_email_queue_status_schedule ON email_queue(status, scheduled_at);
CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_actor_date ON audit_logs(actor_user_id, created_at);
