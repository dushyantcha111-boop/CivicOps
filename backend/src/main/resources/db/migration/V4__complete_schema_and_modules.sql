-- V4__complete_schema_and_modules.sql: Schema alignment, JSON persistence columns, security tokens, inventory traceability, recurrence investigations, PM logs, community hub & audit logs

-- 1. Users: active status & updated_at
ALTER TABLE users ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT TRUE;
UPDATE users SET active = TRUE WHERE active IS NULL;

-- 2. Units: registered vehicles & resident user mapping
ALTER TABLE units ADD COLUMN IF NOT EXISTS registered_vehicles TEXT;
ALTER TABLE units ADD COLUMN IF NOT EXISTS resident_user_id VARCHAR(64);

UPDATE units SET registered_vehicles = '["KA-05-MM-2041 (Creta)","KA-05-JJ-8812 (Activa)"]', resident_user_id = 'usr-res-1' WHERE id = 'unit-b-402';
UPDATE units SET registered_vehicles = '["KA-03-AB-4455"]', tenant_name = 'Anand Verma', tenant_phone = '+91 98222 33445' WHERE id = 'unit-b-401';
UPDATE units SET registered_vehicles = '["KA-01-XY-9001"]' WHERE id = 'unit-b-403';
UPDATE units SET registered_vehicles = '["KA-04-P-1122"]' WHERE id = 'unit-a-101';
UPDATE units SET registered_vehicles = '["KA-05-D-3344"]', tenant_name = 'Rohit Joshi', tenant_phone = '+91 98777 88990' WHERE id = 'unit-c-204';

INSERT INTO units (id, unit_number, tower, floor, type, owner_name, owner_phone, is_tenant_occupied, occupancy_status, dues_amount, dues_status, registered_vehicles)
VALUES
('unit-a-502', 'A-502', 'Tower A', 5, '4BHK', 'Kavita Reddy', '+91 98555 66778', FALSE, 'OCCUPIED', 0.00, 'PAID', '["KA-02-C-8899","KA-02-C-9900"]'),
('unit-d-801', 'D-801', 'Tower D', 8, 'Penthouse', 'Meera Deshmukh', '+91 98888 99001', FALSE, 'OCCUPIED', 0.00, 'PAID', '["KA-01-EQ-7700"]')
ON CONFLICT (unit_number) DO NOTHING;

-- 3. Assets & Spare Parts extensions
ALTER TABLE assets ADD COLUMN IF NOT EXISTS active_work_orders_count INT DEFAULT 0;
UPDATE assets SET active_work_orders_count = 1 WHERE id IN ('ast-elev-b2', 'ast-dg-02', 'ast-prv-b4');

ALTER TABLE spare_parts ADD COLUMN IF NOT EXISTS compatible_assets TEXT;
UPDATE spare_parts SET compatible_assets = '["ast-prv-b4"]' WHERE id = 'sp-01';
UPDATE spare_parts SET compatible_assets = '["ast-dg-02"]' WHERE id IN ('sp-02', 'sp-03');

-- 4. Complaints: asset linkage, evidence arrays, proposed spares, submitted_at
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS asset_id VARCHAR(64);
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS evidence_before TEXT;
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS evidence_after TEXT;
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS proposed_spares TEXT;
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

UPDATE complaints
SET asset_id = 'ast-prv-b4',
    submitted_at = COALESCE(submitted_at, created_at),
    inspection_notes = COALESCE(inspection_notes, 'Inspected 4th floor pressure reducing valve (PRV-B4) and strainer. Found calcium scaling and clogged bronze mesh in the inlet union.'),
    proposed_resolution = COALESCE(proposed_resolution, 'Dismantled PRV-B4, cleared particulate sediment, replaced damaged silicone diaphragm with OEM Watts kit, calibrated output pressure to 2.8 Bar.'),
    evidence_before = COALESCE(evidence_before, '["https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=600&auto=format&fit=crop&q=80"]'),
    evidence_after = COALESCE(evidence_after, '["https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=600&auto=format&fit=crop&q=80"]'),
    proposed_spares = COALESCE(proposed_spares, '[{"partId":"sp-01","partName":"Watts PRV 1\\" Silicone Repair Kit","quantity":1}]')
