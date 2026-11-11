import {
  User,
  Unit,
  Complaint,
  WorkOrder,
  Asset,
  SparePart,
  SpareRequisition,
  VisitorPass,
  Parcel,
  IncidentAlert,
  PreventiveSchedule
} from '../types';

export const DEMO_USERS: User[] = [
  {
    id: 'usr-res-1',
    name: 'Rahul Sharma',
    email: 'rahul.sharma@greenvalley.in',
    phone: '+91 98765 43210',
    role: 'RESIDENT',
    unitId: 'unit-b-402',
    unitNumber: 'B-402',
    tower: 'Tower B',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    designation: 'Resident Owner'
  },
  {
    id: 'usr-mgmt-1',
    name: 'Suresh Patel',
    email: 'suresh.patel@civicops.in',
    phone: '+91 98220 11223',
    role: 'MANAGEMENT',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    designation: 'Estate Lead & General Secretary'
  },
  {
    id: 'usr-maint-1',
    name: 'Ramesh Kumar',
    email: 'ramesh.kumar@civicops.in',
    phone: '+91 98450 77889',
    role: 'MAINTENANCE',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    designation: 'Senior MEP Technician'
  },
  {
    id: 'usr-sec-1',
    name: 'Satpal Singh',
    email: 'satpal.singh@civicops.in',
    phone: '+91 99112 33445',
    role: 'SECURITY',
    avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
    designation: 'Gate 1 Lead Marshall'
  },
  {
    id: 'usr-admin-1',
    name: 'Vikram Malhotra',
    email: 'vikram.admin@civicops.in',
    phone: '+91 97110 55667',
    role: 'ADMIN',
    avatarUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80',
    designation: 'Systems Administrator & Auditor'
  }
];

export const INITIAL_UNITS: Unit[] = [
  {
    id: 'unit-b-402',
    unitNumber: 'B-402',
    tower: 'Tower B',
    floor: 4,
    type: '3BHK',
    ownerName: 'Rahul Sharma',
    ownerPhone: '+91 98765 43210',
    isTenantOccupied: false,
    occupancyStatus: 'OCCUPIED',
    duesAmount: 4250,
    duesStatus: 'DUE',
    registeredVehicles: ['KA-05-MM-2041 (Creta)', 'KA-05-JJ-8812 (Activa)']
  },
  {
    id: 'unit-b-401',
    unitNumber: 'B-401',
    tower: 'Tower B',
    floor: 4,
    type: '3BHK',
    ownerName: 'Priya Nambiar',
    ownerPhone: '+91 98111 22334',
    isTenantOccupied: true,
    tenantName: 'Anand Verma',
    tenantPhone: '+91 98222 33445',
    occupancyStatus: 'OCCUPIED',
    duesAmount: 0,
    duesStatus: 'PAID',
    registeredVehicles: ['KA-03-AB-4455']
  },
  {
    id: 'unit-b-403',
    unitNumber: 'B-403',
    tower: 'Tower B',
    floor: 4,
    type: '2BHK',
    ownerName: 'Sunil Rao',
    ownerPhone: '+91 98333 44556',
    isTenantOccupied: false,
    occupancyStatus: 'OCCUPIED',
    duesAmount: 3800,
    duesStatus: 'OVERDUE',
    registeredVehicles: ['KA-01-XY-9001']
  },
  {
    id: 'unit-a-101',
    unitNumber: 'A-101',
    tower: 'Tower A',
    floor: 1,
    type: '2BHK',
    ownerName: 'Deepak Chopra',
    ownerPhone: '+91 98444 55667',
    isTenantOccupied: false,
    occupancyStatus: 'OCCUPIED',
    duesAmount: 0,
    duesStatus: 'PAID',
    registeredVehicles: ['KA-04-P-1122']
  },
  {
    id: 'unit-a-502',
    unitNumber: 'A-502',
    tower: 'Tower A',
    floor: 5,
    type: '4BHK',
    ownerName: 'Kavita Reddy',
    ownerPhone: '+91 98555 66778',
    isTenantOccupied: false,
    occupancyStatus: 'OCCUPIED',
    duesAmount: 0,
    duesStatus: 'PAID',
    registeredVehicles: ['KA-02-C-8899', 'KA-02-C-9900']
  },
  {
    id: 'unit-c-204',
    unitNumber: 'C-204',
    tower: 'Tower C',
    floor: 2,
    type: '3BHK',
    ownerName: 'Amitabh Sengupta',
    ownerPhone: '+91 98666 77889',
    isTenantOccupied: true,
    tenantName: 'Rohit Joshi',
    tenantPhone: '+91 98777 88990',
    occupancyStatus: 'OCCUPIED',
    duesAmount: 4250,
    duesStatus: 'DUE',
    registeredVehicles: ['KA-05-D-3344']
  },
  {
    id: 'unit-d-801',
    unitNumber: 'D-801',
    tower: 'Tower D',
    floor: 8,
    type: 'Penthouse',
    ownerName: 'Meera Deshmukh',
    ownerPhone: '+91 98888 99001',
    isTenantOccupied: false,
    occupancyStatus: 'OCCUPIED',
    duesAmount: 0,
    duesStatus: 'PAID',
    registeredVehicles: ['KA-01-EQ-7700']
  }
];

