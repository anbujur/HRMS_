import datetime
import json
import re
from pathlib import Path

import openpyxl


ROOT = Path(__file__).resolve().parents[1]
SOURCE = Path(r"C:\Users\Annadoris\OneDrive - Cuculus India\Desktop\HR\Cost Code & Titles Update.xlsx")
TARGETS = [
    ROOT / "backend" / "src" / "data" / "employees.json",
    ROOT / "frontend" / "src" / "data" / "employees.json",
]

female_first_names = {"aakansha", "aarti", "ambika", "anusha", "sonia", "doris"}

workbook = openpyxl.load_workbook(SOURCE, read_only=True, data_only=True)
sheet = workbook["Employees"]
rows = list(sheet.iter_rows(values_only=True))
headers = [str(header).strip() for header in rows[0]]
employees = []
base_joining_date = datetime.date(2022, 1, 3)

for index, row in enumerate(rows[1:], start=1):
    record = dict(zip(headers, row))
    name = str(record.get("Name (preferred)") or "").strip()
    if not name:
        continue

    location = str(record.get("Workplace") or "India").strip()
    department = str(record.get("Department") or "").strip()
    status = str(record.get("Status") or "Active").strip()
    slug = re.sub(r"[^a-z0-9]+", ".", name.lower()).strip(".")
    joining_date = base_joining_date + datetime.timedelta(days=index * 31)
    dob = datetime.date(1988 + (index % 12), (index % 12) + 1, ((index * 3) % 24) + 1)
    first_name = name.split()[0].lower()
    designation = str(record.get("Revised Titles") or record.get("Position") or "").strip()

    employees.append(
        {
            "id": index,
            "employeeId": f"CCI-{1000 + index}",
            "fullName": name,
            "gender": "Female" if first_name in female_first_names else "Male",
            "dateOfBirth": dob.isoformat(),
            "maritalStatus": "Single" if index % 3 else "Married",
            "nationality": "Indian",
            "personalEmail": f"{slug}@example.com",
            "mobileNumber": f"+91 9{(700000000 + index * 9137) % 1000000000:09d}",
            "address": location,
            "emergencyContact": f"+91 8{(600000000 + index * 6173) % 1000000000:09d}",
            "joiningDate": joining_date.isoformat(),
            "confirmationDate": (joining_date + datetime.timedelta(days=180)).isoformat(),
            "employeeType": "Full-time",
            "designation": designation,
            "previousDesignation": str(record.get("Position") or "").strip(),
            "department": department,
            "team": str(record.get("Team") or "").strip(),
            "reportingManager": str(record.get("Supervisor") or "").strip(),
            "location": location,
            "legalEntity": str(record.get("Legal Entity") or "").strip(),
            "employmentStatus": status,
            "costCentre": str(record.get("Cost Centre") or "").strip(),
            "probationStatus": "Completed" if index % 4 else "In Probation",
            "ctc": 420000 + index * 35000,
            "variablePay": 50000 + index * 1500,
            "bonus": 25000 + index * 800,
            "bankName": "HDFC Bank",
            "taxRegime": "New Regime",
            "passportExpiry": datetime.date(2027 + (index % 3), (index % 12) + 1, 15).isoformat(),
            "visaExpiry": datetime.date(2026 + (index % 2), (index % 12) + 1, 20).isoformat(),
            "leaveBalance": {"earned": 12 + (index % 6), "sick": 6 - (index % 3), "casual": 4 + (index % 4)},
            "assets": ["Laptop", "Access Card"] + (["Mobile Phone"] if index % 5 == 0 else []),
            "skills": ["HR Operations"]
            if "HR" in department
            else ["SQL", "Product Support"]
            if "Support" in department or "Operations" in department
            else ["Testing", "Platform"],
        }
    )

for target in TARGETS:
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(employees, indent=2), encoding="utf-8")

print(f"Wrote {len(employees)} employee records")
