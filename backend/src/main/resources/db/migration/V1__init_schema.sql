-- V1__init_schema.sql: CivicOps Smart Apartment Community Platform Database Schema
-- Target: MySQL 8.0+

CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    phone VARCHAR(30) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('RESIDENT', 'MANAGEMENT', 'MAINTENANCE', 'SECURITY', 'ADMIN') NOT NULL,
    unit_id VARCHAR(64),
    unit_number VARCHAR(30),
    tower VARCHAR(50),
    avatar_url VARCHAR(500),
    designation VARCHAR(120),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_user_role (role),
    INDEX idx_user_tower_unit (tower, unit_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
    dues_amount DECIMAL(10, 2) DEFAULT 0.00,
    dues_status ENUM('PAID', 'DUE', 'OVERDUE') DEFAULT 'PAID',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_units_tower (tower)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
    status ENUM('OPERATIONAL', 'DEGRADING', 'CRITICAL', 'UNDER_MAINTENANCE') DEFAULT 'OPERATIONAL',
    mtbf_hours INT DEFAULT 1000,
    mttr_hours DECIMAL(5, 2) DEFAULT 2.0,
    last_serviced_date DATE,
    next_scheduled_pm DATE,
    vendor_name VARCHAR(150),
    vendor_contact VARCHAR(150),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_asset_status (status),
    INDEX idx_asset_tower (tower)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS spare_parts (
    id VARCHAR(64) PRIMARY KEY,
    sku VARCHAR(60) NOT NULL UNIQUE,
    name VARCHAR(150) NOT NULL,
    category VARCHAR(80) NOT NULL,
    current_stock INT NOT NULL DEFAULT 0,
    min_threshold INT NOT NULL DEFAULT 5,
    max_capacity INT NOT NULL DEFAULT 50,
    unit_cost DECIMAL(10, 2) NOT NULL,
    supplier VARCHAR(150),
    lead_time_days INT DEFAULT 3,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS complaints (
    id VARCHAR(64) PRIMARY KEY,
    ticket_number VARCHAR(50) NOT NULL UNIQUE,
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    category ENUM('PLUMBING', 'ELECTRICAL', 'ELEVATOR', 'HVAC', 'CIVIL', 'SECURITY', 'COMMON_AREA') NOT NULL,
    severity ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL') NOT NULL,
    status ENUM('SUBMITTED', 'REVIEWED', 'ASSIGNED', 'INSPECTING', 'PROPOSED', 'MANAGEMENT_APPROVED', 'RESIDENT_CONFIRMED', 'DISPUTED', 'CLOSED') NOT NULL DEFAULT 'SUBMITTED',
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
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_complaint_status (status),
    INDEX idx_complaint_tower_cat (tower, category),
    CONSTRAINT fk_complaint_resident FOREIGN KEY (resident_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
    INDEX idx_timeline_complaint (complaint_id),
    CONSTRAINT fk_timeline_complaint FOREIGN KEY (complaint_id) REFERENCES complaints(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS work_orders (
    id VARCHAR(64) PRIMARY KEY,
    wo_number VARCHAR(50) NOT NULL UNIQUE,
    title VARCHAR(200) NOT NULL,
    complaint_id VARCHAR(64),
    type ENUM('CORRECTIVE', 'PREVENTIVE', 'EMERGENCY') NOT NULL,
    status ENUM('SCHEDULED', 'IN_PROGRESS', 'ON_HOLD', 'PROPOSAL_SUBMITTED', 'COMPLETED') NOT NULL DEFAULT 'SCHEDULED',
    priority ENUM('LOW', 'MEDIUM', 'HIGH', 'URGENT') NOT NULL,
    asset_id VARCHAR(64),
    tower VARCHAR(50) NOT NULL,
    location VARCHAR(150) NOT NULL,
    technician_id VARCHAR(64) NOT NULL,
    technician_name VARCHAR(120) NOT NULL,
    due_date TIMESTAMP NOT NULL,
    estimated_hours DECIMAL(4, 2) DEFAULT 2.0,
    actual_hours DECIMAL(4, 2),
    technician_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_wo_status (status),
    CONSTRAINT fk_wo_complaint FOREIGN KEY (complaint_id) REFERENCES complaints(id) ON DELETE SET NULL,
    CONSTRAINT fk_wo_asset FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS visitor_passes (
    id VARCHAR(64) PRIMARY KEY,
    pass_code VARCHAR(40) NOT NULL UNIQUE,
    six_digit_pin VARCHAR(10) NOT NULL,
    visitor_name VARCHAR(120) NOT NULL,
    visitor_phone VARCHAR(30) NOT NULL,
    visitor_type ENUM('GUEST', 'DELIVERY', 'CAB', 'SERVICE', 'CONTRACTOR') NOT NULL,
    vehicle_number VARCHAR(40),
    tower VARCHAR(50) NOT NULL,
    unit_number VARCHAR(30) NOT NULL,
    resident_name VARCHAR(120) NOT NULL,
    entry_gate VARCHAR(60) DEFAULT 'Gate 1',
    valid_from TIMESTAMP NOT NULL,
    valid_until TIMESTAMP NOT NULL,
    status ENUM('PRE_APPROVED', 'ACTIVE', 'ENTERED', 'EXITED', 'EXPIRED', 'REVOKED', 'DENIED') NOT NULL DEFAULT 'PRE_APPROVED',
    check_in_time TIMESTAMP NULL,
    check_out_time TIMESTAMP NULL,
    overstay_minutes INT DEFAULT 0,
    revocation_reason VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_pass_pin (six_digit_pin),
    INDEX idx_pass_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS parcels (
    id VARCHAR(64) PRIMARY KEY,
    tracking_number VARCHAR(60) NOT NULL UNIQUE,
    carrier ENUM('SWIGGY', 'ZOMATO', 'AMAZON', 'FLIPKART', 'BLUEDART', 'OTHER') NOT NULL,
    recipient_name VARCHAR(120) NOT NULL,
    tower VARCHAR(50) NOT NULL,
    unit_number VARCHAR(30) NOT NULL,
    delivery_agent_name VARCHAR(120) NOT NULL,
    delivery_agent_phone VARCHAR(30),
    locker_number VARCHAR(60),
    pickup_otp VARCHAR(10) NOT NULL,
    received_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    picked_up_at TIMESTAMP NULL,
    status ENUM('AT_GATE', 'IN_LOCKER', 'COLLECTED') DEFAULT 'IN_LOCKER',
    INDEX idx_parcel_otp (pickup_otp)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS incident_alerts (
    id VARCHAR(64) PRIMARY KEY,
    alert_code VARCHAR(50) NOT NULL UNIQUE,
    title VARCHAR(200) NOT NULL,
    severity ENUM('WARNING', 'CRITICAL', 'SOS_EMERGENCY') NOT NULL,
    category ENUM('FIRE', 'LIFT_ENTRAPMENT', 'SECURITY', 'POWER_OUTAGE', 'WATER_LEAK') NOT NULL,
    tower VARCHAR(50) NOT NULL,
    location VARCHAR(150) NOT NULL,
    reported_by VARCHAR(120) NOT NULL,
    reported_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status ENUM('ACTIVE', 'RESOLVING', 'RESOLVED') DEFAULT 'ACTIVE',
    broadcast_sent BOOLEAN DEFAULT TRUE,
    sms_sent_count INT DEFAULT 480
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
