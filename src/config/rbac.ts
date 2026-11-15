import { UserRole } from '../types';

export const ROLE_ALLOWED_TABS: Record<UserRole, string[]> = {
  RESIDENT: [
    'resident-home',
    'raise-complaint',
    'resolution-timeline',
    'resident-signoff',
    'community-hub',
    'notifications',
    'incident-reporting'
  ],
  MANAGEMENT: [
    'management-overview',
    'complaint-operations',
    'resolution-timeline',
    'recurrence-review-queue',
    'memory-graph',
    'reliability-radar',
    'assigned-work-orders',
    'work-order-details',
    'preventive-maintenance',
    'asset-register',
    'spares-inventory',
    'spares-requisitions',
    'gate-console',
    'visitor-revocation',
    'parcel-hub',
    'residents-directory',
    'incident-reporting',
    'community-hub',
    'notifications',
    'audit-logs'
  ],
  MAINTENANCE: [
    'maintenance-dashboard',
    'assigned-work-orders',
    'work-order-details',
    'inspection-proposal',
    'resolution-timeline',
    'preventive-maintenance',
    'asset-register',
    'spares-inventory',
    'spares-requisitions',
    'memory-graph',
    'reliability-radar',
    'recurrence-review-queue',
    'incident-reporting',
    'community-hub',
    'notifications'
  ],
  SECURITY: [
    'gate-console',
    'visitor-qr-verify',
    'visitor-revocation',
    'parcel-hub',
    'residents-directory',
    'incident-reporting',
    'community-hub',
    'notifications'
  ],
  ADMIN: [
    'management-overview',
    'resident-home',
    'raise-complaint',
    'complaint-operations',
    'resolution-timeline',
    'inspection-proposal',
    'resident-signoff',
    'recurrence-review-queue',
    'memory-graph',
    'reliability-radar',
    'maintenance-dashboard',
    'assigned-work-orders',
    'work-order-details',
    'preventive-maintenance',
    'asset-register',
    'spares-inventory',
    'spares-requisitions',
    'gate-console',
    'visitor-qr-verify',
    'visitor-revocation',
    'parcel-hub',
    'residents-directory',
    'incident-reporting',
    'community-hub',
    'notifications',
    'audit-logs',
    'settings-roles'
  ]
};

export function getDefaultTabForRole(role: UserRole): string {
  switch (role) {
    case 'RESIDENT':
      return 'resident-home';
    case 'MAINTENANCE':
      return 'maintenance-dashboard';
    case 'SECURITY':
      return 'gate-console';
    case 'ADMIN':
      return 'settings-roles';
    case 'MANAGEMENT':
    default:
      return 'management-overview';
  }
}

export function isTabAllowedForRole(role: UserRole, tabId: string): boolean {
  const allowed = ROLE_ALLOWED_TABS[role] || [];
  return allowed.includes(tabId);
}
