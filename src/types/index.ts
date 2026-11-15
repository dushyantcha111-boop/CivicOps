export type UserRole = 'RESIDENT' | 'MANAGEMENT' | 'MAINTENANCE' | 'SECURITY' | 'ADMIN';

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  activeRole?: UserRole;
  authorizedRoles?: UserRole[];
  unitId?: string;
  unitNumber?: string;
  tower?: string;
  requestedUnitNumber?: string;
  requestedTower?: string;
  unitVerificationStatus?: 'VERIFIED' | 'PENDING_VERIFICATION' | 'REJECTED' | string;
  avatarUrl: string;
  designation?: string;
  requestedRole?: UserRole;
  approvalStatus?: 'APPROVED' | 'PENDING_APPROVAL' | 'PENDING_VERIFICATION' | 'REJECTED' | string;
  societyName?: string;
  societyAddress?: string;
  staffBadgeId?: string;
  maintenanceSpecialization?: string;
  verificationReference?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  reviewDecisionNotes?: string;
  active?: boolean;
  createdAt?: string;
}

export interface InvitationRecord {
  id: string;
  inviteCode: string;
  invitedEmail?: string;
  targetRole: UserRole;
  societyName: string;
  designation?: string;
  notes?: string;
  createdById: string;
  createdByName: string;
  expiresAt: string;
  maxUses: number;
  usedCount: number;
  status: 'ACTIVE' | 'USED' | 'REVOKED' | 'EXPIRED' | string;
  usedByUserId?: string;
  usedAt?: string;
  createdAt: string;
}

export interface Unit {
  id: string;
  unitNumber: string;
  tower: string;
  floor: number;
  type: '2BHK' | '3BHK' | '4BHK' | 'Penthouse' | string;
  ownerName: string;
  ownerPhone: string;
  isTenantOccupied: boolean;
  tenantName?: string;
  tenantPhone?: string;
  occupancyStatus: 'OCCUPIED' | 'VACANT' | string;
  duesAmount: number;
  duesStatus: 'PAID' | 'DUE' | 'PENDING' | 'OVERDUE';
  registeredVehicles: string[];
  residentUserId?: string;
}

export interface DuesPayment {
  id: string;
  unitId: string;
  unitNumber: string;
  residentId: string;
  amount: number;
  paymentRef: string;
  paymentMethod: string;
  paidAt: string;
}

export type ComplaintStatus =
  | 'SUBMITTED'
  | 'REVIEWED'
  | 'ASSIGNED'
  | 'INSPECTING'
  | 'PROPOSED'
  | 'MANAGEMENT_APPROVED'
  | 'RESIDENT_CONFIRMED'
  | 'DISPUTED'
  | 'CLOSED';

export type ComplaintSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type ComplaintCategory = 'PLUMBING' | 'ELECTRICAL' | 'ELEVATOR' | 'HVAC' | 'CIVIL' | 'SECURITY' | 'COMMON_AREA';

export interface ComplaintTimelineItem {
  id: string;
  stepNumber: number;
  title: string;
  actor: string;
  actorRole: UserRole;
  timestamp: string;
  notes: string;
  status: ComplaintStatus;
  evidenceUrl?: string;
  signature?: string;
}

export interface Complaint {
  id: string;
  ticketNumber: string;
  title: string;
  description: string;
  category: ComplaintCategory;
  severity: ComplaintSeverity;
  status: ComplaintStatus;
  tower: string;
  unitNumber: string;
  residentId: string;
  residentName: string;
  residentPhone: string;
  assetId?: string;
  submittedAt: string;
  updatedAt: string;
  assignedTechnicianId?: string;
  assignedTechnicianName?: string;
  slaDeadline: string;
  slaBreached: boolean;
  recurrenceWarning?: string;
  recurringCount?: number;
  evidenceBefore?: string[];
  evidenceAfter?: string[];
  inspectionNotes?: string;
  proposedResolution?: string;
  proposedSpares?: { partId: string; partName: string; quantity: number }[];
  residentRating?: number;
  residentFeedback?: string;
  disputeReason?: string;
  timeline: ComplaintTimelineItem[];
}

