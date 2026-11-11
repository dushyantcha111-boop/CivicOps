-- V1__init_schema.sql: CivicOps Smart Apartment Community Platform Database Schema (PostgreSQL)

CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    phone VARCHAR(30) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(30) NOT NULL,
    unit_id VARCHAR(64),
    unit_number VARCHAR(30),
    tower VARCHAR(50),
    avatar_url VARCHAR(500),
    designation VARCHAR(120),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_user_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_user_tower_unit ON users(tower, unit_number);

CREATE TABLE IF NOT EXISTS units (
    id VARCHAR(64) PRIMARY KEY,
    unit_number VARCHAR(30) NOT NULL UNIQUE,
    tower VARCHAR(50) NOT NULL,
    floor INT NOT NULL,
    type VARCHAR(30) NOT NULL,
    owner_name VARCHAR(120) NOT NULL,
    owner_phone VARCHAR(30) NOT NULL,
    is_tenant_occupied BOOLEAN DEFAULT FALSE,
    tenant_name VARCHAR(120),
    tenant_phone VARCHAR(30),
    occupancy_status VARCHAR(30) DEFAULT 'OCCUPIED',
    dues_amount NUMERIC(10, 2) DEFAULT 0.00,
    dues_status VARCHAR(20) DEFAULT 'PAID',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_units_tower ON units(tower);

CREATE TABLE IF NOT EXISTS assets (
    id VARCHAR(64) PRIMARY KEY,
    asset_code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(150) NOT NULL,
    category VARCHAR(80) NOT NULL,
    tower VARCHAR(50) NOT NULL,
    location VARCHAR(150) NOT NULL,
    installation_date DATE,
    warranty_expiry DATE,
    health_score INT NOT NULL DEFAULT 100,
    status VARCHAR(30) DEFAULT 'OPERATIONAL',
    mtbf_hours INT DEFAULT 1000,
    mttr_hours NUMERIC(5, 2) DEFAULT 2.0,
    last_serviced_date DATE,
    next_scheduled_pm DATE,
    vendor_name VARCHAR(150),
    vendor_contact VARCHAR(150),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_asset_status ON assets(status);
CREATE INDEX IF NOT EXISTS idx_asset_tower ON assets(tower);

CREATE TABLE IF NOT EXISTS spare_parts (
    id VARCHAR(64) PRIMARY KEY,
    sku VARCHAR(60) NOT NULL UNIQUE,
    name VARCHAR(150) NOT NULL,
    category VARCHAR(80) NOT NULL,
    current_stock INT NOT NULL DEFAULT 0,
    min_threshold INT NOT NULL DEFAULT 5,
    max_capacity INT NOT NULL DEFAULT 50,
    unit_cost NUMERIC(10, 2) NOT NULL,
    supplier VARCHAR(150),
    lead_time_days INT DEFAULT 3,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS complaints (
    id VARCHAR(64) PRIMARY KEY,
    ticket_number VARCHAR(50) NOT NULL UNIQUE,
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(50) NOT NULL,
    severity VARCHAR(30) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'SUBMITTED',
    tower VARCHAR(50) NOT NULL,
    unit_number VARCHAR(30) NOT NULL,
    resident_id VARCHAR(64) NOT NULL,
    resident_name VARCHAR(120) NOT NULL,
    resident_phone VARCHAR(30) NOT NULL,
    assigned_technician_id VARCHAR(64),
    assigned_technician_name VARCHAR(120),
    sla_deadline TIMESTAMP NOT NULL,
    sla_breached BOOLEAN DEFAULT FALSE,
    recurrence_warning VARCHAR(255),
    recurring_count INT DEFAULT 1,
    inspection_notes TEXT,
    proposed_resolution TEXT,
    resident_rating INT,
    resident_feedback TEXT,
    dispute_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_complaint_resident FOREIGN KEY (resident_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_complaint_status ON complaints(status);
CREATE INDEX IF NOT EXISTS idx_complaint_tower_cat ON complaints(tower, category);

CREATE TABLE IF NOT EXISTS complaint_timeline (
    id VARCHAR(64) PRIMARY KEY,
    complaint_id VARCHAR(64) NOT NULL,
    step_number INT NOT NULL,
    title VARCHAR(150) NOT NULL,
    actor VARCHAR(120) NOT NULL,
    actor_role VARCHAR(50) NOT NULL,
    notes TEXT,
    status VARCHAR(50) NOT NULL,
    evidence_url VARCHAR(500),
    signature VARCHAR(255),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_timeline_complaint FOREIGN KEY (complaint_id) REFERENCES complaints(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_timeline_complaint ON complaint_timeline(complaint_id);

CREATE TABLE IF NOT EXISTS work_orders (
    id VARCHAR(64) PRIMARY KEY,
    wo_number VARCHAR(50) NOT NULL UNIQUE,
    title VARCHAR(200) NOT NULL,
    complaint_id VARCHAR(64),
    type VARCHAR(30) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'SCHEDULED',
    priority VARCHAR(30) NOT NULL,
    asset_id VARCHAR(64),
    tower VARCHAR(50) NOT NULL,
    location VARCHAR(150) NOT NULL,
    technician_id VARCHAR(64) NOT NULL,
    technician_name VARCHAR(120) NOT NULL,
    due_date TIMESTAMP NOT NULL,
    estimated_hours NUMERIC(4, 2) DEFAULT 2.0,
    actual_hours NUMERIC(4, 2),
    technician_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_wo_complaint FOREIGN KEY (complaint_id) REFERENCES complaints(id) ON DELETE SET NULL,
    CONSTRAINT fk_wo_asset FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_wo_status ON work_orders(status);

CREATE TABLE IF NOT EXISTS visitor_passes (
    id VARCHAR(64) PRIMARY KEY,
    pass_code VARCHAR(40) NOT NULL UNIQUE,
    six_digit_pin VARCHAR(10) NOT NULL,
    visitor_name VARCHAR(120) NOT NULL,
    visitor_phone VARCHAR(30) NOT NULL,
    visitor_type VARCHAR(30) NOT NULL,
    vehicle_number VARCHAR(40),
    tower VARCHAR(50) NOT NULL,
    unit_number VARCHAR(30) NOT NULL,
    resident_name VARCHAR(120) NOT NULL,
    entry_gate VARCHAR(60) DEFAULT 'Gate 1',
    valid_from TIMESTAMP NOT NULL,
    valid_until TIMESTAMP NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'PRE_APPROVED',
    check_in_time TIMESTAMP NULL,
    check_out_time TIMESTAMP NULL,
    overstay_minutes INT DEFAULT 0,
    revocation_reason VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_pass_pin ON visitor_passes(six_digit_pin);
CREATE INDEX IF NOT EXISTS idx_pass_status ON visitor_passes(status);

CREATE TABLE IF NOT EXISTS parcels (
    id VARCHAR(64) PRIMARY KEY,
    tracking_number VARCHAR(60) NOT NULL UNIQUE,
    carrier VARCHAR(30) NOT NULL,
    recipient_name VARCHAR(120) NOT NULL,
    tower VARCHAR(50) NOT NULL,
    unit_number VARCHAR(30) NOT NULL,
    delivery_agent_name VARCHAR(120) NOT NULL,
    delivery_agent_phone VARCHAR(30),
    locker_number VARCHAR(60),
    pickup_otp VARCHAR(10) NOT NULL,
    received_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    picked_up_at TIMESTAMP NULL,
    status VARCHAR(30) DEFAULT 'IN_LOCKER'
);

CREATE INDEX IF NOT EXISTS idx_parcel_otp ON parcels(pickup_otp);

CREATE TABLE IF NOT EXISTS incident_alerts (
    id VARCHAR(64) PRIMARY KEY,
    alert_code VARCHAR(50) NOT NULL UNIQUE,
    title VARCHAR(200) NOT NULL,
    severity VARCHAR(30) NOT NULL,
    category VARCHAR(30) NOT NULL,
    tower VARCHAR(50) NOT NULL,
    location VARCHAR(150) NOT NULL,
    reported_by VARCHAR(120) NOT NULL,
    reported_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(30) DEFAULT 'ACTIVE',
    broadcast_sent BOOLEAN DEFAULT TRUE,
    sms_sent_count INT DEFAULT 480
);
