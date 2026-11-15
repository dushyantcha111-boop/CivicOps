import test from 'node:test';
import assert from 'node:assert/strict';
import { AxiosError, AxiosHeaders } from 'axios';
import { extractApiErrorMessage, getAuthToken, normalizeUser, setAuthToken } from '../services/api.ts';

test('normalizeUser populates role, activeRole, and authorizedRoles defaults cleanly', () => {
  const userFromBackend = normalizeUser({
    id: 'u-101',
    name: 'Vikram Rao',
    email: 'vikram.admin@civicops.in',
    phone: '9999999999',
    activeRole: 'ADMIN',
    avatarUrl: ''
  });

  assert.equal(userFromBackend.role, 'ADMIN');
  assert.equal(userFromBackend.activeRole, 'ADMIN');
  assert.deepEqual(userFromBackend.authorizedRoles, ['ADMIN']);

  const multiRoleUser = normalizeUser({
    id: 'u-102',
    name: 'Suresh Patel',
    email: 'suresh.patel@civicops.in',
    phone: '8888888888',
    role: 'MANAGEMENT',
    authorizedRoles: ['MANAGEMENT', 'RESIDENT'],
    requestedTower: 'Tower B',
    requestedUnitNumber: 'B-402',
    unitVerificationStatus: 'PENDING_VERIFICATION',
    avatarUrl: ''
  });

  assert.equal(multiRoleUser.role, 'MANAGEMENT');
  assert.equal(multiRoleUser.activeRole, 'MANAGEMENT');
  assert.deepEqual(multiRoleUser.authorizedRoles, ['MANAGEMENT', 'RESIDENT']);
  assert.equal(multiRoleUser.requestedTower, 'Tower B');
  assert.equal(multiRoleUser.requestedUnitNumber, 'B-402');
  assert.equal(multiRoleUser.unitVerificationStatus, 'PENDING_VERIFICATION');

  const pendingMaintUser = normalizeUser({
    id: 'u-103',
    name: 'Kiran Verma',
    email: 'kiran@civicops.in',
    phone: '9777777777',
    activeRole: 'MAINTENANCE',
    requestedRole: 'MAINTENANCE',
    approvalStatus: 'PENDING_APPROVAL',
    staffBadgeId: 'MNT-204',
    maintenanceSpecialization: 'HVAC & Chillers',
    societyName: 'Green Valley Residency',
    active: false
  });

  assert.equal(pendingMaintUser.requestedRole, 'MAINTENANCE');
  assert.equal(pendingMaintUser.approvalStatus, 'PENDING_APPROVAL');
  assert.equal(pendingMaintUser.staffBadgeId, 'MNT-204');
  assert.equal(pendingMaintUser.maintenanceSpecialization, 'HVAC & Chillers');
  assert.equal(pendingMaintUser.active, false);
});

test('extractApiErrorMessage parses structured Spring Boot error payloads and network failures', () => {
  const errWithErrorField = new AxiosError('Bad Request', 'ERR_BAD_REQUEST', undefined, undefined, {
    status: 400,
    statusText: 'Bad Request',
    headers: new AxiosHeaders(),
    config: { headers: new AxiosHeaders() },
    data: { error: 'Invalid credentials for account' }
  });
  assert.equal(extractApiErrorMessage(errWithErrorField), 'Invalid credentials for account');

  const networkErr = new AxiosError('Network Error', 'ERR_NETWORK');
  assert.match(extractApiErrorMessage(networkErr), /Verify the Spring Boot server is running/);

  assert.equal(extractApiErrorMessage(new Error('Custom validation failure')), 'Custom validation failure');
  assert.equal(extractApiErrorMessage(null, 'Fallback message'), 'Fallback message');
});

test('setAuthToken stores and clears in-memory JWT token cleanly in Node/SSR environment', () => {
  setAuthToken(null);
  assert.equal(getAuthToken(), null);

  setAuthToken('eyJhbGciOiJIUzI1NiJ9.payload.sig');
  assert.equal(getAuthToken(), 'eyJhbGciOiJIUzI1NiJ9.payload.sig');

  setAuthToken(null);
  assert.equal(getAuthToken(), null);
});