export interface WorkOrder {
  id: string;
  woNumber: string;
  title: string;
  complaintId?: string;
  type: 'CORRECTIVE' | 'PREVENTIVE' | 'EMERGENCY';
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'ON_HOLD' | 'PROPOSAL_SUBMITTED' | 'COMPLETED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  assetId?: string;
  assetName?: string;
  tower: string;
  location: string;
  technicianId: string;
  technicianName: string;
  createdAt: string;
  dueDate: string;
  estimatedHours: number;
  actualHours?: number;
  sparesAllocated: { partId: string; partName: string; quantity: number; fulfilled: boolean }[];
  checklists: { item: string; completed: boolean }[];
  technicianNotes?: string;
}

export interface Asset {
  id: string;
  assetCode: string;
  name: string;
  category: string;
  tower: string;
  location: string;
  installationDate: string;
  warrantyExpiry?: string;
  healthScore: number;
  status: 'OPERATIONAL' | 'DEGRADING' | 'CRITICAL' | 'UNDER_MAINTENANCE';
  mtbfHours: number;
  mttrHours: number;
  lastServicedDate?: string;
  nextScheduledPm?: string;
  vendorName?: string;
  vendorContact?: string;
  activeWorkOrdersCount: number;
}

export interface SparePart {
  id: string;
  sku: string;
  name: string;
  category: string;
  currentStock: number;
  minThreshold: number;
  maxCapacity: number;
  unitCost: number;
  supplier: string;
  leadTimeDays: number;
  compatibleAssets: string[];
}

export interface InventoryMovement {
  id: string;
  partId: string;
  partName: string;
  workOrderId?: string;
  requisitionId?: string;
  movementType: 'RESTOCK' | 'OUTBOUND_REQ' | 'ADJUSTMENT' | string;
  quantity: number;
  balanceAfter: number;
  actorName: string;
  notes?: string;
  createdAt: string;
}

export interface SpareRequisition {
  id: string;
  reqNumber: string;
  workOrderId?: string;
  technicianId: string;
  technicianName: string;
  partId: string;
  partName: string;
  quantity: number;
  urgency: 'ROUTINE' | 'URGENT' | 'EMERGENCY';
  requestedAt: string;
  status: 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'FULFILLED';
  managerNotes?: string;
}

export type VisitorType = 'GUEST' | 'DELIVERY' | 'CAB' | 'SERVICE' | 'CONTRACTOR';
export type PassStatus = 'PRE_APPROVED' | 'ACTIVE' | 'ENTERED' | 'EXITED' | 'EXPIRED' | 'REVOKED' | 'DENIED';

export interface VisitorPass {
  id: string;
  passCode: string;
  sixDigitPin: string;
  visitorName: string;
  visitorPhone: string;
  visitorType: VisitorType;
  vehicleNumber?: string;
  tower: string;
  unitNumber: string;
  residentName: string;
  entryGate: string;
  validFrom: string;
  validUntil: string;
  status: PassStatus;
  checkInTime?: string;
  checkOutTime?: string;
  photoUrl?: string;
  overstayMinutes?: number;
  revocationReason?: string;
}

export interface Parcel {
  id: string;
  trackingNumber: string;
  carrier: 'SWIGGY' | 'ZOMATO' | 'AMAZON' | 'FLIPKART' | 'BLUEDART' | 'OTHER' | string;
  recipientName: string;
  tower: string;
  unitNumber: string;
  deliveryAgentName: string;
  deliveryAgentPhone?: string;
  lockerNumber?: string;
  pickupOtp: string;
  receivedAt: string;
  pickedUpAt?: string;
  status: 'AT_GATE' | 'IN_LOCKER' | 'COLLECTED';
}

export interface IncidentAlert {
  id: string;
  alertCode: string;
  title: string;
  severity: 'WARNING' | 'CRITICAL' | 'SOS_EMERGENCY';
  category: 'FIRE' | 'LIFT_ENTRAPMENT' | 'SECURITY' | 'POWER_OUTAGE' | 'WATER_LEAK' | string;
  tower: string;
  location: string;
  reportedBy: string;
  reportedAt: string;
  status: 'ACTIVE' | 'RESOLVING' | 'RESOLVED';
  broadcastSent: boolean;
  smsSentCount: number;
  actionsTaken: string[];
  resolvedAt?: string;
  resolvedBy?: string;
  resolutionNotes?: string;
}

export interface PreventiveSchedule {
  id: string;
  taskCode: string;
  title: string;
  assetId?: string;
  assetName: string;
  tower: string;
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'ANNUAL';
  nextDueDate: string;
  assignedTeam: string;
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'OVERDUE' | 'COMPLETED';
}

export interface PreventiveCompletionLog {
  id: string;
  scheduleId: string;
  workOrderId?: string;
  completedBy: string;
  notes?: string;
  completedAt: string;
}

