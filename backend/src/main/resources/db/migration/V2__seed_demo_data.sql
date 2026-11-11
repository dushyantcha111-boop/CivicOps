-- V2__seed_demo_data.sql: Realistic Seed Data for Green Valley Residency
-- Passwords hashed with BCrypt (plain text: "password123")

INSERT INTO users (id, name, email, phone, password_hash, role, unit_id, unit_number, tower, avatar_url, designation)
VALUES
('usr-res-1', 'Rahul Sharma', 'rahul.sharma@greenvalley.in', '+91 98765 43210', '$2a$10$7EqJtq98hPqEX7fNZaFWoO0L/i2r7zF79J4HkQ06sD.pE33csmrce', 'RESIDENT', 'unit-b-402', 'B-402', 'Tower B', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150', 'Resident Owner'),
('usr-mgmt-1', 'Suresh Patel', 'suresh.patel@civicops.in', '+91 98220 11223', '$2a$10$7EqJtq98hPqEX7fNZaFWoO0L/i2r7zF79J4HkQ06sD.pE33csmrce', 'MANAGEMENT', NULL, NULL, NULL, 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150', 'Estate Lead & General Secretary'),
('usr-maint-1', 'Ramesh Kumar', 'ramesh.kumar@civicops.in', '+91 98450 77889', '$2a$10$7EqJtq98hPqEX7fNZaFWoO0L/i2r7zF79J4HkQ06sD.pE33csmrce', 'MAINTENANCE', NULL, NULL, NULL, 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150', 'Senior MEP Technician'),
('usr-sec-1', 'Satpal Singh', 'satpal.singh@civicops.in', '+91 99112 33445', '$2a$10$7EqJtq98hPqEX7fNZaFWoO0L/i2r7zF79J4HkQ06sD.pE33csmrce', 'SECURITY', NULL, NULL, NULL, 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150', 'Gate 1 Lead Marshall'),
('usr-admin-1', 'Vikram Malhotra', 'vikram.admin@civicops.in', '+91 97110 55667', '$2a$10$7EqJtq98hPqEX7fNZaFWoO0L/i2r7zF79J4HkQ06sD.pE33csmrce', 'ADMIN', NULL, NULL, NULL, 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150', 'Chief Systems Administrator');

INSERT INTO units (id, unit_number, tower, floor, type, owner_name, owner_phone, is_tenant_occupied, dues_amount, dues_status)
VALUES
('unit-b-402', 'B-402', 'Tower B', 4, '3BHK', 'Rahul Sharma', '+91 98765 43210', FALSE, 4250.00, 'DUE'),
('unit-b-401', 'B-401', 'Tower B', 4, '3BHK', 'Priya Nambiar', '+91 98111 22334', TRUE, 0.00, 'PAID'),
('unit-b-403', 'B-403', 'Tower B', 4, '2BHK', 'Sunil Rao', '+91 98333 44556', FALSE, 3800.00, 'OVERDUE'),
('unit-a-101', 'A-101', 'Tower A', 1, '2BHK', 'Deepak Chopra', '+91 98444 55667', FALSE, 0.00, 'PAID'),
('unit-c-204', 'C-204', 'Tower C', 2, '3BHK', 'Amitabh Sengupta', '+91 98666 77889', TRUE, 4250.00, 'DUE');

INSERT INTO assets (id, asset_code, name, category, tower, location, installation_date, warranty_expiry, health_score, status, mtbf_hours, mttr_hours, vendor_name, vendor_contact)
VALUES
('ast-elev-b2', 'AST-ELEV-B2', 'Tower B Passenger Elevator #2', 'Vertical Transportation', 'Tower B', 'Tower B Core Shaft', '2021-04-10', '2023-04-10', 68, 'CRITICAL', 420, 3.2, 'Schindler Elevators India', '+91 80 4455 6677'),
('ast-dg-02', 'AST-DG-02', 'Cummins 500kVA DG Set #2', 'Emergency Power Grid', 'Common Substation', 'Basement 1, Bay 2', '2020-08-15', '2022-08-15', 92, 'UNDER_MAINTENANCE', 1200, 2.5, 'Cummins / Jakson', '+91 1800 233 4455'),
('ast-prv-b4', 'AST-PRV-B4', 'Tower B Water Riser PRV-B4', 'Plumbing & Hydraulic', 'Tower B', 'Tower B, 4th Floor Shaft', '2021-02-20', '2023-02-20', 74, 'DEGRADING', 310, 2.4, 'Watts Water Technologies', '+91 80 2233 1100');

INSERT INTO spare_parts (id, sku, name, category, current_stock, min_threshold, max_capacity, unit_cost, supplier)
VALUES
('sp-01', 'WAT-PRV-KIT-01', 'Watts PRV 1" Silicone Repair Kit', 'Plumbing', 4, 3, 15, 1450.00, 'Apex Fluid Controls'),
('sp-02', 'FLT-LF9009', 'Fleetguard Lube Filter LF9009', 'Power & DG', 2, 4, 10, 2850.00, 'Cummins Direct'),
('sp-03', 'FLT-FS1000', 'Fleetguard Fuel Water Separator FS1000', 'Power & DG', 1, 3, 8, 3100.00, 'Cummins Direct');

INSERT INTO complaints (id, ticket_number, title, description, category, severity, status, tower, unit_number, resident_id, resident_name, resident_phone, assigned_technician_id, assigned_technician_name, sla_deadline, sla_breached, recurrence_warning, recurring_count)
VALUES
('cmp-2024-089', 'TKT-2024-089', 'Severe Low Water Pressure in Master Bathroom Riser', 'Since 7:00 AM today, water flow in the master bathroom shower and washbasin is down to a trickle.', 'PLUMBING', 'HIGH', 'PROPOSED', 'Tower B', 'B-402', 'usr-res-1', 'Rahul Sharma', '+91 98765 43210', 'usr-maint-1', 'Ramesh Kumar', DATE_ADD(NOW(), INTERVAL 4 HOUR), FALSE, '3 similar riser line pressure drops detected in Tower B vertical line over last 14 days.', 3);

INSERT INTO complaint_timeline (id, complaint_id, step_number, title, actor, actor_role, notes, status)
VALUES
('tm-1', 'cmp-2024-089', 1, 'Complaint Registered', 'Rahul Sharma', 'RESIDENT', 'Ticket submitted via resident mobile portal with category Plumbing.', 'SUBMITTED'),
('tm-2', 'cmp-2024-089', 2, 'Management Triage & Priority Set', 'Suresh Patel', 'MANAGEMENT', 'Confirmed Tower B riser impact. Flagged as High Severity.', 'REVIEWED'),
('tm-3', 'cmp-2024-089', 3, 'Assigned to Senior MEP Technician', 'Suresh Patel', 'MANAGEMENT', 'Assigned to Ramesh Kumar (Lead Plumber).', 'ASSIGNED'),
('tm-4', 'cmp-2024-089', 4, 'Physical Inspection & Diagnosis', 'Ramesh Kumar', 'MAINTENANCE', 'Inspected PRV-B4. Tested dynamic pressure (0.6 Bar).', 'INSPECTING'),
('tm-5', 'cmp-2024-089', 5, 'Repair Work & Photographic Proof Logged', 'Ramesh Kumar', 'MAINTENANCE', 'Installed repair kit, verified 2.8 Bar line pressure.', 'INSPECTING'),
('tm-6', 'cmp-2024-089', 6, 'Resolution Proposal Submitted', 'Ramesh Kumar', 'MAINTENANCE', 'Submitted formal proposal with Watts PRV kit requisition. Awaiting resident sign-off.', 'PROPOSED');

INSERT INTO visitor_passes (id, pass_code, six_digit_pin, visitor_name, visitor_phone, visitor_type, vehicle_number, tower, unit_number, resident_name, valid_from, valid_until, status)
VALUES
('vp-01', 'GV-8921', '849201', 'Vikram Joshi (Guest)', '+91 99887 76655', 'GUEST', 'KA-01-MJ-9921', 'Tower B', 'B-402', 'Rahul Sharma', NOW(), DATE_ADD(NOW(), INTERVAL 8 HOUR), 'PRE_APPROVED'),
('vp-02', 'GV-7742', '310928', 'Mahesh (Swiggy Delivery)', '+91 91234 56789', 'DELIVERY', 'KA-05-EX-4412', 'Tower B', 'B-402', 'Rahul Sharma', NOW(), DATE_ADD(NOW(), INTERVAL 1 HOUR), 'ACTIVE');