export const INITIAL_COMPLAINTS: Complaint[] = [
  {
    id: 'cmp-2024-089',
    ticketNumber: 'TKT-2024-089',
    title: 'Severe Low Water Pressure in Master Bathroom Riser',
    description: 'Since 7:00 AM today, water flow in the master bathroom shower and washbasin is down to a trickle. Similar issue was noted by neighbor in B-401.',
    category: 'PLUMBING',
    severity: 'HIGH',
    status: 'PROPOSED', // Reached step 6: technician submitted resolution proposal, awaiting management & resident
    tower: 'Tower B',
    unitNumber: 'B-402',
    residentId: 'usr-res-1',
    residentName: 'Rahul Sharma',
    residentPhone: '+91 98765 43210',
    submittedAt: '2026-11-10T07:45:00Z',
    updatedAt: '2026-11-10T11:20:00Z',
    assignedTechnicianId: 'usr-maint-1',
    assignedTechnicianName: 'Ramesh Kumar',
    slaDeadline: '2026-11-10T15:45:00Z',
    slaBreached: false,
    recurrenceWarning: '3 similar riser line pressure drops detected in Tower B vertical line over last 14 days.',
    recurringCount: 3,
    evidenceBefore: [
      'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=600&auto=format&fit=crop&q=80'
    ],
    evidenceAfter: [
      'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=600&auto=format&fit=crop&q=80'
    ],
    inspectionNotes: 'Inspected 4th floor pressure reducing valve (PRV-B4) and strainer. Found calcium scaling and clogged bronze mesh in the inlet union.',
    proposedResolution: 'Dismantled PRV-B4, cleared particulate sediment, replaced damaged silicone diaphragm with OEM Watts kit, calibrated output pressure to 2.8 Bar.',
    proposedSpares: [
      { partId: 'sp-01', partName: 'Watts PRV 1" Silicone Repair Kit', quantity: 1 }
    ],
    timeline: [
      {
        id: 'tm-1',
        stepNumber: 1,
        title: 'Complaint Registered',
        actor: 'Rahul Sharma',
        actorRole: 'RESIDENT',
        timestamp: '2026-11-10T07:45:00Z',
        notes: 'Ticket submitted via resident mobile portal with category Plumbing.',
        status: 'SUBMITTED'
      },
      {
        id: 'tm-2',
        stepNumber: 2,
        title: 'Management Triage & Priority Set',
        actor: 'Suresh Patel',
        actorRole: 'MANAGEMENT',
        timestamp: '2026-11-10T08:10:00Z',
        notes: 'Confirmed Tower B riser impact. Flagged as High Severity (SLA 8h).',
        status: 'REVIEWED'
      },
      {
        id: 'tm-3',
        stepNumber: 3,
        title: 'Assigned to Senior MEP Technician',
        actor: 'Suresh Patel',
        actorRole: 'MANAGEMENT',
        timestamp: '2026-11-10T08:15:00Z',
        notes: 'Assigned to Ramesh Kumar (Lead Plumber). WO-2024-118 generated.',
        status: 'ASSIGNED'
      },
      {
        id: 'tm-4',
        stepNumber: 4,
        title: 'Physical Inspection & Diagnosis',
        actor: 'Ramesh Kumar',
        actorRole: 'MAINTENANCE',
        timestamp: '2026-11-10T09:30:00Z',
        notes: 'Inspected floor shaft PRV and riser manifold. Tested dynamic pressure (0.6 Bar).',
        status: 'INSPECTING'
      },
      {
        id: 'tm-5',
        stepNumber: 5,
        title: 'Repair Work & Photographic Proof Logged',
        actor: 'Ramesh Kumar',
        actorRole: 'MAINTENANCE',
        timestamp: '2026-11-10T10:45:00Z',
        notes: 'Installed repair kit, flushed airlocks from riser, verified 2.8 Bar line pressure.',
        status: 'INSPECTING',
        evidenceUrl: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=600&auto=format&fit=crop&q=80'
      },
      {
        id: 'tm-6',
        stepNumber: 6,
        title: 'Resolution Proposal Submitted',
        actor: 'Ramesh Kumar',
        actorRole: 'MAINTENANCE',
        timestamp: '2026-11-10T11:20:00Z',
        notes: 'Submitted formal proposal with Watts PRV kit requisition. Awaiting management sign-off.',
        status: 'PROPOSED'
      }
    ]
  },
  {
    id: 'cmp-2024-092',
    ticketNumber: 'TKT-2024-092',
    title: 'Elevator #2 Jerking and Floor Leveling Mismatch',
    description: 'Lift 2 stops approximately 2 inches below the 5th floor landing floor and gives an audible grinding vibration during deceleration.',
    category: 'ELEVATOR',
    severity: 'CRITICAL',
    status: 'ASSIGNED',
    tower: 'Tower B',
    unitNumber: 'Common Shaft',
    residentId: 'usr-mgmt-1',
    residentName: 'Suresh Patel',
    residentPhone: '+91 98220 11223',
    submittedAt: '2026-11-11T02:30:00Z',
    updatedAt: '2026-11-11T03:15:00Z',
    assignedTechnicianId: 'usr-maint-1',
    assignedTechnicianName: 'Ramesh Kumar',
    slaDeadline: '2026-11-11T06:30:00Z',
    slaBreached: false,
    recurrenceWarning: 'Schindler AMC team flagged leveling sensor calibration 3 weeks ago.',
    recurringCount: 2,
    timeline: [
      {
        id: 'tm-elev-1',
        stepNumber: 1,
        title: 'Elevator Anomaly Detected',
        actor: 'Satpal Singh',
        actorRole: 'SECURITY',
        timestamp: '2026-11-11T02:30:00Z',
        notes: 'Reported by resident at 02:25 AM. Lift grounded to 1st floor.',
        status: 'SUBMITTED'
      },
      {
        id: 'tm-elev-2',
        stepNumber: 2,
        title: 'Emergency Priority Escalation',
        actor: 'Suresh Patel',
        actorRole: 'MANAGEMENT',
        timestamp: '2026-11-11T02:50:00Z',
        notes: 'Safety interlock checked. Schindler rapid dispatch contacted.',
        status: 'REVIEWED'
      },
      {
        id: 'tm-elev-3',
        stepNumber: 3,
        title: 'Assigned for Machine Room Inspection',
        actor: 'Suresh Patel',
        actorRole: 'MANAGEMENT',
        timestamp: '2026-11-11T03:15:00Z',
        notes: 'Ramesh Kumar on-site to inspect VFD brake resistor and door optical vane.',
        status: 'ASSIGNED'
      }
    ]
  },
  {
    id: 'cmp-2024-077',
    ticketNumber: 'TKT-2024-077',
    title: 'Intermittent Corridor Lighting Flickering',
    description: 'Emergency corridor lights on 2nd floor Tower C flicker repeatedly between 6 PM and 10 PM.',
    category: 'ELECTRICAL',
    severity: 'LOW',
    status: 'RESIDENT_CONFIRMED',
    tower: 'Tower C',
    unitNumber: 'C-204',
    residentId: 'usr-res-1',
    residentName: 'Rohit Joshi',
    residentPhone: '+91 98777 88990',
    submittedAt: '2026-11-06T14:00:00Z',
    updatedAt: '2026-11-07T16:00:00Z',
    assignedTechnicianId: 'usr-maint-1',
    assignedTechnicianName: 'Ramesh Kumar',
    slaDeadline: '2026-11-08T14:00:00Z',
    slaBreached: false,
    residentRating: 5,
    residentFeedback: 'Fixed promptly on the same day. Very courteous technician.',
    timeline: [
      {
        id: 'tm-c-1',
        stepNumber: 1,
        title: 'Complaint Logged',
        actor: 'Rohit Joshi',
        actorRole: 'RESIDENT',
        timestamp: '2026-11-06T14:00:00Z',
        notes: 'Reported corridor light issue.',
        status: 'SUBMITTED'
      },
      {
        id: 'tm-c-2',
        stepNumber: 2,
        title: 'Assigned to Ramesh Kumar',
        actor: 'Suresh Patel',
        actorRole: 'MANAGEMENT',
        timestamp: '2026-11-06T15:00:00Z',
        notes: 'Dispatched for bulb and choke replacement.',
        status: 'ASSIGNED'
      },
      {
        id: 'tm-c-3',
        stepNumber: 5,
        title: 'LED Driver Replaced',
        actor: 'Ramesh Kumar',
        actorRole: 'MAINTENANCE',
        timestamp: '2026-11-07T10:00:00Z',
        notes: 'Replaced faulty 18W Philips surge driver.',
        status: 'PROPOSED'
      },
      {
        id: 'tm-c-4',
        stepNumber: 7,
        title: 'Management Approved Resolution',
        actor: 'Suresh Patel',
        actorRole: 'MANAGEMENT',
        timestamp: '2026-11-07T11:00:00Z',
        notes: 'Passed QA inspection.',
        status: 'MANAGEMENT_APPROVED'
      },
      {
        id: 'tm-c-5',
        stepNumber: 8,
        title: 'Resident Verified & Signed Off',
        actor: 'Rohit Joshi',
        actorRole: 'RESIDENT',
        timestamp: '2026-11-07T16:00:00Z',
        notes: 'Confirmed 5-star rating with digital sign-off.',
        status: 'RESIDENT_CONFIRMED'
      }
    ]
  }
];

