import axios from 'axios';
import {
  DEMO_USERS,
  INITIAL_UNITS,
  INITIAL_COMPLAINTS,
  INITIAL_WORK_ORDERS,
  INITIAL_ASSETS,
  INITIAL_SPARES,
  INITIAL_REQUISITIONS,
  INITIAL_VISITOR_PASSES,
  INITIAL_PARCELS,
  INITIAL_INCIDENTS,
  INITIAL_PREVENTIVE_SCHEDULES
} from '../data/initialData';
import {
  User,
  Unit,
  Complaint,
  ComplaintStatus,
  WorkOrder,
  Asset,
  SparePart,
  SpareRequisition,
  VisitorPass,
  Parcel,
  IncidentAlert,
  PreventiveSchedule
} from '../types';

const STORAGE_KEY_PREFIX = 'civicops_data_v1_';

function getStored<T>(key: string, defaultValue: T): T {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PREFIX + key);
    if (!raw) return defaultValue;
    return JSON.parse(raw);
  } catch (e) {
    console.warn('Error reading from localStorage', e);
    return defaultValue;
  }
}

function setStored<T>(key: string, value: T): void {
  try {
    localStorage.setItem(STORAGE_KEY_PREFIX + key, JSON.stringify(value));
  } catch (e) {
    console.warn('Error writing to localStorage', e);
  }
}

// In-memory / persistent repository
class LocalDatabase {
  users: User[] = getStored('users', DEMO_USERS);
  units: Unit[] = getStored('units', INITIAL_UNITS);
  complaints: Complaint[] = getStored('complaints', INITIAL_COMPLAINTS);
  workOrders: WorkOrder[] = getStored('workOrders', INITIAL_WORK_ORDERS);
  assets: Asset[] = getStored('assets', INITIAL_ASSETS);
  spares: SparePart[] = getStored('spares', INITIAL_SPARES);
  requisitions: SpareRequisition[] = getStored('requisitions', INITIAL_REQUISITIONS);
  visitorPasses: VisitorPass[] = getStored('visitorPasses', INITIAL_VISITOR_PASSES);
  parcels: Parcel[] = getStored('parcels', INITIAL_PARCELS);
  incidents: IncidentAlert[] = getStored('incidents', INITIAL_INCIDENTS);
  preventiveSchedules: PreventiveSchedule[] = getStored('preventiveSchedules', INITIAL_PREVENTIVE_SCHEDULES);

  saveAll() {
    setStored('users', this.users);
    setStored('units', this.units);
    setStored('complaints', this.complaints);
    setStored('workOrders', this.workOrders);
    setStored('assets', this.assets);
    setStored('spares', this.spares);
    setStored('requisitions', this.requisitions);
    setStored('visitorPasses', this.visitorPasses);
    setStored('parcels', this.parcels);
    setStored('incidents', this.incidents);
    setStored('preventiveSchedules', this.preventiveSchedules);
  }

  resetToDefaults() {
    this.users = [...DEMO_USERS];
    this.units = [...INITIAL_UNITS];
    this.complaints = [...INITIAL_COMPLAINTS];
    this.workOrders = [...INITIAL_WORK_ORDERS];
    this.assets = [...INITIAL_ASSETS];
    this.spares = [...INITIAL_SPARES];
    this.requisitions = [...INITIAL_REQUISITIONS];
    this.visitorPasses = [...INITIAL_VISITOR_PASSES];
    this.parcels = [...INITIAL_PARCELS];
    this.incidents = [...INITIAL_INCIDENTS];
    this.preventiveSchedules = [...INITIAL_PREVENTIVE_SCHEDULES];
    this.saveAll();
  }
}

export const db = new LocalDatabase();

// Axios instance matching backend base URL
export const apiClient = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Mock network delay helper for realistic UX
const delay = (ms = 180) => new Promise((resolve) => setTimeout(resolve, ms));