WHERE id = 'cmp-2024-089';

-- 5. Work Orders: checklists, spares_allocated, asset_name + seed initial work order
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS asset_name VARCHAR(150);
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS checklists TEXT;
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS spares_allocated TEXT;

INSERT INTO work_orders (id, wo_number, title, complaint_id, type, status, priority, asset_id, asset_name, tower, location, technician_id, technician_name, due_date, estimated_hours, technician_notes, checklists, spares_allocated)
VALUES
('wo-2024-118', 'WO-2024-118', 'PLUMBING: Tower B 4th Floor Riser PRV-B4 Overhaul', 'cmp-2024-089', 'CORRECTIVE', 'PROPOSAL_SUBMITTED', 'HIGH', 'ast-prv-b4', 'Tower B Water Riser PRV-B4', 'Tower B', 'Tower B, 4th Floor Shaft', 'usr-maint-1', 'Ramesh Kumar', CURRENT_TIMESTAMP + INTERVAL '4 hours', 2.50, 'Replaced worn diaphragm and flushed sediment trap. Output calibrated to 2.8 Bar.', '[{"item":"Isolate 4th floor riser supply valve","completed":true},{"item":"Dismantle PRV-B4 bronze strainer & flush scale","completed":true},{"item":"Install OEM Watts silicone diaphragm kit","completed":true},{"item":"Verify post-repair dynamic pressure (2.5-3.0 Bar)","completed":true}]', '[{"partId":"sp-01","partName":"Watts PRV 1\\" Silicone Repair Kit","quantity":1,"fulfilled":false}]'),
('wo-2024-119', 'WO-2024-119', 'ELEVATOR: Passenger Lift #2 Optical Vane Calibration', NULL, 'CORRECTIVE', 'IN_PROGRESS', 'URGENT', 'ast-elev-b2', 'Tower B Passenger Elevator #2', 'Tower B', 'Tower B Core Shaft', 'usr-maint-1', 'Ramesh Kumar', CURRENT_TIMESTAMP + INTERVAL '6 hours', 3.00, 'Vibration observed at 5th floor leveling sensor.', '[{"item":"Lockout-tagout main lift drive","completed":true},{"item":"Inspect optical leveling vane #SCH-LEV-88","completed":false},{"item":"Re-tension governor rope & run load test","completed":false}]', '[]')
ON CONFLICT (wo_number) DO NOTHING;

-- 6. Incident Alerts: actions_taken & resolution tracking + initial seed
ALTER TABLE incident_alerts ADD COLUMN IF NOT EXISTS actions_taken TEXT;
ALTER TABLE incident_alerts ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMP;
ALTER TABLE incident_alerts ADD COLUMN IF NOT EXISTS resolved_by VARCHAR(120);
ALTER TABLE incident_alerts ADD COLUMN IF NOT EXISTS resolution_notes TEXT;

INSERT INTO incident_alerts (id, alert_code, title, severity, category, tower, location, reported_by, status, broadcast_sent, sms_sent_count, actions_taken)
VALUES
('inc-2024-001', 'SOS-2024-001', 'Lift #2 Deceleration Fault Inspection Advisory', 'WARNING', 'LIFT_ENTRAPMENT', 'Tower B', 'Tower B 5th Floor Lift Lobby', 'Satpal Singh (SECURITY)', 'RESOLVING', TRUE, 480, '["Schindler AMC engineer notified","Cabin intercom verified operational","Guard stationed at Tower B ground lobby"]')
ON CONFLICT (alert_code) DO NOTHING;