export const INITIAL_WORK_ORDERS: WorkOrder[] = [
  {
    id: 'wo-2024-118',
    woNumber: 'WO-2024-118',
    title: 'Riser PRV-B4 Overhaul & Diaphragm Replacement',
    complaintId: 'cmp-2024-089',
    type: 'CORRECTIVE',
    status: 'PROPOSAL_SUBMITTED',
    priority: 'HIGH',
    assetId: 'ast-prv-b4',
    assetName: 'Tower B Water Riser PRV-B4',
    tower: 'Tower B',
    location: 'Tower B, 4th Floor Shaft',
    technicianId: 'usr-maint-1',
    technicianName: 'Ramesh Kumar',
    createdAt: '2026-11-10T08:15:00Z',
    dueDate: '2026-11-10T16:00:00Z',
    estimatedHours: 3.5,
    actualHours: 2.5,
    sparesAllocated: [
      { partId: 'sp-01', partName: 'Watts PRV 1" Silicone Repair Kit', quantity: 1, fulfilled: true }
    ],
    checklists: [
      { item: 'Isolate upstream isolation butterfly valve', completed: true },
      { item: 'Drain residual pressure via bleed port', completed: true },
      { item: 'Disassemble valve chamber and extract mesh strainer', completed: true },
      { item: 'Replace worn elastomeric diaphragm and seat ring', completed: true },
      { item: 'Pressurize system slowly and calibrate to 2.8 Bar dynamic', completed: true },
      { item: 'Log photograph before and after restoration', completed: true }
    ],
    technicianNotes: 'Dynamic pressure stabilized at 2.8 Bar. Zero audible water hammer or seal weeping.'
  },
  {
    id: 'wo-pm-2024-001',
    woNumber: 'WO-PM-2024-001',
    title: 'Cummins 500kVA DG Set #2 - 250h Quarterly Overhaul',
    type: 'PREVENTIVE',
    status: 'IN_PROGRESS',
    priority: 'MEDIUM',
    assetId: 'ast-dg-02',
    assetName: 'Cummins 500kVA DG Set #2',
    tower: 'Common Substation',
    location: 'Basement 1, Generator Bay 2',
    technicianId: 'usr-maint-1',
    technicianName: 'Ramesh Kumar',
    createdAt: '2026-11-11T01:00:00Z',
    dueDate: '2026-11-11T12:00:00Z',
    estimatedHours: 4.0,
    sparesAllocated: [
      { partId: 'sp-02', partName: 'Fleetguard Lube Filter LF9009', quantity: 2, fulfilled: true },
      { partId: 'sp-03', partName: 'Fleetguard Fuel Water Separator FS1000', quantity: 1, fulfilled: false }
    ],
    checklists: [
      { item: 'Perform pre-service run test and note coolant temp & oil pressure', completed: true },
      { item: 'Drain engine oil and inspect sump magnetic plug for filings', completed: true },
      { item: 'Replace dual spin-on lube filters (LF9009) and prime', completed: false },
      { item: 'Inspect fan belt tension (deflection 10-12mm)', completed: false },
      { item: 'Check 24V starter battery specific gravity & electrolyte level', completed: false },
      { item: 'Perform automatic AMF transfer trial on simulated grid fail', completed: false }
    ],
    technicianNotes: 'Engine oil drained cleanly. Sump magnetic plug clean without ferrous shavings.'
  },
  {
    id: 'wo-2024-119',
    woNumber: 'WO-2024-119',
    title: 'Emergency Leveling Transducer Inspection - Lift #2',
    complaintId: 'cmp-2024-092',
    type: 'EMERGENCY',
    status: 'SCHEDULED',
    priority: 'URGENT',
    assetId: 'ast-elev-b2',
    assetName: 'Tower B Passenger Elevator #2',
    tower: 'Tower B',
    location: 'Tower B Machine Room & Shaft',
    technicianId: 'usr-maint-1',
    technicianName: 'Ramesh Kumar',
    createdAt: '2026-11-11T03:15:00Z',
    dueDate: '2026-11-11T07:00:00Z',
    estimatedHours: 2.0,
    sparesAllocated: [],
    checklists: [
      { item: 'Engage machine room safety lock-out tag-out', completed: false },
      { item: 'Inspect door interlock blade clearance (min 6mm)', completed: false },
      { item: 'Calibrate magnetic floor landing vanes 1-12', completed: false },
      { item: 'Execute full speed brake slip test', completed: false }
    ]
  }
];