// REST API Service layer mirroring Spring Boot endpoints
export const ApiService = {
  // Authentication
  async login(email: string): Promise<{ token: string; user: User }> {
    await delay();
    const user = db.users.find((u) => u.email.toLowerCase() === email.toLowerCase()) || db.users[0];
    const token = `jwt-mock-token-${user.id}-${Date.now()}`;
    return { token, user };
  },

  async getCurrentUser(userId: string): Promise<User> {
    await delay();
    return db.users.find((u) => u.id === userId) || db.users[0];
  },

  // Complaints
  async getComplaints(): Promise<Complaint[]> {
    await delay();
    return [...db.complaints];
  },

  async getComplaintById(id: string): Promise<Complaint | undefined> {
    await delay();
    return db.complaints.find((c) => c.id === id);
  },

  async createComplaint(data: {
    title: string;
    description: string;
    category: Complaint['category'];
    severity: Complaint['severity'];
    tower: string;
    unitNumber: string;
    residentId: string;
    residentName: string;
    residentPhone: string;
    evidenceBefore?: string[];
  }): Promise<Complaint> {
    await delay();
    const ticketSeq = db.complaints.length + 90;
    const ticketNumber = `TKT-2024-${ticketSeq.toString().padStart(3, '0')}`;
    const now = new Date().toISOString();

    // Check for recurrence advisory: find similar complaints in same tower & category
    const similar = db.complaints.filter(
      (c) => c.tower === data.tower && c.category === data.category && c.status !== 'CLOSED'
    );

    let recurrenceWarning: string | undefined = undefined;
    if (similar.length > 0) {
      recurrenceWarning = `${similar.length} recurring issue(s) detected in ${data.tower} under ${data.category} this month.`;
    }

    const newComplaint: Complaint = {
      id: `cmp-${Date.now()}`,
      ticketNumber,
      title: data.title,
      description: data.description,
      category: data.category,
      severity: data.severity,
      status: 'SUBMITTED',
      tower: data.tower,
      unitNumber: data.unitNumber,
      residentId: data.residentId,
      residentName: data.residentName,
      residentPhone: data.residentPhone,
      submittedAt: now,
      updatedAt: now,
      slaDeadline: new Date(Date.now() + 8 * 3600 * 1000).toISOString(),
      slaBreached: false,
      recurrenceWarning,
      recurringCount: similar.length + 1,
      evidenceBefore: data.evidenceBefore || [],
      timeline: [
        {
          id: `tm-${Date.now()}-1`,
          stepNumber: 1,
          title: 'Complaint Registered',
          actor: data.residentName,
          actorRole: 'RESIDENT',
          timestamp: now,
          notes: `Ticket submitted via portal with category ${data.category}.`,
          status: 'SUBMITTED'
        }
      ]
    };

    db.complaints.unshift(newComplaint);
    db.saveAll();
    return newComplaint;
  },

  // Step 2: Management reviews
  async reviewComplaint(complaintId: string, reviewerName: string, notes: string): Promise<Complaint> {
    await delay();
    const complaint = db.complaints.find((c) => c.id === complaintId);
    if (!complaint) throw new Error('Complaint not found');

    const now = new Date().toISOString();
    complaint.status = 'REVIEWED';
    complaint.updatedAt = now;
    complaint.timeline.push({
      id: `tm-${Date.now()}`,
      stepNumber: 2,
      title: 'Management Triage & Priority Set',
      actor: reviewerName,
      actorRole: 'MANAGEMENT',
      timestamp: now,
      notes: notes || 'Reviewed by estate management. Assigned priority SLA.',
      status: 'REVIEWED'
    });

    db.saveAll();
    return complaint;
  },

  // Step 3: Assign to technician
  async assignComplaint(
    complaintId: string,
    technicianId: string,
    assignerName: string,
    notes?: string
  ): Promise<Complaint> {
    await delay();
    const complaint = db.complaints.find((c) => c.id === complaintId);
    if (!complaint) throw new Error('Complaint not found');

    const technician = db.users.find((u) => u.id === technicianId) || db.users[2];
    const now = new Date().toISOString();

    complaint.status = 'ASSIGNED';
    complaint.assignedTechnicianId = technician.id;
    complaint.assignedTechnicianName = technician.name;
    complaint.updatedAt = now;

    // Create corresponding Work Order
    const woSeq = db.workOrders.length + 120;
    const newWo: WorkOrder = {
      id: `wo-${Date.now()}`,
      woNumber: `WO-2024-${woSeq}`,
      title: `${complaint.category}: ${complaint.title}`,
      complaintId: complaint.id,
      type: complaint.severity === 'CRITICAL' ? 'EMERGENCY' : 'CORRECTIVE',
      status: 'IN_PROGRESS',
      priority: complaint.severity === 'CRITICAL' ? 'URGENT' : complaint.severity === 'HIGH' ? 'HIGH' : 'MEDIUM',
      tower: complaint.tower,
      location: `${complaint.tower}, Flat ${complaint.unitNumber}`,
      technicianId: technician.id,
      technicianName: technician.name,
      createdAt: now,
      dueDate: complaint.slaDeadline,
      estimatedHours: 2.5,
      sparesAllocated: [],
      checklists: [
        { item: 'Perform preliminary on-site assessment', completed: false },
        { item: 'Verify isolation and resident presence', completed: false },
        { item: 'Execute root cause troubleshooting', completed: false },
        { item: 'Capture high-resolution evidence photo', completed: false }
      ]
    };
    db.workOrders.unshift(newWo);

    complaint.timeline.push({
      id: `tm-${Date.now()}`,
      stepNumber: 3,
      title: `Assigned to ${technician.name}`,
      actor: assignerName,
      actorRole: 'MANAGEMENT',
      timestamp: now,
      notes: notes || `Dispatched to MEP maintenance lead. Generated ${newWo.woNumber}.`,
      status: 'ASSIGNED'
    });

    db.saveAll();
    return complaint;
  },

  // Step 4 & 5: Record Inspection & Work Progress
  async recordInspection(
    complaintId: string,
    technicianName: string,
    inspectionNotes: string,
    evidenceUrls: string[]
  ): Promise<Complaint> {
    await delay();
    const complaint = db.complaints.find((c) => c.id === complaintId);
    if (!complaint) throw new Error('Complaint not found');

    const now = new Date().toISOString();
    complaint.status = 'INSPECTING';
    complaint.inspectionNotes = inspectionNotes;
    complaint.evidenceBefore = [...(complaint.evidenceBefore || []), ...evidenceUrls];
    complaint.updatedAt = now;

    complaint.timeline.push({
      id: `tm-${Date.now()}`,
      stepNumber: 4,
      title: 'Physical Inspection & Diagnosis',
      actor: technicianName,
      actorRole: 'MAINTENANCE',
      timestamp: now,
      notes: inspectionNotes,
      status: 'INSPECTING',
      evidenceUrl: evidenceUrls[0]
    });

    db.saveAll();
    return complaint;
  },

  // Step 6: Submit Resolution Proposal
  async submitResolutionProposal(
    complaintId: string,
    technicianName: string,
    data: {
      proposedResolution: string;
      evidenceAfterUrls: string[];
      sparesUsed: { partId: string; partName: string; quantity: number }[];
    }
  ): Promise<Complaint> {
    await delay();
    const complaint = db.complaints.find((c) => c.id === complaintId);
    if (!complaint) throw new Error('Complaint not found');

    const now = new Date().toISOString();
    complaint.status = 'PROPOSED';
    complaint.proposedResolution = data.proposedResolution;
    complaint.evidenceAfter = data.evidenceAfterUrls;
    complaint.proposedSpares = data.sparesUsed;
    complaint.updatedAt = now;

    // Update related work order
    const wo = db.workOrders.find((w) => w.complaintId === complaintId);
    if (wo) {
      wo.status = 'PROPOSAL_SUBMITTED';
      wo.technicianNotes = data.proposedResolution;
    }

    complaint.timeline.push({
      id: `tm-${Date.now()}`,
      stepNumber: 6,
      title: 'Resolution Proposal Submitted',
      actor: technicianName,
      actorRole: 'MAINTENANCE',
      timestamp: now,
      notes: `Repair finalized. Proposal: "${data.proposedResolution}". Awaiting resident sign-off.`,
      status: 'PROPOSED',
      evidenceUrl: data.evidenceAfterUrls[0]
    });

    db.saveAll();
    return complaint;
  },

  // Step 7: Management Reviews Proposal
  async approveResolutionProposal(complaintId: string, managerName: string, notes?: string): Promise<Complaint> {
    await delay();
    const complaint = db.complaints.find((c) => c.id === complaintId);
    if (!complaint) throw new Error('Complaint not found');

    const now = new Date().toISOString();
    complaint.status = 'MANAGEMENT_APPROVED';
    complaint.updatedAt = now;

    complaint.timeline.push({
      id: `tm-${Date.now()}`,
      stepNumber: 7,
      title: 'Management Approved Resolution',
      actor: managerName,
      actorRole: 'MANAGEMENT',
      timestamp: now,
      notes: notes || 'Work verified against safety and SLA standards. Sent to resident for final verification.',
      status: 'MANAGEMENT_APPROVED'
    });

    db.saveAll();
    return complaint;
  },

  // Step 8A: Resident Confirms Resolution (Signs off)
  async residentConfirmResolution(
    complaintId: string,
    residentName: string,
    rating: number,
    feedback: string,
    signatureData?: string
  ): Promise<Complaint> {
    await delay();
    const complaint = db.complaints.find((c) => c.id === complaintId);
    if (!complaint) throw new Error('Complaint not found');

    const now = new Date().toISOString();
    complaint.status = 'RESIDENT_CONFIRMED';
    complaint.residentRating = rating;
    complaint.residentFeedback = feedback;
    complaint.updatedAt = now;

    // Mark work order completed
    const wo = db.workOrders.find((w) => w.complaintId === complaintId);
    if (wo) {
      wo.status = 'COMPLETED';
    }

    complaint.timeline.push({
      id: `tm-${Date.now()}`,
      stepNumber: 8,
      title: 'Resident Verified & Signed Off',
      actor: residentName,
      actorRole: 'RESIDENT',
      timestamp: now,
      notes: `Resident accepted resolution with ${rating}/5 stars. Feedback: "${feedback || 'Satisfied'}"`,
      status: 'RESIDENT_CONFIRMED',
      signature: signatureData || 'Digital Signature Verified'
    });

    // Step 9: Final status update
    complaint.timeline.push({
      id: `tm-${Date.now()}-closed`,
      stepNumber: 9,
      title: 'Ticket Closed & Archive Seeded',
      actor: 'CivicOps System Engine',
      actorRole: 'ADMIN',
      timestamp: now,
      notes: 'Resolution verified. Asset MTTR updated in Community Memory Graph.',
      status: 'CLOSED'
    });

    db.saveAll();
    return complaint;
  },

  // Step 8B: Resident Disputes Resolution
  async residentDisputeResolution(complaintId: string, residentName: string, disputeReason: string): Promise<Complaint> {
    await delay();
    const complaint = db.complaints.find((c) => c.id === complaintId);
    if (!complaint) throw new Error('Complaint not found');

    const now = new Date().toISOString();
    complaint.status = 'DISPUTED';
    complaint.disputeReason = disputeReason;
    complaint.updatedAt = now;

    const wo = db.workOrders.find((w) => w.complaintId === complaintId);
    if (wo) {
      wo.status = 'IN_PROGRESS';
    }

    complaint.timeline.push({
      id: `tm-${Date.now()}`,
      stepNumber: 8,
      title: 'Resolution Disputed by Resident',
      actor: residentName,
      actorRole: 'RESIDENT',
      timestamp: now,
      notes: `Dispute raised: "${disputeReason}". Re-opened for management escalation.`,
      status: 'DISPUTED'
    });

    db.saveAll();
    return complaint;
  },

  // Work Orders & Maintenance
  async getWorkOrders(): Promise<WorkOrder[]> {
    await delay();
    return [...db.workOrders];
  },

  async updateWorkOrderStatus(id: string, status: WorkOrder['status']): Promise<WorkOrder> {
    await delay();
    const wo = db.workOrders.find((w) => w.id === id);
    if (!wo) throw new Error('Work order not found');
    wo.status = status;
    db.saveAll();
    return wo;
  },

  async toggleWorkOrderChecklist(id: string, index: number): Promise<WorkOrder> {
    await delay();
    const wo = db.workOrders.find((w) => w.id === id);
    if (!wo) throw new Error('Work order not found');
    if (wo.checklists[index]) {
      wo.checklists[index].completed = !wo.checklists[index].completed;
    }
    db.saveAll();
    return wo;
  },

  // Assets
  async getAssets(): Promise<Asset[]> {
    await delay();
    return [...db.assets];
  },

  // Spares & Inventory
  async getSpares(): Promise<SparePart[]> {
    await delay();
    return [...db.spares];
  },

  async reorderSpare(partId: string, quantity: number): Promise<SparePart> {
    await delay();
    const part = db.spares.find((p) => p.id === partId);
    if (!part) throw new Error('Part not found');
    part.currentStock += quantity;
    db.saveAll();
    return part;
  },

  async getRequisitions(): Promise<SpareRequisition[]> {
    await delay();
    return [...db.requisitions];
  },

  async createRequisition(data: Omit<SpareRequisition, 'id' | 'reqNumber' | 'requestedAt' | 'status'>): Promise<SpareRequisition> {
    await delay();
    const reqSeq = db.requisitions.length + 95;
    const newReq: SpareRequisition = {
      id: `req-${Date.now()}`,
      reqNumber: `REQ-2024-${reqSeq.toString().padStart(3, '0')}`,
      requestedAt: new Date().toISOString(),
      status: 'PENDING_APPROVAL',
      ...data
    };
    db.requisitions.unshift(newReq);
    db.saveAll();
    return newReq;
  },

  async updateRequisitionStatus(id: string, status: 'APPROVED' | 'REJECTED', managerNotes?: string): Promise<SpareRequisition> {
    await delay();
    const req = db.requisitions.find((r) => r.id === id);
    if (!req) throw new Error('Requisition not found');
    req.status = status;
    req.managerNotes = managerNotes;

    // If approved, deduct stock
    if (status === 'APPROVED') {
      const part = db.spares.find((p) => p.id === req.partId);
      if (part && part.currentStock >= req.quantity) {
        part.currentStock -= req.quantity;
      }
    }
    db.saveAll();
    return req;
  },

  // Visitors & Gate Security
  async getVisitorPasses(): Promise<VisitorPass[]> {
    await delay();
    return [...db.visitorPasses];
  },

  async createVisitorPass(data: {
    visitorName: string;
    visitorPhone: string;
    visitorType: VisitorPass['visitorType'];
    vehicleNumber?: string;
    tower: string;
    unitNumber: string;
    residentName: string;
    validHours?: number;
  }): Promise<VisitorPass> {
    await delay();
    const passSeq = Math.floor(1000 + Math.random() * 9000);
    const pin = Math.floor(100000 + Math.random() * 900000).toString();
    const now = new Date();
    const validUntil = new Date(now.getTime() + (data.validHours || 8) * 3600 * 1000).toISOString();

    const newPass: VisitorPass = {
      id: `vp-${Date.now()}`,
      passCode: `GV-${passSeq}`,
      sixDigitPin: pin,
      visitorName: data.visitorName,
      visitorPhone: data.visitorPhone,
      visitorType: data.visitorType,
      vehicleNumber: data.vehicleNumber,
      tower: data.tower,
      unitNumber: data.unitNumber,
      residentName: data.residentName,
      entryGate: 'Gate 1 (Main Entrance)',
      validFrom: now.toISOString(),
      validUntil,
      status: 'PRE_APPROVED'
    };
    db.visitorPasses.unshift(newPass);
    db.saveAll();
    return newPass;
  },

  async verifyAndCheckInVisitor(codeOrPin: string): Promise<VisitorPass> {
    await delay();
    const pass = db.visitorPasses.find(
      (p) =>
        (p.sixDigitPin === codeOrPin || p.passCode.toLowerCase() === codeOrPin.toLowerCase()) &&
        p.status !== 'REVOKED'
    );
    if (!pass) throw new Error('Pass not found or invalid PIN');

    pass.status = 'ENTERED';
    pass.checkInTime = new Date().toISOString();
    db.saveAll();
    return pass;
  },

  async revokeVisitorPass(passId: string, reason: string): Promise<VisitorPass> {
    await delay();
    const pass = db.visitorPasses.find((p) => p.id === passId);
    if (!pass) throw new Error('Pass not found');
    pass.status = 'REVOKED';
    pass.revocationReason = reason;
    db.saveAll();
    return pass;
  },

  async checkInWalkInVisitor(data: {
    name: string;
    phone: string;
    purpose: string;
    tower: string;
    unitNumber: string;
    vehicleNumber?: string;
  }): Promise<VisitorPass> {
    await delay();
    const pin = Math.floor(100000 + Math.random() * 900000).toString();
    const passSeq = Math.floor(1000 + Math.random() * 9000);
    const now = new Date().toISOString();

    const pass: VisitorPass = {
      id: `vp-${Date.now()}`,
      passCode: `GV-${passSeq}`,
      sixDigitPin: pin,
      visitorName: `${data.name} (${data.purpose})`,
      visitorPhone: data.phone,
      visitorType: 'SERVICE',
      vehicleNumber: data.vehicleNumber,
      tower: data.tower,
      unitNumber: data.unitNumber,
      residentName: 'On-Duty Security Verified',
      entryGate: 'Gate 1 (Main Entrance)',
      validFrom: now,
      validUntil: new Date(Date.now() + 4 * 3600 * 1000).toISOString(),
      status: 'ENTERED',
      checkInTime: now
    };
    db.visitorPasses.unshift(pass);
    db.saveAll();
    return pass;
  },

  // Parcels & Deliveries
  async getParcels(): Promise<Parcel[]> {
    await delay();
    return [...db.parcels];
  },

  async markParcelCollected(parcelId: string): Promise<Parcel> {
    await delay();
    const parcel = db.parcels.find((p) => p.id === parcelId);
    if (!parcel) throw new Error('Parcel not found');
    parcel.status = 'COLLECTED';
    parcel.pickedUpAt = new Date().toISOString();
    db.saveAll();
    return parcel;
  },

  // Emergency SOS & Incidents
  async getIncidents(): Promise<IncidentAlert[]> {
    await delay();
    return [...db.incidents];
  },

  async triggerEmergencySos(data: {
    title: string;
    category: IncidentAlert['category'];
    tower: string;
    location: string;
    reportedBy: string;
  }): Promise<IncidentAlert> {
    await delay();
    const incSeq = db.incidents.length + 5;
    const newInc: IncidentAlert = {
      id: `inc-${Date.now()}`,
      alertCode: `SOS-2024-${incSeq.toString().padStart(3, '0')}`,
      title: data.title,
      severity: 'SOS_EMERGENCY',
      category: data.category,
      tower: data.tower,
      location: data.location,
      reportedBy: data.reportedBy,
      reportedAt: new Date().toISOString(),
      status: 'ACTIVE',
      broadcastSent: true,
      smsSentCount: 480,
      actionsTaken: [
        'Automatic siren activated at Main Guardhouse',
        'Emergency response team notified via high-priority push broadcast',
        'Lift lobbies & public address audio warning broadcasted'
      ]
    };
    db.incidents.unshift(newInc);
    db.saveAll();
    return newInc;
  },

  // Units & Residents
  async getUnits(): Promise<Unit[]> {
    await delay();
    return [...db.units];
  },

  async getPreventiveSchedules(): Promise<PreventiveSchedule[]> {
    await delay();
    return [...db.preventiveSchedules];
  }
};