-- 7. Seed initial parcels if empty
INSERT INTO parcels (id, tracking_number, carrier, recipient_name, tower, unit_number, delivery_agent_name, delivery_agent_phone, locker_number, pickup_otp, status)
VALUES
('pcl-01', 'AMZ-99421', 'AMAZON', 'Rahul Sharma', 'Tower B', 'B-402', 'Sunil Kumar (Amazon Logistics)', '+91 98765 11223', 'Locker #12 (Tower B Lobby)', '448910', 'IN_LOCKER'),
('pcl-02', 'SWG-77210', 'SWIGGY', 'Priya Nambiar', 'Tower B', 'B-401', 'Karthik R (Swiggy Instamart)', '+91 98111 44556', 'Gate 1 Desk Rack A', '772910', 'AT_GATE')
ON CONFLICT (tracking_number) DO NOTHING;

-- 8. Preventive Schedules: link asset_id
ALTER TABLE preventive_schedules ADD COLUMN IF NOT EXISTS asset_id VARCHAR(64);
UPDATE preventive_schedules SET asset_id = 'ast-elev-b2' WHERE id = 'ps-01';
UPDATE preventive_schedules SET asset_id = 'ast-dg-02' WHERE id = 'ps-02';
UPDATE preventive_schedules SET asset_id = 'ast-prv-b4' WHERE id = 'ps-03';