export const INITIAL_ASSETS: Asset[] = [
  {
    id: 'ast-elev-b2',
    assetCode: 'AST-ELEV-B2',
    name: 'Tower B Passenger Elevator #2 (13 Pax / 884kg)',
    category: 'Vertical Transportation',
    tower: 'Tower B',
    location: 'Tower B Core Shaft',
    installationDate: '2021-04-10',
    warrantyExpiry: '2023-04-10',
    healthScore: 68,
    status: 'CRITICAL',
    mtbfHours: 420,
    mttrHours: 3.2,
    lastServicedDate: '2026-10-18',
    nextScheduledPm: '2026-11-18',
    vendorName: 'Schindler Elevators India Pvt Ltd',
    vendorContact: '+91 80 4455 6677 (AMC #SCH-BLR-902)',
    activeWorkOrdersCount: 1
  },
  {
    id: 'ast-dg-02',
    assetCode: 'AST-DG-02',
    name: 'Cummins 500kVA Diesel Generator Set #2',
    category: 'Emergency Power Grid',
    tower: 'Common Substation',
    location: 'Basement 1, DG Bay 2',
    installationDate: '2020-08-15',
    warrantyExpiry: '2022-08-15',
    healthScore: 92,
    status: 'UNDER_MAINTENANCE',
    mtbfHours: 1200,
    mttrHours: 2.5,
    lastServicedDate: '2026-08-12',
    nextScheduledPm: '2026-11-11',
    vendorName: 'Jakson Power / Cummins India',
    vendorContact: '+91 1800 233 4455 (AMC #CUM-2024-88)',
    activeWorkOrdersCount: 1
  },
  {
    id: 'ast-pump-a1',
    assetCode: 'AST-PUMP-A1',
    name: 'Grundfos Hydro-pneumatic Multi-stage Pump A1',
    category: 'Water Distribution',
    tower: 'Tower A/B',
    location: 'Basement 2, Pump Room Central',
    installationDate: '2021-02-20',
    warrantyExpiry: '2024-02-20',
    healthScore: 84,
    status: 'OPERATIONAL',
    mtbfHours: 850,
    mttrHours: 1.8,
    lastServicedDate: '2026-10-02',
    nextScheduledPm: '2026-12-02',
    vendorName: 'Grundfos Pumps India',
    vendorContact: '+91 44 4596 6800',
    activeWorkOrdersCount: 0
  },
  {
    id: 'ast-prv-b4',
    assetCode: 'AST-PRV-B4',
    name: 'Tower B Water Riser PRV-B4 (4th Floor)',
    category: 'Plumbing & Hydraulic',
    tower: 'Tower B',
    location: 'Tower B, 4th Floor Shaft',
    installationDate: '2021-02-20',
    warrantyExpiry: '2023-02-20',
    healthScore: 74,
    status: 'DEGRADING',
    mtbfHours: 310,
    mttrHours: 2.4,
    lastServicedDate: '2026-06-15',
    nextScheduledPm: '2026-11-20',
    vendorName: 'Watts Water Technologies',
    vendorContact: '+91 80 2233 1100',
    activeWorkOrdersCount: 1
  },
  {
    id: 'ast-fire-sys',
    assetCode: 'AST-FIRE-SYS',
    name: 'Addressable Fire Alarm Control Panel (Honeywell)',
    category: 'Life Safety & Protection',
    tower: 'Main Gatehouse',
    location: 'Security Control Room',
    installationDate: '2021-01-15',
    warrantyExpiry: '2026-01-15',
    healthScore: 98,
    status: 'OPERATIONAL',
    mtbfHours: 3500,
    mttrHours: 1.0,
    lastServicedDate: '2026-11-01',
    nextScheduledPm: '2026-12-01',
    vendorName: 'Honeywell Building Technologies',
    vendorContact: '+91 1800 103 4761',
    activeWorkOrdersCount: 0
  }
];