export type MemoryGraphNodeType =
  | 'TOWER'
  | 'ASSET'
  | 'COMPLAINT'
  | 'WORK_ORDER'
  | 'TECHNICIAN'
  | 'PREVENTIVE_SCHEDULE'
  | 'RECURRENCE_INVESTIGATION'
  | 'SPARE_PART';

export interface MemoryGraphNode {
  id: string;
  sourceId: string;
  sourceType: MemoryGraphNodeType;
  label: string;
  type: MemoryGraphNodeType;
  category: string;
  status: string;
  tower: string;
  details: string;
  provenance?: string;
  createdAt?: string;
  updatedAt?: string;
  metadata?: Record<string, any>;
  posX?: number;
  posY?: number;
  pinned?: boolean;
}

export interface MemoryGraphEdge {
  id: string;
  source: string;
  target: string;
  relationship: string;
  label: string;
  provenance?: string;
  createdAt?: string;
  metadata?: Record<string, any>;
}

export interface MemoryGraphData {
  nodes: MemoryGraphNode[];
  edges: MemoryGraphEdge[];
  totalNodes: number;
  totalEdges: number;
  scopeRole?: string;
  availableNodeTypes?: string[];
  availableRelationships?: string[];
  generatedAt: string;
}

export interface MemoryGraphNodeDetail {
  node: MemoryGraphNode;
  incomingEdges: MemoryGraphEdge[];
  outgoingEdges: MemoryGraphEdge[];
  connectedNodes: MemoryGraphNode[];
  generatedAt: string;
}

export interface MemoryGraphExpandData {
  rootNodeId: string;
  nodes: MemoryGraphNode[];
  edges: MemoryGraphEdge[];
  generatedAt: string;
}

export interface MemoryGraphPathStep {
  fromNodeId: string;
  fromLabel: string;
  toNodeId: string;
  toLabel: string;
  edgeId: string;
  relationship: string;
  direction: 'OUTGOING' | 'INCOMING' | string;
  label: string;
}

export interface MemoryGraphPathResult {
  found: boolean;
  fromNodeId: string;
  toNodeId: string;
  hopCount: number;
  pathNodeIds: string[];
  pathEdgeIds: string[];
  steps: MemoryGraphPathStep[];
}

export interface ReliabilityRadarData {
  overallReliabilityScore: number;
  slaCompliancePercentage: number;
  averageAssetHealthScore: number;
  pmCompliancePercentage: number;
  workOrderCompletionPercentage: number;
  recurrenceStabilityPercentage: number;
  towerScores: Record<string, number>;
  radarAxes: { axis: string; score: number; assetCount: number; openComplaints: number }[];
  evidenceCounts: Record<string, number>;
  methodology: string;
  sourceOfTruth: string;
  lastCalculatedAt: string;
}

export interface RecurrenceCluster {
  id: string;
  clusterCode: string;
  title: string;
  tower: string;
  category: string;
  assetId?: string;
  assetName?: string;
  severity: string;
  incidentCount: number;
  timeWindowDays: number;
  status: string;
  rootCause?: string;
  suggestedFix?: string;
  capexEstimate?: string;
  investigationNotes?: string;
  followUpAction?: string;
  investigatedBy?: string;
  updatedAt?: string;
  relatedComplaints: {
    id: string;
    ticketNumber: string;
    title: string;
    status: string;
    severity: string;
    proposedResolution?: string;
    submittedAt: string;
  }[];
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  category: string;
  tower: string;
  pinned: boolean;
  authorName: string;
  authorRole: string;
  publishedAt: string;
}

export interface CommunityEvent {
  id: string;
  title: string;
  description: string;
  location: string;
  tower: string;
  eventDate: string;
  organizer: string;
  rsvpCount: number;
  status: string;
}

export interface CommunityDocument {
  id: string;
  title: string;
  category: string;
  description?: string;
  fileUrl: string;
  fileSize: string;
  uploadedBy: string;
  visibilityRole: string;
  uploadedAt: string;
}

export interface AppNotification {
  id: string;
  userId?: string;
  targetRole?: string;
  title: string;
  message: string;
  type: string;
  referenceId?: string;
  isRead: boolean;
  createdAt: string;
}

export interface AuditLogEntry {
  id: string;
  actorId: string;
  actorEmail: string;
  actorName: string;
  actorRole: string;
  action: string;
  entityType: string;
  entityId: string;
  details?: string;
  createdAt: string;
}
