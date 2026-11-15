import axios, { AxiosError } from 'axios';
import {
  Announcement,
  AppNotification,
  Asset,
  AuditLogEntry,
  CommunityDocument,
  CommunityEvent,
  Complaint,
  DuesPayment,
  IncidentAlert,
  InventoryMovement,
  InvitationRecord,
  MemoryGraphData,
  MemoryGraphExpandData,
  MemoryGraphNodeDetail,
  MemoryGraphPathResult,
  Parcel,
  PreventiveCompletionLog,
  PreventiveSchedule,
  RecurrenceCluster,
  ReliabilityRadarData,
  SparePart,
  SpareRequisition,
  Unit,
  User,
  UserRole,
  VisitorPass,
  WorkOrder
} from '../types';

export const apiClient = axios.create({
  baseURL: import.meta.env?.VITE_API_BASE_URL || '/api/v1',
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 15000
});

let currentJwtToken: string | null =
  typeof window !== 'undefined' ? sessionStorage.getItem('civicops_token') : null;

let unauthorizedHandler: (() => void) | null = null;

export const registerUnauthorizedHandler = (handler: (() => void) | null) => {
  unauthorizedHandler = handler;
};

export const setAuthToken = (token: string | null) => {
  currentJwtToken = token;
  if (typeof window !== 'undefined') {
    if (token) {
      sessionStorage.setItem('civicops_token', token);
    } else {
      sessionStorage.removeItem('civicops_token');
    }
  }
};

export const getAuthToken = () => currentJwtToken;

export function normalizeUser(raw: any): User {
  if (!raw) return raw;
  const resolvedRole: UserRole = raw.role || raw.activeRole || 'RESIDENT';
  return {
    ...raw,
    role: resolvedRole,
    activeRole: raw.activeRole || resolvedRole,
    authorizedRoles:
      Array.isArray(raw.authorizedRoles) && raw.authorizedRoles.length > 0
        ? raw.authorizedRoles
        : [resolvedRole]
  };
}

export function extractApiErrorMessage(err: unknown, fallback = 'Operation failed'): string {
  const axiosErr = err as AxiosError<{ error?: string; message?: string } | string>;
  const data = axiosErr?.response?.data;
  if (data) {
    if (typeof data === 'string' && data.trim()) {
      return data;
    }
    if (typeof data === 'object') {
      if (data.error) {
        return data.error;
      }
      if (data.message) {
        return data.message;
      }
    }
  }
  if (axiosErr?.code === 'ECONNABORTED' || axiosErr?.message === 'Network Error') {
    return 'Unable to reach CivicOps backend API. Verify the Spring Boot server is running.';
  }
  if (err instanceof Error && err.message) {
    return err.message;
  }
  return fallback;
}

