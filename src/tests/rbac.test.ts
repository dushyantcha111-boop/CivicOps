import test from 'node:test';
import assert from 'node:assert/strict';
import { getDefaultTabForRole, isTabAllowedForRole, ROLE_ALLOWED_TABS } from '../config/rbac.ts';

test('RBAC default tabs are always included in allowed tabs for every role', () => {
  const roles = Object.keys(ROLE_ALLOWED_TABS) as Array<keyof typeof ROLE_ALLOWED_TABS>;
  for (const role of roles) {
    const defaultTab = getDefaultTabForRole(role);
    assert.equal(
      isTabAllowedForRole(role, defaultTab),
      true,
      `Expected default tab ${defaultTab} to be allowed for role ${role}`
    );
  }
});

test('Audit logs and settings-roles are restricted to MANAGEMENT and ADMIN', () => {
  assert.equal(isTabAllowedForRole('RESIDENT', 'audit-logs'), false);
  assert.equal(isTabAllowedForRole('MAINTENANCE', 'audit-logs'), false);
  assert.equal(isTabAllowedForRole('SECURITY', 'audit-logs'), false);
  assert.equal(isTabAllowedForRole('MANAGEMENT', 'audit-logs'), true);
  assert.equal(isTabAllowedForRole('ADMIN', 'audit-logs'), true);

  assert.equal(isTabAllowedForRole('RESIDENT', 'settings-roles'), false);
  assert.equal(isTabAllowedForRole('SECURITY', 'settings-roles'), false);
  assert.equal(isTabAllowedForRole('ADMIN', 'settings-roles'), true);
});

test('All authenticated roles can access community-hub and notifications', () => {
  const roles = Object.keys(ROLE_ALLOWED_TABS) as Array<keyof typeof ROLE_ALLOWED_TABS>;
  for (const role of roles) {
    assert.equal(isTabAllowedForRole(role, 'community-hub'), true);
    assert.equal(isTabAllowedForRole(role, 'notifications'), true);
  }
});

test('Security guard role cannot access complaint-operations or asset-register', () => {
  assert.equal(isTabAllowedForRole('SECURITY', 'complaint-operations'), false);
  assert.equal(isTabAllowedForRole('SECURITY', 'asset-register'), false);
  assert.equal(isTabAllowedForRole('SECURITY', 'gate-console'), true);
  assert.equal(isTabAllowedForRole('SECURITY', 'visitor-qr-verify'), true);
});

test('Resident role can manage own visitor passes and parcels but cannot access admin or triage queues', () => {
  assert.equal(isTabAllowedForRole('RESIDENT', 'resident-home'), true);
  assert.equal(isTabAllowedForRole('RESIDENT', 'visitor-revocation'), true);
  assert.equal(isTabAllowedForRole('RESIDENT', 'parcel-hub'), true);
  assert.equal(isTabAllowedForRole('RESIDENT', 'complaint-operations'), false);
  assert.equal(isTabAllowedForRole('RESIDENT', 'residents-directory'), false);
});
