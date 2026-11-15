ALTER TABLE users ADD COLUMN IF NOT EXISTS requested_unit_number VARCHAR(30);
ALTER TABLE users ADD COLUMN IF NOT EXISTS requested_tower VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS unit_verification_status VARCHAR(30) DEFAULT 'VERIFIED';

UPDATE users SET unit_verification_status = 'VERIFIED' WHERE unit_verification_status IS NULL;

CREATE INDEX IF NOT EXISTS idx_user_unit_verification ON users(unit_verification_status);