export const INITIAL_SPARES: SparePart[] = [
  {
    id: 'sp-01',
    sku: 'WAT-PRV-KIT-01',
    name: 'Watts PRV 1" Silicone Repair Kit',
    category: 'Plumbing',
    currentStock: 4,
    minThreshold: 3,
    maxCapacity: 15,
    unitCost: 1450,
    supplier: 'Apex Fluid Controls Bangalore',
    leadTimeDays: 2,
    compatibleAssets: ['ast-prv-b4']
  },
  {
    id: 'sp-02',
    sku: 'FLT-LF9009',
    name: 'Fleetguard Lube Filter LF9009',
    category: 'Power & DG',
    currentStock: 2,
    minThreshold: 4, // Low stock alert!
    maxCapacity: 10,
    unitCost: 2850,
    supplier: 'Cummins Direct Spares',
    leadTimeDays: 3,
    compatibleAssets: ['ast-dg-02']
  },
  {
    id: 'sp-03',
    sku: 'FLT-FS1000',
    name: 'Fleetguard Fuel Water Separator FS1000',
    category: 'Power & DG',
    currentStock: 1, // Critical low stock alert!
    minThreshold: 3,
    maxCapacity: 8,
    unitCost: 3100,
    supplier: 'Cummins Direct Spares',
    leadTimeDays: 3,
    compatibleAssets: ['ast-dg-02']
  },
  {
    id: 'sp-04',
    sku: 'SCH-LEV-88',
    name: 'Schindler Optical Leveling Vane Switch (24V)',
    category: 'Elevator',
    currentStock: 3,
    minThreshold: 2,
    maxCapacity: 6,
    unitCost: 6400,
    supplier: 'Schindler Direct Logistics',
    leadTimeDays: 5,
    compatibleAssets: ['ast-elev-b2']
  },
  {
    id: 'sp-05',
    sku: 'SCHN-MCB-C25',
    name: 'Schneider Acti9 25A Double Pole MCB',
    category: 'Electrical',
    currentStock: 18,
    minThreshold: 8,
    maxCapacity: 40,
    unitCost: 480,
    supplier: 'Havells & Schneider Depot',
    leadTimeDays: 1,
    compatibleAssets: ['ast-dg-02', 'ast-pump-a1']
  }
];

