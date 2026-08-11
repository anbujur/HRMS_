import "dotenv/config";
import pg from "pg";
import employees from "./data/employees.json" with { type: "json" };

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is required to seed PostgreSQL.");
  process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

try {
  for (const employee of employees) {
    await pool.query(
      `
      INSERT INTO employees (
        employee_code, full_name, gender, date_of_birth, marital_status, nationality,
        personal_email, mobile_number, address, emergency_contact, joining_date,
        confirmation_date, employee_type, designation, previous_designation,
        location, legal_entity, employment_status, probation_status, cost_centre,
        ctc, variable_pay, bonus, bank_name, tax_regime
      )
      VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25
      )
      ON CONFLICT (employee_code) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        designation = EXCLUDED.designation,
        employment_status = EXCLUDED.employment_status,
        updated_at = NOW()
      `,
      [
        employee.employeeId,
        employee.fullName,
        employee.gender,
        employee.dateOfBirth,
        employee.maritalStatus,
        employee.nationality,
        employee.personalEmail,
        employee.mobileNumber,
        employee.address,
        employee.emergencyContact,
        employee.joiningDate,
        employee.confirmationDate,
        employee.employeeType,
        employee.designation,
        employee.previousDesignation,
        employee.location,
        employee.legalEntity,
        employee.employmentStatus,
        employee.probationStatus,
        employee.costCentre,
        employee.ctc,
        employee.variablePay,
        employee.bonus,
        employee.bankName,
        employee.taxRegime,
      ]
    );
  }
  console.log(`Seeded ${employees.length} employees`);
} finally {
  await pool.end();
}
