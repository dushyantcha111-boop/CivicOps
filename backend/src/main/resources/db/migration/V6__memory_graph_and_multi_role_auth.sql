-- V6__memory_graph_and_multi_role_auth.sql: Multi-role onboarding, approval workflow, invitations, and Memory Graph persistence

ALTER TABLE users ADD COLUMN IF NOT EXISTS requested_role VARCHAR(30);
ALTER TABLE users ADD COLUMN IF NOT EXISTS approval_status VARCHAR(30) DEFAULT 'APPROVED';
ALTER TABLE users ADD COLUMN IF NOT EXISTS society_name VARCHAR(150) DEFAULT 'Green Valley Residency';
ALTER TABLE users ADD COLUMN IF NOT EXISTS society_address VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS staff_badge_id VARCHAR(60);
ALTER TABLE users ADD COLUMN IF NOT EXISTS maintenance_specialization VARCHAR(120);
ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_reference VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS reviewed_by VARCHAR(120);
ALTER TABLE users ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS review_decision_notes TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS invitation_id VARCHAR(64);

-- Ensure all previously seeded / existing active accounts remain backward-compatible
UPDATE users SET approval_status = 'APPROVED' WHERE approval_status IS NULL;
UPDATE users SET requested_role = role WHERE requested_role IS NULL;
UPDATE users SET society_name = 'Green Valley Residency' WHERE society_name IS NULL;

CREATE INDEX IF NOT EXISTS idx_users_approval_status ON users(approval_status);
CREATE INDEX IF NOT EXISTS idx_users_requested_role ON users(requested_role);

CREATE TABLE IF NOT EXISTS invitations (
    id VARCHAR(64) PRIMARY KEY,
    invite_code VARCHAR(80) NOT NULL UNIQUE,
    invited_email VARCHAR(150),
    target_role VARCHAR(30) NOT NULL,
    society_name VARCHAR(150) DEFAULT 'Green Valley Residency',
    designation VARCHAR(120),
    notes VARCHAR(255),
    created_by_id VARCHAR(64) NOT NULL,
    created_by_name VARCHAR(120) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    max_uses INT NOT NULL DEFAULT 1,
    used_count INT NOT NULL DEFAULT 0,
    status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
    used_by_user_id VARCHAR(64),
    used_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_invitations_code ON invitations(invite_code);
CREATE INDEX IF NOT EXISTS idx_invitations_status ON invitations(status);

CREATE TABLE IF NOT EXISTS memory_graph_node_states (
    node_id VARCHAR(128) PRIMARY KEY,
    pos_x DOUBLE PRECISION NOT NULL,
    pos_y DOUBLE PRECISION NOT NULL,
    pinned BOOLEAN DEFAULT FALSE,
    updated_by VARCHAR(120),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