export const INITIAL_REQUISITIONS: SpareRequisition[] = [
  {
    id: 'req-0089',
    reqNumber: 'REQ-2024-089',
    workOrderId: 'wo-2024-118',
    technicianId: 'usr-maint-1',
    technicianName: 'Ramesh Kumar',
    partId: 'sp-01',
    partName: 'Watts PRV 1" Silicone Repair Kit',
    quantity: 1,
    urgency: 'URGENT',
    requestedAt: '2026-11-10T09:40:00Z',
    status: 'APPROVED',
    managerNotes: 'Approved for Tower B riser repair.'
  },
  {
    id: 'req-0091',
    reqNumber: 'REQ-2024-091',
    workOrderId: 'wo-pm-2024-001',
    technicianId: 'usr-maint-1',
    technicianName: 'Ramesh Kumar',
    partId: 'sp-03',
    partName: 'Fleetguard Fuel Water Separator FS1000',
    quantity: 1,
    urgency: 'ROUTINE',
    requestedAt: '2026-11-11T02:00:00Z',
    status: 'PENDING_APPROVAL'
  }
];

export const INITIAL_VISITOR_PASSES: VisitorPass[] = [
  {
    id: 'vp-01',
    passCode: 'GV-8921',
    sixDigitPin: '849201',
    visitorName: 'Vikram Joshi (Guest)',
    visitorPhone: '+91 99887 76655',
    visitorType: 'GUEST',
    vehicleNumber: 'KA-01-MJ-9921',
    tower: 'Tower B',
    unitNumber: 'B-402',
    residentName: 'Rahul Sharma',
    entryGate: 'Gate 1 (Main)',
    validFrom: '2026-11-11T09:00:00Z',
    validUntil: '2026-11-11T18:00:00Z',
    status: 'PRE_APPROVED',
    photoUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80'
  },
  {
    id: 'vp-02',
    passCode: 'GV-7742',
    sixDigitPin: '310928',
    visitorName: 'Mahesh (Swiggy Delivery)',
    visitorPhone: '+91 91234 56789',
    visitorType: 'DELIVERY',
    vehicleNumber: 'KA-05-EX-4412',
    tower: 'Tower B',
    unitNumber: 'B-402',
    residentName: 'Rahul Sharma',
    entryGate: 'Gate 1 (Main)',
    validFrom: '2026-11-11T09:30:00Z',
    validUntil: '2026-11-11T10:30:00Z',
    status: 'ACTIVE',
    checkInTime: '2026-11-11T09:35:00Z',
    photoUrl: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80'
  },
  {
    id: 'vp-03',
    passCode: 'GV-9912',
    sixDigitPin: '110022',
    visitorName: 'Water Tanker Driver',
    visitorPhone: '+91 98111 55443',
    visitorType: 'SERVICE',
    vehicleNumber: 'KA-03-9912',
    tower: 'Tower B/C',
    unitNumber: 'Well 2',
    residentName: 'Society Management',
    entryGate: 'Gate 2 (Service)',
    validFrom: '2026-11-11T08:30:00Z',
    validUntil: '2026-11-11T09:00:00Z',
    status: 'ENTERED',
    checkInTime: '2026-11-11T08:45:00Z',
    overstayMinutes: 28 // Overstay alert triggered in security console!
  }
];

