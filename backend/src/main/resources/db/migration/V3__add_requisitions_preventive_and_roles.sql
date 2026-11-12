-- V3__add_requisitions_preventive_and_roles.sql: Extended tables and multi-role authorization

ALTER TABLE users ADD COLUMN IF NOT EXISTS authorized_roles VARCHAR(255);

UPDATE users SET authorized_roles = 'ADMIN,MANAGEMENT' WHERE id = 'usr-admin-1';
UPDATE users SET authorized_roles = 'MANAGEMENT' WHERE id = 'usr-mgmt-1';
UPDATE users SET authorized_roles = 'MAINTENANCE' WHERE id = 'usr-maint-1';
UPDATE users SET authorized_roles = 'SECURITY' WHERE id = 'usr-sec-1';
UPDATE users SET authorized_roles = 'RESIDENT' WHERE id = 'usr-res-1';

CREATE TABLE IF NOT EXISTS spare_requisitions (
    id VARCHAR(64) PRIMARY KEY,
    req_number VARCHAR(50) NOT NULL UNIQUE,
    work_order_id VARCHAR(64),
    technician_id VARCHAR(64) NOT NULL,
    technician_name VARCHAR(120) NOT NULL,
    part_id VARCHAR(64) NOT NULL,
    part_name VARCHAR(150) NOT NULL,
    quantity INT NOT NULL,
    urgency VARCHAR(30) DEFAULT 'ROUTINE',
    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(30) DEFAULT 'PENDING_APPROVAL',
    manager_notes TEXT,
    CONSTRAINT fk_req_part FOREIGN KEY (part_id) REFERENCES spare_parts(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_req_status ON spare_requisitions(status);

CREATE TABLE IF NOT EXISTS preventive_schedules (
    id VARCHAR(64) PRIMARY KEY,
    task_code VARCHAR(50) NOT NULL UNIQUE,
    title VARCHAR(200) NOT NULL,
    asset_name VARCHAR(150) NOT NULL,
    tower VARCHAR(50) NOT NULL,
    frequency VARCHAR(30) NOT NULL,
    next_due_date TIMESTAMP NOT NULL,
    assigned_team VARCHAR(120) NOT NULL,
    status VARCHAR(30) DEFAULT 'SCHEDULED',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_prev_status ON preventive_schedules(status);

-- Seed initial spare requisitions
INSERT INTO spare_requisitions (id, req_number, work_order_id, technician_id, technician_name, part_id, part_name, quantity, urgency, status)
VALUES
('req-01', 'REQ-2024-098', 'wo-2024-118', 'usr-maint-1', 'Ramesh Kumar', 'sp-01', 'Watts PRV 1" Silicone Repair Kit', 1, 'URGENT', 'PENDING_APPROVAL')
ON CONFLICT (req_number) DO NOTHING;

-- Seed initial preventive maintenance schedules
INSERT INTO preventive_schedules (id, task_code, title, asset_name, tower, frequency, next_due_date, assigned_team, status)
VALUES
('ps-01', 'PM-ELEV-Q2', 'Elevator Hydraulic & Governor Calibration', 'Tower B Passenger Elevator #2', 'Tower B', 'QUARTERLY', CURRENT_TIMESTAMP + INTERVAL '3 days', 'Schindler Certified Team', 'SCHEDULED'),
('ps-02', 'PM-DG-M05', 'Cummins 500kVA DG Set Oil & Filter Overhaul', 'Cummins 500kVA DG Set #2', 'Common Substation', 'MONTHLY', CURRENT_TIMESTAMP + INTERVAL '7 days', 'Senior MEP Electrical', 'SCHEDULED'),
('ps-03', 'PM-PRV-W12', 'Pressure Reducing Valve Chamber Flushing', 'Tower B Water Riser PRV-B4', 'Tower B', 'WEEKLY', CURRENT_TIMESTAMP + INTERVAL '1 day', 'Plumbing Quick Response', 'SCHEDULED')
ON CONFLICT (task_code) DO NOTHING;