apiClient.interceptors.request.use((config) => {
  if (currentJwtToken) {
    config.headers.Authorization = `Bearer ${currentJwtToken}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<any>) => {
    const reqUrl = error.config?.url || '';
    const isAuthEndpoint =
      reqUrl.includes('/auth/login') ||
      reqUrl.includes('/auth/register') ||
      reqUrl.includes('/auth/accept-invitation') ||
      reqUrl.includes('/auth/invitations/validate');
    if (error.response?.status === 401 && !isAuthEndpoint && currentJwtToken) {
      setAuthToken(null);
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('civicops_user');
      }
      if (unauthorizedHandler) {
        unauthorizedHandler();
      }
    }
    const enrichedErr: any = new Error(extractApiErrorMessage(error));
    if (error.response?.data && typeof error.response.data === 'object') {
      enrichedErr.approvalStatus = error.response.data.approvalStatus;
      enrichedErr.reviewDecisionNotes = error.response.data.reviewDecisionNotes;
      enrichedErr.requestedRole = error.response.data.requestedRole;
    }
    return Promise.reject(enrichedErr);
  }
);

export const ApiService = {
  // Authentication
  async login(
    email: string,
    password: string
  ): Promise<{ token: string; user: User; authorizedRoles: UserRole[]; requiresRoleSelection: boolean }> {
    const res = await apiClient.post('/auth/login', { email, password });
    const { token, user, authorizedRoles, requiresRoleSelection } = res.data;
    setAuthToken(token);
    return {
      token,
      user: normalizeUser(user),
      authorizedRoles,
      requiresRoleSelection: Boolean(requiresRoleSelection)
    };
  },

  async register(data: {
    name: string;
    email: string;
    phone: string;
    password: string;
    requestedRole?: UserRole;
    tower?: string;
    unitNumber?: string;
    societyName?: string;
    societyAddress?: string;
    designation?: string;
    staffBadgeId?: string;
    maintenanceSpecialization?: string;
    verificationReference?: string;
    invitationCode?: string;
  }): Promise<{
    token?: string;
    user: User;
    authorizedRoles: UserRole[];
    pendingApproval: boolean;
    approvalStatus: string;
    message?: string;
  }> {
    const res = await apiClient.post('/auth/register', data);
    const { token, user, authorizedRoles, pendingApproval, approvalStatus, message } = res.data;
    if (token && !pendingApproval) {
      setAuthToken(token);
    }
    return {
      token,
      user: normalizeUser(user),
      authorizedRoles: authorizedRoles || [user?.role || 'RESIDENT'],
      pendingApproval: Boolean(pendingApproval),
      approvalStatus: approvalStatus || (pendingApproval ? 'PENDING_APPROVAL' : 'APPROVED'),
      message
    };
  },

  async validateInvitation(code: string): Promise<{
    valid: boolean;
    targetRole: UserRole;
    societyName: string;
    designation?: string;
    emailLocked: boolean;
    invitedEmailHint?: string;
    expiresAt: string;
  }> {
    const res = await apiClient.get('/auth/invitations/validate', { params: { code } });
    return res.data;
  },

  async acceptInvitation(data: {
    inviteCode: string;
    name: string;
    email: string;
    phone: string;
    password: string;
    tower?: string;
    staffBadgeId?: string;
    maintenanceSpecialization?: string;
  }): Promise<{
    token: string;
    user: User;
    authorizedRoles: UserRole[];
    requiresRoleSelection: boolean;
    message?: string;
  }> {
    const res = await apiClient.post('/auth/accept-invitation', data);
    const { token, user, authorizedRoles, requiresRoleSelection, message } = res.data;
    if (token) {
      setAuthToken(token);
    }
    return {
      token,
      user: normalizeUser(user),
      authorizedRoles: authorizedRoles || [user?.role || 'RESIDENT'],
      requiresRoleSelection: Boolean(requiresRoleSelection),
      message
    };
  },

  async forgotPassword(email: string): Promise<{ message: string }> {
    const res = await apiClient.post('/auth/forgot-password', { email });
    return res.data;
  },

  async getCurrentUser(): Promise<User> {
    const res = await apiClient.get('/auth/me');
    return normalizeUser(res.data);
  },

  async switchRole(role: UserRole): Promise<{ token: string; user: User; authorizedRoles: UserRole[] }> {
    const res = await apiClient.post('/auth/switch-role', { role });
    const data = res.data;
    if (data.token) {
      setAuthToken(data.token);
    }
    const normalized = normalizeUser(data.user || data);
    return {
      token: data.token || currentJwtToken || '',
      user: normalized,
      authorizedRoles: data.authorizedRoles || normalized.authorizedRoles || [role]
    };
  },

  async logout(): Promise<void> {
    try {
      if (currentJwtToken) {
        await apiClient.post('/auth/logout');
      }
    } finally {
      setAuthToken(null);
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('civicops_user');
      }
    }
  },

  // Admin & Staff Directory
  async getUsers(): Promise<User[]> {
    const res = await apiClient.get('/users');
    return (res.data || []).map(normalizeUser);
  },

  async getTechnicians(): Promise<User[]> {
    const res = await apiClient.get('/users/technicians');
    return (res.data || []).map(normalizeUser);
  },

  async createUser(data: {
    name: string;
    email: string;
    phone: string;
    password: string;
    authorizedRoles: UserRole[];
    tower?: string;
    unitNumber?: string;
    designation?: string;
  }): Promise<User> {
    const res = await apiClient.post('/users', data);
    return normalizeUser(res.data);
  },

  async updateUserRoles(userId: string, authorizedRoles: UserRole[]): Promise<User> {
    const res = await apiClient.put(`/users/${userId}/roles`, { authorizedRoles });
    return normalizeUser(res.data);
  },

  async updateUserStatus(userId: string, active: boolean): Promise<User> {
    const res = await apiClient.put(`/users/${userId}/status`, { active });
    return normalizeUser(res.data);
  },

  async getPendingUnitVerifications(): Promise<User[]> {
    const res = await apiClient.get('/users/pending-verifications');
    return (res.data || []).map(normalizeUser);
  },

  async getPendingRegistrations(): Promise<User[]> {
    const res = await apiClient.get('/users/pending-registrations');
    return (res.data || []).map(normalizeUser);
  },

  async reviewRegistration(
    userId: string,
    payload: { approve: boolean; tower?: string; unitNumber?: string; notes?: string }
  ): Promise<User> {
    const res = await apiClient.post(`/users/${userId}/review-registration`, payload);
    return normalizeUser(res.data);
  },

  async getInvitations(): Promise<InvitationRecord[]> {
    const res = await apiClient.get('/users/invitations');
    return res.data || [];
  },

  async createInvitation(payload: {
    targetRole: UserRole;
    invitedEmail?: string;
    societyName?: string;
    designation?: string;
    notes?: string;
    expiresInHours?: number;
  }): Promise<InvitationRecord> {
    const res = await apiClient.post('/users/invitations', payload);
    return res.data;
  },

  async revokeInvitation(invitationId: string): Promise<InvitationRecord> {
    const res = await apiClient.post(`/users/invitations/${invitationId}/revoke`);
    return res.data;
  },

  async verifyUnitClaim(
    userId: string,
    payload: { approve: boolean; tower?: string; unitNumber?: string; notes?: string }
  ): Promise<User> {
    const res = await apiClient.post(`/users/${userId}/verify-unit`, payload);
    return normalizeUser(res.data);
  },

  // Complaints & 9-step Resolution Trust Timeline
  async getComplaints(): Promise<Complaint[]> {
    const res = await apiClient.get('/complaints');
    return res.data;
  },

  async getComplaintById(id: string): Promise<Complaint> {
    const res = await apiClient.get(`/complaints/${id}`);
    return res.data;
  },

  async createComplaint(data: {
    title: string;
    description: string;
    category: Complaint['category'];
    severity: Complaint['severity'];
    tower: string;
    unitNumber: string;
    assetId?: string;
    evidenceBefore?: string[];
  }): Promise<Complaint> {
    const res = await apiClient.post('/complaints', data);
    return res.data;
  },

  async reviewComplaint(complaintId: string, reviewerName: string, notes: string): Promise<Complaint> {
    const res = await apiClient.post(`/complaints/${complaintId}/review`, { reviewerName, notes });
    return res.data;
  },

  async assignComplaint(
    complaintId: string,
    technicianId: string,
    assignerName: string,
    notes?: string
  ): Promise<Complaint> {
    const res = await apiClient.post(`/complaints/${complaintId}/assign`, { technicianId, assignerName, notes });
    return res.data;
  },

  async recordInspection(
    complaintId: string,
    technicianName: string,
    inspectionNotes: string,
    evidenceUrls: string[]
  ): Promise<Complaint> {
    const res = await apiClient.post(`/complaints/${complaintId}/inspection`, {
      technicianName,
      inspectionNotes,
      evidenceUrl: evidenceUrls[0] || ''
    });
    return res.data;
  },

  async submitResolutionProposal(
    complaintId: string,
    technicianName: string,
    data: {
      proposedResolution: string;
      evidenceAfterUrls: string[];
      sparesUsed: { partId: string; partName: string; quantity: number }[];
    }
  ): Promise<Complaint> {
    const res = await apiClient.post(`/complaints/${complaintId}/propose-resolution`, {
      technicianName,
      resolutionDescription: data.proposedResolution,
      evidenceUrl: data.evidenceAfterUrls[0] || '',
      proposedSpares: data.sparesUsed
    });
    return res.data;
  },

  async approveResolutionProposal(complaintId: string, managerName: string, notes?: string): Promise<Complaint> {
    const res = await apiClient.post(`/complaints/${complaintId}/approve-proposal`, {
      reviewerName: managerName,
      notes
    });
    return res.data;
  },

  async rejectResolutionProposal(complaintId: string, reason: string): Promise<Complaint> {
    const res = await apiClient.post(`/complaints/${complaintId}/reject-proposal`, { reason });
    return res.data;
  },

  async residentConfirmResolution(
    complaintId: string,
    residentName: string,
    rating: number,
    feedback: string,
    signatureData?: string
  ): Promise<Complaint> {
    const res = await apiClient.post(`/complaints/${complaintId}/confirm`, {
      residentName,
      rating,
      feedback,
      signature: signatureData
    });
    return res.data;
  },

  async residentDisputeResolution(
    complaintId: string,
    residentName: string,
    disputeReason: string
  ): Promise<Complaint> {
    const res = await apiClient.post(`/complaints/${complaintId}/dispute`, { residentName, disputeReason });
    return res.data;
  },

  // Work Orders & Maintenance
  async getWorkOrders(): Promise<WorkOrder[]> {
    const res = await apiClient.get('/work-orders');
    return res.data;
  },

  async updateWorkOrderStatus(
    id: string,
    status: WorkOrder['status'],
    technicianNotes?: string,
    actualHours?: number
  ): Promise<WorkOrder> {
    const res = await apiClient.put(`/work-orders/${id}/status`, { status, technicianNotes, actualHours });
    return res.data;
  },

  async updateWorkOrderChecklist(
    id: string,
    checklists: { item: string; completed: boolean }[],
    technicianNotes?: string
  ): Promise<WorkOrder> {
    const res = await apiClient.put(`/work-orders/${id}/checklist`, { checklists, technicianNotes });
    return res.data;
  },

  // Assets & Inventory Traceability
  async getAssets(): Promise<Asset[]> {
    const res = await apiClient.get('/assets');
    return res.data;
  },

  async createAsset(data: {
    name: string;
    category: string;
    tower: string;
    location: string;
    assetCode?: string;
    vendorName?: string;
    vendorContact?: string;
    healthScore?: number;
  }): Promise<Asset> {
    const res = await apiClient.post('/assets', data);
    return res.data;
  },

  async getSpares(): Promise<SparePart[]> {
    const res = await apiClient.get('/spares');
    return res.data;
  },

  async getInventoryMovements(partId?: string): Promise<InventoryMovement[]> {
    const res = await apiClient.get('/inventory/movements', { params: partId ? { partId } : undefined });
    return res.data;
  },

  async reorderSpare(partId: string, quantity: number): Promise<SparePart> {
    const res = await apiClient.post(`/spares/${partId}/reorder`, { quantity });
    return res.data;
  },

  async getRequisitions(): Promise<SpareRequisition[]> {
    const res = await apiClient.get('/requisitions');
    return res.data;
  },

  async createRequisition(data: {
    workOrderId?: string;
    partId: string;
    quantity: number;
    urgency: SpareRequisition['urgency'];
  }): Promise<SpareRequisition> {
    const res = await apiClient.post('/requisitions', data);
    return res.data;
  },

  async updateRequisitionStatus(
    id: string,
    status: 'APPROVED' | 'REJECTED',
    managerNotes?: string
  ): Promise<SpareRequisition> {
    const endpoint = status === 'APPROVED' ? `/requisitions/${id}/approve` : `/requisitions/${id}/reject`;
    const res = await apiClient.post(endpoint, { notes: managerNotes });
    return res.data;
  },

  // Visitors & Gate Lifecycle
  async getVisitorPasses(): Promise<VisitorPass[]> {
    const res = await apiClient.get('/visitors');
    return res.data;
  },

  async createVisitorPass(data: {
    visitorName: string;
    visitorPhone: string;
    visitorType: VisitorPass['visitorType'];
    vehicleNumber?: string;
    tower?: string;
    unitNumber?: string;
    residentName?: string;
    validHours?: number;
  }): Promise<VisitorPass> {
    const res = await apiClient.post('/visitors/pre-approve', data);
    return res.data;
  },

  async verifyAndCheckInVisitor(codeOrPin: string): Promise<VisitorPass> {
    const res = await apiClient.post('/visitors/verify', { codeOrPin });
    return res.data;
  },

  async checkOutVisitor(passId: string): Promise<VisitorPass> {
    const res = await apiClient.post(`/visitors/${passId}/check-out`);
    return res.data;
  },

  async revokeVisitorPass(passId: string, reason: string): Promise<VisitorPass> {
    const res = await apiClient.post(`/visitors/${passId}/revoke`, { reason });
    return res.data;
  },

  async checkInWalkInVisitor(data: {
    name: string;
    phone: string;
    purpose: string;
    tower: string;
    unitNumber: string;
    vehicleNumber?: string;
  }): Promise<VisitorPass> {
    const res = await apiClient.post('/visitors/walk-in', data);
    return res.data;
  },

  // Parcels & Deliveries
  async getParcels(): Promise<Parcel[]> {
    const res = await apiClient.get('/parcels');
    return res.data;
  },

  async createParcel(data: {
    carrier: string;
    recipientName: string;
    tower: string;
    unitNumber: string;
    deliveryAgentName: string;
    deliveryAgentPhone?: string;
    lockerNumber?: string;
    trackingNumber?: string;
  }): Promise<Parcel> {
    const res = await apiClient.post('/parcels', data);
    return res.data;
  },

  async markParcelCollected(parcelId: string, otp?: string): Promise<Parcel> {
    const res = await apiClient.post(`/parcels/${parcelId}/collect`, otp ? { otp } : {});
    return res.data;
  },

  // Emergency SOS & Incidents
  async getIncidents(): Promise<IncidentAlert[]> {
    const res = await apiClient.get('/incidents');
    return res.data;
  },

  async triggerEmergencySos(data: {
    title: string;
    category: IncidentAlert['category'];
    tower: string;
    location: string;
    severity?: IncidentAlert['severity'];
  }): Promise<IncidentAlert> {
    const res = await apiClient.post('/incidents/sos', data);
    return res.data;
  },

  async resolveIncident(incidentId: string, notes: string): Promise<IncidentAlert> {
    const res = await apiClient.post(`/incidents/${incidentId}/resolve`, { notes });
    return res.data;
  },

  // Units & Dues
  async getUnits(): Promise<Unit[]> {
    const res = await apiClient.get('/units');
    return res.data;
  },

  async createUnit(data: {
    unitNumber: string;
    tower: string;
    floor: number;
    type: string;
    ownerName: string;
    ownerPhone: string;
    isTenantOccupied?: boolean;
    tenantName?: string;
    tenantPhone?: string;
    duesAmount?: number;
    registeredVehicles?: string[];
  }): Promise<Unit> {
    const res = await apiClient.post('/units', data);
    return res.data;
  },

  async payUnitDues(
    unitId: string,
    paymentMethod = 'Manual / Demo Ledger Entry'
  ): Promise<{ unit: Unit; payment: DuesPayment }> {
    const res = await apiClient.post(`/units/${unitId}/pay-dues`, { paymentMethod });
    return res.data;
  },

  async getDuesPayments(): Promise<DuesPayment[]> {
    const res = await apiClient.get('/units/payments');
    return res.data;
  },

  // Preventive Maintenance Intelligence
  async getPreventiveSchedules(): Promise<PreventiveSchedule[]> {
    const res = await apiClient.get('/preventive-schedules');
    return res.data;
  },

  async getPreventiveLogs(): Promise<PreventiveCompletionLog[]> {
    const res = await apiClient.get('/preventive-schedules/logs');
    return res.data;
  },

  async createPreventiveSchedule(data: {
    title: string;
    assetId?: string;
    assetName?: string;
    tower: string;
    frequency: PreventiveSchedule['frequency'];
    nextDueDate?: string;
    assignedTeam: string;
  }): Promise<PreventiveSchedule> {
    const res = await apiClient.post('/preventive-schedules', data);
    return res.data;
  },

  async syncOverdueSchedules(): Promise<PreventiveSchedule[]> {
    const res = await apiClient.post('/preventive-schedules/sync-overdue');
    return res.data;
  },

  async generatePmWorkOrder(scheduleId: string, technicianId?: string): Promise<WorkOrder> {
    const res = await apiClient.post(`/preventive-schedules/${scheduleId}/generate-work-order`, { technicianId });
    return res.data;
  },

  async completePreventiveCycle(
    scheduleId: string,
    notes: string,
    workOrderId?: string
  ): Promise<{ schedule: PreventiveSchedule; completionLog: PreventiveCompletionLog }> {
    const res = await apiClient.post(`/preventive-schedules/${scheduleId}/complete`, { notes, workOrderId });
    return res.data;
  },

  // Intelligence Analytics & Memory Graph
  async getMemoryGraph(params?: {
    tower?: string;
    nodeType?: string;
    relationship?: string;
    q?: string;
  }): Promise<MemoryGraphData> {
    const res = await apiClient.get('/analytics/memory-graph', { params });
    return res.data;
  },

  async getMemoryGraphNode(nodeId: string): Promise<MemoryGraphNodeDetail> {
    const res = await apiClient.get(`/analytics/memory-graph/nodes/${encodeURIComponent(nodeId)}`);
    return res.data;
  },

  async expandMemoryGraphNode(nodeId: string): Promise<MemoryGraphExpandData> {
    const res = await apiClient.get(`/analytics/memory-graph/nodes/${encodeURIComponent(nodeId)}/expand`);
    return res.data;
  },

  async searchMemoryGraph(q: string): Promise<MemoryGraphData> {
    const res = await apiClient.get('/analytics/memory-graph/search', { params: { q } });
    return res.data;
  },

  async findMemoryGraphPath(from: string, to: string): Promise<MemoryGraphPathResult> {
    const res = await apiClient.get('/analytics/memory-graph/path', { params: { from, to } });
    return res.data;
  },

  async saveMemoryGraphLayout(
    positions: { nodeId: string; posX: number; posY: number; pinned?: boolean }[]
  ): Promise<{ savedCount: number }> {
    const res = await apiClient.put('/analytics/memory-graph/layout', positions);
    return res.data;
  },

  async resetMemoryGraphLayout(): Promise<void> {
    await apiClient.delete('/analytics/memory-graph/layout');
  },

  async getReliabilityRadar(): Promise<ReliabilityRadarData> {
    const res = await apiClient.get('/analytics/reliability-radar');
    return res.data;
  },

  async getRecurrenceQueue(windowDays = 30): Promise<RecurrenceCluster[]> {
    const res = await apiClient.get('/analytics/recurrence-queue', { params: { windowDays } });
    return res.data;
  },

  async investigateRecurrence(
    clusterId: string,
    payload: {
      status: string;
      rootCause?: string;
      suggestedFix?: string;
      capexEstimate?: string;
      investigationNotes?: string;
      followUpAction?: string;
      createPreventiveSchedule?: boolean;
      createWorkOrder?: boolean;
    }
  ): Promise<any> {
    const res = await apiClient.post(`/analytics/recurrence-queue/${clusterId}/investigate`, payload);
    return res.data;
  },

  // Modules 14-17: Community Hub, Documents, Notifications, Audit Logs
  async getAnnouncements(): Promise<Announcement[]> {
    const res = await apiClient.get('/announcements');
    return res.data;
  },

  async createAnnouncement(data: {
    title: string;
    content: string;
    category: string;
    tower: string;
    pinned?: boolean;
  }): Promise<Announcement> {
    const res = await apiClient.post('/announcements', data);
    return res.data;
  },

  async deleteAnnouncement(id: string): Promise<void> {
    await apiClient.delete(`/announcements/${id}`);
  },

  async getEvents(): Promise<CommunityEvent[]> {
    const res = await apiClient.get('/events');
    return res.data;
  },

  async createEvent(data: {
    title: string;
    description: string;
    location: string;
    tower: string;
    eventDate: string;
  }): Promise<CommunityEvent> {
    const res = await apiClient.post('/events', data);
    return res.data;
  },

  async rsvpEvent(id: string): Promise<CommunityEvent> {
    const res = await apiClient.post(`/events/${id}/rsvp`);
    return res.data;
  },

  async getDocuments(): Promise<CommunityDocument[]> {
    const res = await apiClient.get('/documents');
    return res.data;
  },

  async createDocument(data: {
    title: string;
    category: string;
    description?: string;
    fileUrl: string;
    fileSize?: string;
    visibilityRole?: string;
  }): Promise<CommunityDocument> {
    const res = await apiClient.post('/documents', data);
    return res.data;
  },

  async deleteDocument(id: string): Promise<void> {
    await apiClient.delete(`/documents/${id}`);
  },

  async getNotifications(): Promise<AppNotification[]> {
    const res = await apiClient.get('/notifications');
    return res.data;
  },

  async markNotificationRead(id: string): Promise<AppNotification> {
    const res = await apiClient.post(`/notifications/${id}/read`);
    return res.data;
  },

  async markAllNotificationsRead(): Promise<void> {
    await apiClient.post('/notifications/read-all');
  },

  async getAuditLogs(): Promise<AuditLogEntry[]> {
    const res = await apiClient.get('/audit-logs');
    return res.data;
  }
};