-- 9. Revoked JWT Tokens for secure logout
CREATE TABLE IF NOT EXISTS revoked_tokens (
    token_id VARCHAR(128) PRIMARY KEY,
    expires_at TIMESTAMP NOT NULL,
    revoked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 10. Inventory Movements Ledger (Feature 5: Work Order & Inventory Traceability)
CREATE TABLE IF NOT EXISTS inventory_movements (
    id VARCHAR(64) PRIMARY KEY,
    part_id VARCHAR(64) NOT NULL,
    part_name VARCHAR(150) NOT NULL,
    work_order_id VARCHAR(64),
    requisition_id VARCHAR(64),
    movement_type VARCHAR(30) NOT NULL,
    quantity INT NOT NULL,
    balance_after INT NOT NULL,
    actor_name VARCHAR(120) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_mov_part FOREIGN KEY (part_id) REFERENCES spare_parts(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_inv_mov_part ON inventory_movements(part_id);

INSERT INTO inventory_movements (id, part_id, part_name, work_order_id, movement_type, quantity, balance_after, actor_name, notes)
VALUES
('mov-01', 'sp-01', 'Watts PRV 1" Silicone Repair Kit', NULL, 'RESTOCK', 5, 5, 'Suresh Patel', 'Initial monthly store replenishment'),
('mov-02', 'sp-01', 'Watts PRV 1" Silicone Repair Kit', 'wo-2024-118', 'OUTBOUND_REQ', 1, 4, 'Ramesh Kumar', 'Issued for Tower B PRV-B4 preliminary repair')
ON CONFLICT (id) DO NOTHING;

-- 11. Recurrence Investigations (Feature 4: Recurrence Investigation Engine)
CREATE TABLE IF NOT EXISTS recurrence_investigations (
    id VARCHAR(64) PRIMARY KEY,
    cluster_code VARCHAR(50) NOT NULL UNIQUE,
    title VARCHAR(200) NOT NULL,
    tower VARCHAR(50) NOT NULL,
    category VARCHAR(50) NOT NULL,
    asset_id VARCHAR(64),
    severity VARCHAR(40) NOT NULL,
    incident_count INT NOT NULL DEFAULT 1,
    time_window_days INT NOT NULL DEFAULT 30,
    status VARCHAR(40) NOT NULL DEFAULT 'PENDING_DIRECTIVE',
    root_cause TEXT,
    suggested_fix TEXT,
    capex_estimate VARCHAR(80),
    investigation_notes TEXT,
    follow_up_action TEXT,
    investigated_by VARCHAR(120),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO recurrence_investigations (id, cluster_code, title, tower, category, asset_id, severity, incident_count, time_window_days, status, root_cause, suggested_fix, capex_estimate)
VALUES
('inv-rc-09', 'CLUSTER-RC-09', 'Tower B Vertical Riser Hydraulic Scaling & Pressure Drops', 'Tower B', 'PLUMBING', 'ast-prv-b4', 'HIGH_RECURRENCE', 3, 30, 'PENDING_DIRECTIVE', 'Calcium carbonate scale deposition in 4th floor bronze mesh filter and elastomeric fatigue in Watts PRV-B4 diaphragm.', 'Replace strainer union with 316-SS dual mesh + install upstream electronic descaler pulse coil.', 'INR 28,500'),
('inv-rc-14', 'CLUSTER-RC-14', 'Tower B Passenger Elevator #2 Floor 5 Landing Offset', 'Tower B', 'ELEVATOR', 'ast-elev-b2', 'SAFETY_CRITICAL', 2, 30, 'PENDING_DIRECTIVE', 'Vibration-induced misalignment on optical vane sensor switch #SCH-LEV-88.', 'Replace optical vane transducer + re-align rail guide shoes during Schindler AMC window.', 'INR 42,000 (AMC Covered)')
ON CONFLICT (cluster_code) DO NOTHING;

-- 12. Preventive Completion Logs (Feature 6)
CREATE TABLE IF NOT EXISTS preventive_completion_logs (
    id VARCHAR(64) PRIMARY KEY,
    schedule_id VARCHAR(64) NOT NULL,
    work_order_id VARCHAR(64),
    completed_by VARCHAR(120) NOT NULL,
    notes TEXT,
    completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_pm_log_sched FOREIGN KEY (schedule_id) REFERENCES preventive_schedules(id) ON DELETE CASCADE
);

-- 13. Announcements & Events (Module 14)
CREATE TABLE IF NOT EXISTS announcements (
    id VARCHAR(64) PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    category VARCHAR(50) NOT NULL,
    tower VARCHAR(50) DEFAULT 'All Towers',
    pinned BOOLEAN DEFAULT FALSE,
    author_name VARCHAR(120) NOT NULL,
    author_role VARCHAR(40) NOT NULL,
    published_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO announcements (id, title, content, category, tower, pinned, author_name, author_role)
VALUES
('ann-01', 'Tower B Overhead Tank & Riser Flushing Schedule', 'Preventive valve flushing and potable tank chlorination will take place this Sunday between 10:00 AM and 12:30 PM. Water pressure in Floors 3-6 may fluctuate briefly.', 'MAINTENANCE', 'Tower B', TRUE, 'Suresh Patel', 'MANAGEMENT'),
('ann-02', 'Gate 1 RFID & Visitor QR Policy Upgrade', 'All domestic staff and recurring delivery partners must scan valid QR/6-digit OTP passes at Gate 1. Unverified tailgating is strictly prohibited by society bylaws.', 'SECURITY', 'All Towers', FALSE, 'Satpal Singh', 'SECURITY')
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS community_events (
    id VARCHAR(64) PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    location VARCHAR(150) NOT NULL,
    tower VARCHAR(50) DEFAULT 'All Towers',
    event_date TIMESTAMP NOT NULL,
    organizer VARCHAR(120) NOT NULL,
    rsvp_count INT DEFAULT 0,
    status VARCHAR(30) DEFAULT 'UPCOMING'
);

INSERT INTO community_events (id, title, description, location, tower, event_date, organizer, rsvp_count, status)
VALUES
('evt-01', 'Quarterly RWA General Body & Capex Review', 'Presentation of Community Reliability Radar telemetry, Tower B riser upgrade budget, and solar rooftop savings.', 'Clubhouse Hall A', 'All Towers', CURRENT_TIMESTAMP + INTERVAL '5 days', 'Management Committee', 38, 'UPCOMING'),
('evt-02', 'Fire Evacuation & Hydrant Drill', 'Mandatory fire safety awareness session and live extinguisher demonstration with Fire Brigade marshalls.', 'Central Courtyard & Tower B', 'Tower B', CURRENT_TIMESTAMP + INTERVAL '9 days', 'Gate Security & Safety Squad', 64, 'UPCOMING')
ON CONFLICT (id) DO NOTHING;

-- 14. Community Documents (Module 15)
CREATE TABLE IF NOT EXISTS community_documents (
    id VARCHAR(64) PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    category VARCHAR(60) NOT NULL,
    description TEXT,
    file_url VARCHAR(500) NOT NULL,
    file_size VARCHAR(40) DEFAULT '1.2 MB',
    uploaded_by VARCHAR(120) NOT NULL,
    visibility_role VARCHAR(40) DEFAULT 'ALL',
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO community_documents (id, title, category, description, file_url, file_size, uploaded_by, visibility_role)
VALUES
('doc-01', 'Green Valley Residency Bylaws & Visitor Protocol (2026)', 'BYLAWS', 'Official society rules covering visitor check-in, overstay penalties, contractor timings, and noise regulations.', 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf', '1.8 MB', 'Vikram Malhotra', 'ALL'),
('doc-02', 'Schindler Elevator Comprehensive AMC & Safety Certificate', 'COMPLIANCE', 'Annual safety certification and SLA response terms for Towers A-D passenger lifts.', 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf', '2.4 MB', 'Suresh Patel', 'MANAGEMENT')
ON CONFLICT (id) DO NOTHING;

-- 15. Notifications (Module 16)
CREATE TABLE IF NOT EXISTS notifications (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64),
    target_role VARCHAR(40),
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(40) NOT NULL,
    reference_id VARCHAR(64),
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO notifications (id, user_id, target_role, title, message, type, reference_id, is_read)
VALUES
('notif-01', 'usr-res-1', 'RESIDENT', 'Resolution Proposal Ready for Sign-off', 'Ramesh Kumar proposed a fix for TKT-2024-089 (Master Bathroom Water Pressure). Please inspect and confirm.', 'COMPLAINT', 'cmp-2024-089', FALSE),
('notif-02', NULL, 'MANAGEMENT', 'Low Spare Part Threshold Alert', 'Fleetguard Fuel Water Separator FS1000 is down to 1 unit (Min threshold: 3).', 'INVENTORY', 'sp-03', FALSE)
ON CONFLICT (id) DO NOTHING;

-- 16. Audit Logs (Module 17)
CREATE TABLE IF NOT EXISTS audit_logs (
    id VARCHAR(64) PRIMARY KEY,
    actor_id VARCHAR(64) NOT NULL,
    actor_email VARCHAR(150) NOT NULL,
    actor_name VARCHAR(120) NOT NULL,
    actor_role VARCHAR(40) NOT NULL,
    action VARCHAR(80) NOT NULL,
    entity_type VARCHAR(60) NOT NULL,
    entity_id VARCHAR(64) NOT NULL,
    details TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO audit_logs (id, actor_id, actor_email, actor_name, actor_role, action, entity_type, entity_id, details)
VALUES
('aud-01', 'usr-admin-1', 'vikram.admin@civicops.in', 'Vikram Malhotra', 'ADMIN', 'SYSTEM_BOOTSTRAP', 'DATABASE', 'V4', 'Initialized PostgreSQL governance, inventory ledger, and audit subsystems.')
ON CONFLICT (id) DO NOTHING;

-- 17. Dues Payments (Resident Portal real payment persistence)
CREATE TABLE IF NOT EXISTS dues_payments (
    id VARCHAR(64) PRIMARY KEY,
    unit_id VARCHAR(64) NOT NULL,
    unit_number VARCHAR(30) NOT NULL,
    resident_id VARCHAR(64) NOT NULL,
    amount NUMERIC(10, 2) NOT NULL,
    payment_ref VARCHAR(80) NOT NULL UNIQUE,
    payment_method VARCHAR(40) NOT NULL,
    paid_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