export const INITIAL_PARCELS: Parcel[] = [
  {
    id: 'pcl-01',
    trackingNumber: 'AMZ-IN-88912',
    carrier: 'AMAZON',
    recipientName: 'Rahul Sharma',
    tower: 'Tower B',
    unitNumber: 'B-402',
    deliveryAgentName: 'Sunil M',
    deliveryAgentPhone: '+91 97766 55443',
    lockerNumber: 'Locker #14 (Tower B Lobby)',
    pickupOtp: '582910',
    receivedAt: '2026-11-11T08:15:00Z',
    status: 'IN_LOCKER'
  },
  {
    id: 'pcl-02',
    trackingNumber: 'SWG-BLR-0041',
    carrier: 'SWIGGY',
    recipientName: 'Priya Nambiar',
    tower: 'Tower B',
    unitNumber: 'B-401',
    deliveryAgentName: 'Raju K',
    deliveryAgentPhone: '+91 98877 66554',
    pickupOtp: '741203',
    receivedAt: '2026-11-11T09:30:00Z',
    status: 'AT_GATE'
  }
];

export const INITIAL_INCIDENTS: IncidentAlert[] = [
  {
    id: 'inc-01',
    alertCode: 'INC-2024-004',
    title: 'Passenger Elevator #2 Leveling Offset Warning',
    severity: 'WARNING',
    category: 'LIFT_ENTRAPMENT',
    tower: 'Tower B',
    location: 'Tower B, 5th Floor Shaft',
    reportedBy: 'Satpal Singh (Gate 1)',
    reportedAt: '2026-11-11T02:30:00Z',
    status: 'ACTIVE',
    broadcastSent: true,
    smsSentCount: 120,
    actionsTaken: [
      'Grounded lift #2 to floor 1 and displayed out-of-order signage',
      'Alerted Schindler rapid response engineering',
      'Pushed precautionary notification to all Tower B residents'
    ]
  }
];

