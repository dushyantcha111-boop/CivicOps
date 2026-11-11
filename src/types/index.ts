export type UserRole = 'RESIDENT' | 'MANAGEMENT' | 'MAINTENANCE' | 'SECURITY' | 'ADMIN';

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  unitId?: string;
  unitNumber?: string;
  tower?: string;
  avatarUrl: string;
  designation?: string;
}

export interface Unit {
  id: string;
  unitNumber: string;
  tower: string;
  floor: number;
  type: '2BHK' | '3BHK' | '4BHK' | 'Penthouse';
  ownerName: string;
  ownerPhone: string;
  isTenantOccupied: boolean;
  tenantName?: string;
  tenantPhone?: string;
  occupancyStatus: 'OCCUPIED' | 'VACANT';
  duesAmount: number;
  duesStatus: 'PAID' | 'DUE' | 'OVERDUE';
  registeredVehicles: string[];
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
  warrantyExpiry: string;
  healthScore: number; // 0 - 100
  status: 'OPERATIONAL' | 'DEGRADING' | 'CRITICAL' | 'UNDER_MAINTENANCE';
  mtbfHours: number;
  mttrHours: number;
  lastServicedDate: string;
  nextScheduledPm: string;
  vendorName: string;
  vendorContact: string;
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

export interface SpareRequisition {
  id: string;
  reqNumber: string;
  workOrderId: string;
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
  passCode: string; // e.g. "GV-8921"
  sixDigitPin: string; // e.g. "849201"
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
  carrier: 'SWIGGY' | 'ZOMATO' | 'AMAZON' | 'FLIPKART' | 'BLUEDART' | 'OTHER';
  recipientName: string;
  tower: string;
  unitNumber: string;
  deliveryAgentName: string;
  deliveryAgentPhone: string;
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
  category: 'FIRE' | 'LIFT_ENTRAPMENT' | 'SECURITY' | 'POWER_OUTAGE' | 'WATER_LEAK';
  tower: string;
  location: string;
  reportedBy: string;
  reportedAt: string;
  status: 'ACTIVE' | 'RESOLVING' | 'RESOLVED';
  broadcastSent: boolean;
  smsSentCount: number;
  actionsTaken: string[];
}

export interface PreventiveSchedule {
  id: string;
  taskCode: string;
  title: string;
  assetName: string;
  tower: string;
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY';
  nextDueDate: string;
  assignedTeam: string;
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'OVERDUE' | 'COMPLETED';
}