export const INITIAL_PREVENTIVE_SCHEDULES: PreventiveSchedule[] = [
  {
    id: 'pm-01',
    taskCode: 'PM-DG-Q3',
    title: 'Cummins DG 500kVA 250h Lube & Filter Overhaul',
    assetName: 'Cummins 500kVA DG Set #2',
    tower: 'Common Substation',
    frequency: 'QUARTERLY',
    nextDueDate: '2026-11-11',
    assignedTeam: 'MEP In-House & Jakson Tech',
    status: 'IN_PROGRESS'
  },
  {
    id: 'pm-02',
    taskCode: 'PM-LIFT-M11',
    title: 'Schindler Elevator Safety Gear & Governor Test',
    assetName: 'Tower B Passenger Elevator #2',
    tower: 'Tower B',
    frequency: 'MONTHLY',
    nextDueDate: '2026-11-18',
    assignedTeam: 'Schindler India AMC',
    status: 'SCHEDULED'
  },
  {
    id: 'pm-03',
    taskCode: 'PM-WTR-W45',
    title: 'Hydro-pneumatic Tank Pressure Pre-charge Check',
    assetName: 'Grundfos Hydro-pneumatic Multi-stage Pump A1',
    tower: 'Tower A/B',
    frequency: 'WEEKLY',
    nextDueDate: '2026-11-14',
    assignedTeam: 'Plumbing Crew',
    status: 'SCHEDULED'
  },
  {
    id: 'pm-04',
    taskCode: 'PM-FIRE-Q4',
    title: 'Society-wide Wet Riser Hydrostatic Pressure Test',
    assetName: 'Addressable Fire Alarm Control Panel (Honeywell)',
    tower: 'All Towers',
    frequency: 'QUARTERLY',
    nextDueDate: '2026-11-25',
    assignedTeam: 'Fire Safety Marshall',
    status: 'SCHEDULED'
  }
];
