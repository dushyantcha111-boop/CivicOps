package com.civicops.community.service;

import com.civicops.community.model.*;
import com.civicops.community.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ComplaintWorkflowService {

    private final ComplaintRepository complaintRepository;
    private final WorkOrderRepository workOrderRepository;
    private final UserRepository userRepository;
    private final AssetRepository assetRepository;
    private final AuditService auditService;

    public List<Complaint> getAllComplaints() {
        return complaintRepository.findAll();
    }

    public List<Complaint> getComplaintsForUser(User user) {
        if (user.getRole() == Role.RESIDENT) {
            return complaintRepository.findByResidentId(user.getId());
        }
        if (user.getRole() == Role.MAINTENANCE) {
            List<Complaint> assigned = complaintRepository.findByAssignedTechnicianId(user.getId());
            return assigned;
        }
        return complaintRepository.findAll();
    }

    public Complaint getComplaintById(String id) {
        return complaintRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Complaint not found with id: " + id));
    }

    public Complaint getComplaintForUser(String id, User user) {
        Complaint c = getComplaintById(id);
        if (user.getRole() == Role.RESIDENT && !c.getResidentId().equals(user.getId())) {
            throw new AccessDeniedException("Residents may only access their own complaints.");
        }
        if (user.getRole() == Role.MAINTENANCE && !user.getId().equals(c.getAssignedTechnicianId())) {
            throw new AccessDeniedException("Maintenance technicians may only access complaints assigned to them.");
        }
        return c;
    }

    // Step 1: Resident submits complaint
    @Transactional
    public Complaint submitComplaint(Complaint complaintRequest) {
        return submitComplaint(complaintRequest, null);
    }

    @Transactional
    public Complaint submitComplaint(Complaint complaintRequest, User currentUser) {
        String id = "cmp-" + UUID.randomUUID().toString().substring(0, 8);
        long count = complaintRepository.count() + 90;
        String ticketNumber = String.format("TKT-2024-%03d", count);

        if (currentUser != null) {
            complaintRequest.setResidentId(currentUser.getId());
            complaintRequest.setResidentName(currentUser.getName());
            complaintRequest.setResidentPhone(currentUser.getPhone());

            if (currentUser.getRole() == Role.RESIDENT) {
                if (currentUser.hasVerifiedUnit()) {
                    complaintRequest.setTower(currentUser.getTower() != null ? currentUser.getTower() : "Tower A");
                    complaintRequest.setUnitNumber(currentUser.getUnitNumber());
                } else {
                    String requestedTower = currentUser.getRequestedTower() != null && !currentUser.getRequestedTower().isBlank()
                            ? currentUser.getRequestedTower()
                            : (complaintRequest.getTower() != null && !complaintRequest.getTower().isBlank() ? complaintRequest.getTower() : "Unverified");
                    String requestedUnit = currentUser.getRequestedUnitNumber() != null && !currentUser.getRequestedUnitNumber().isBlank()
                            ? currentUser.getRequestedUnitNumber()
                            : "PENDING";
                    complaintRequest.setTower(requestedTower);
                    complaintRequest.setUnitNumber("UNVERIFIED-" + requestedUnit);
                }
            } else {
                if (complaintRequest.getTower() == null || complaintRequest.getTower().isBlank()) {
                    complaintRequest.setTower(currentUser.getTower() != null ? currentUser.getTower() : "Tower A");
                }
                if (complaintRequest.getUnitNumber() == null || complaintRequest.getUnitNumber().isBlank()) {
                    complaintRequest.setUnitNumber(currentUser.getUnitNumber() != null ? currentUser.getUnitNumber() : "Common Area");
                }
            }
        }

        // Resolve matching asset if not provided
        if ((complaintRequest.getAssetId() == null || complaintRequest.getAssetId().isBlank()) && assetRepository != null) {
            assetRepository.findByTower(complaintRequest.getTower()).stream()
                    .filter(a -> a.getCategory() != null && a.getCategory().equalsIgnoreCase(complaintRequest.getCategory().name()))
                    .findFirst()
                    .ifPresent(a -> complaintRequest.setAssetId(a.getId()));
        }

        List<Complaint> similar = complaintRepository.findSimilarActiveComplaints(
                complaintRequest.getTower(),
                complaintRequest.getCategory()
        );

        String warning = null;
        if (!similar.isEmpty()) {
            warning = String.format("%d similar issue(s) detected in %s under %s in active queue.",
                    similar.size(), complaintRequest.getTower(), complaintRequest.getCategory());
        }

        LocalDateTime now = LocalDateTime.now();
        int slaHours = complaintRequest.getSeverity() == Complaint.ComplaintSeverity.CRITICAL ? 4
                : complaintRequest.getSeverity() == Complaint.ComplaintSeverity.HIGH ? 8 : 24;

        complaintRequest.setId(id);
        complaintRequest.setTicketNumber(ticketNumber);
        complaintRequest.setStatus(Complaint.ComplaintStatus.SUBMITTED);
        complaintRequest.setSlaDeadline(now.plusHours(slaHours));
        complaintRequest.setRecurrenceWarning(warning);
        complaintRequest.setRecurringCount(similar.size() + 1);
        complaintRequest.setSubmittedAt(now);
        complaintRequest.setCreatedAt(now);
        complaintRequest.setUpdatedAt(now);
        if (complaintRequest.getTimeline() == null) {
            complaintRequest.setTimeline(new ArrayList<>());
        }

        String firstEvidence = (complaintRequest.getEvidenceBefore() != null && !complaintRequest.getEvidenceBefore().isEmpty())
                ? complaintRequest.getEvidenceBefore().get(0) : null;

        ComplaintTimeline initialStep = ComplaintTimeline.builder()
                .id("tm-" + UUID.randomUUID())
                .complaint(complaintRequest)
                .stepNumber(1)
                .title("Complaint Registered")
                .actor(complaintRequest.getResidentName())
                .actorRole("RESIDENT")
                .notes("Ticket submitted via resident portal with category " + complaintRequest.getCategory())
                .status("SUBMITTED")
                .evidenceUrl(firstEvidence)
                .timestamp(now)
                .build();

        complaintRequest.getTimeline().add(initialStep);
        Complaint saved = complaintRepository.save(complaintRequest);

        if (auditService != null) {
            if (currentUser != null) {
                auditService.logAction(currentUser, "SUBMIT_COMPLAINT", "COMPLAINT", saved.getId(),
                        "Submitted " + saved.getTicketNumber() + " (" + saved.getCategory() + ")");
            }
            auditService.notify(null, "MANAGEMENT", "New Complaint: " + saved.getTicketNumber(),
                    saved.getTitle() + " (" + saved.getTower() + " - " + saved.getUnitNumber() + ")",
                    "COMPLAINT", saved.getId());
        }
        return saved;
    }

    // Step 2: Management reviews
    @Transactional
    public Complaint reviewComplaint(String complaintId, String reviewerName, String notes) {
        return reviewComplaint(complaintId, reviewerName, notes, null);
    }

    @Transactional
    public Complaint reviewComplaint(String complaintId, String reviewerName, String notes, User actor) {
        Complaint complaint = getComplaintById(complaintId);
        if (complaint.getStatus() != Complaint.ComplaintStatus.SUBMITTED
                && complaint.getStatus() != Complaint.ComplaintStatus.DISPUTED) {
            throw new IllegalStateException("Complaint must be SUBMITTED or DISPUTED before review. Current status: " + complaint.getStatus());
        }

        String actorName = actor != null ? actor.getName() : reviewerName;
        complaint.setStatus(Complaint.ComplaintStatus.REVIEWED);
        complaint.setUpdatedAt(LocalDateTime.now());

        ComplaintTimeline step = ComplaintTimeline.builder()
                .id("tm-" + UUID.randomUUID())
                .complaint(complaint)
                .stepNumber(2)
                .title("Management Triage & Priority Set")
                .actor(actorName)
                .actorRole(actor != null ? actor.getRole().name() : "MANAGEMENT")
                .notes(notes != null && !notes.isBlank() ? notes : "Reviewed by estate management. Assigned priority SLA.")
                .status("REVIEWED")
                .timestamp(LocalDateTime.now())
                .build();

        complaint.getTimeline().add(step);
        Complaint saved = complaintRepository.save(complaint);
        if (auditService != null && actor != null) {
            auditService.logAction(actor, "REVIEW_COMPLAINT", "COMPLAINT", saved.getId(), "Reviewed " + saved.getTicketNumber());
        }
        return saved;
    }

    // Step 3: Assign to technician
    @Transactional
    public Complaint assignComplaint(String complaintId, String technicianId, String assignerName, String notes) {
        return assignComplaint(complaintId, technicianId, assignerName, notes, null);
    }

    @Transactional
    public Complaint assignComplaint(String complaintId, String technicianId, String assignerName, String notes, User actor) {
        Complaint complaint = getComplaintById(complaintId);
        if (complaint.getStatus() == Complaint.ComplaintStatus.RESIDENT_CONFIRMED
                || complaint.getStatus() == Complaint.ComplaintStatus.CLOSED) {
            throw new IllegalStateException("Cannot assign a closed or resident-confirmed complaint.");
        }

        User tech = userRepository.findById(technicianId)
                .orElseThrow(() -> new NoSuchElementException("Technician not found with id: " + technicianId));

        if (!tech.getAuthorizedRoleList().contains(Role.MAINTENANCE) && tech.getRole() != Role.MAINTENANCE) {
            throw new IllegalArgumentException("Selected user is not authorized as MAINTENANCE personnel: " + tech.getName());
        }

        String actorName = actor != null ? actor.getName() : assignerName;
        complaint.setStatus(Complaint.ComplaintStatus.ASSIGNED);
        complaint.setAssignedTechnicianId(tech.getId());
        complaint.setAssignedTechnicianName(tech.getName());
        complaint.setUpdatedAt(LocalDateTime.now());

        Asset linkedAsset = (complaint.getAssetId() != null && assetRepository != null)
                ? assetRepository.findById(complaint.getAssetId()).orElse(null)
                : null;

        // Create or update linked Work Order
        WorkOrder wo = workOrderRepository.findByComplaintId(complaintId).orElse(null);
        if (wo == null) {
            long woSeq = workOrderRepository.count() + 120;
            wo = WorkOrder.builder()
                    .id("wo-" + UUID.randomUUID().toString().substring(0, 8))
                    .woNumber("WO-2024-" + woSeq)
                    .title(complaint.getCategory() + ": " + complaint.getTitle())
                    .complaintId(complaint.getId())
                    .type(complaint.getSeverity() == Complaint.ComplaintSeverity.CRITICAL
                            ? WorkOrder.WorkOrderType.EMERGENCY : WorkOrder.WorkOrderType.CORRECTIVE)
                    .status(WorkOrder.WorkOrderStatus.IN_PROGRESS)
                    .priority(complaint.getSeverity() == Complaint.ComplaintSeverity.CRITICAL
                            ? WorkOrder.Priority.URGENT : WorkOrder.Priority.HIGH)
                    .assetId(complaint.getAssetId())
                    .assetName(linkedAsset != null ? linkedAsset.getName() : null)
                    .tower(complaint.getTower())
                    .location(complaint.getTower() + ", Flat " + complaint.getUnitNumber())
                    .technicianId(tech.getId())
                    .technicianName(tech.getName())
                    .dueDate(complaint.getSlaDeadline())
                    .estimatedHours(new BigDecimal("2.50"))
                    .createdAt(LocalDateTime.now())
                    .build();
            wo.setChecklists(List.of(
                    new WorkOrder.ChecklistItem("Isolate & perform safety lockout check", false),
                    new WorkOrder.ChecklistItem("Inspect root cause & capture diagnostic evidence", false),
                    new WorkOrder.ChecklistItem("Apply corrective repair & test post-fix stability", false)
            ));
            wo.setSparesAllocated(List.of());
            if (linkedAsset != null) {
                linkedAsset.setActiveWorkOrdersCount((linkedAsset.getActiveWorkOrdersCount() == null ? 0 : linkedAsset.getActiveWorkOrdersCount()) + 1);
                assetRepository.save(linkedAsset);
            }
        } else {
            wo.setTechnicianId(tech.getId());
            wo.setTechnicianName(tech.getName());
            wo.setStatus(WorkOrder.WorkOrderStatus.IN_PROGRESS);
        }
        workOrderRepository.save(wo);

        ComplaintTimeline step = ComplaintTimeline.builder()
                .id("tm-" + UUID.randomUUID())
                .complaint(complaint)
                .stepNumber(3)
                .title("Assigned to " + tech.getName())
                .actor(actorName)
                .actorRole(actor != null ? actor.getRole().name() : "MANAGEMENT")
                .notes(notes != null && !notes.isBlank() ? notes : "Dispatched to technician. Work Order " + wo.getWoNumber() + " generated.")
                .status("ASSIGNED")
                .timestamp(LocalDateTime.now())
                .build();

        complaint.getTimeline().add(step);
        Complaint saved = complaintRepository.save(complaint);

        if (auditService != null) {
            if (actor != null) {
                auditService.logAction(actor, "ASSIGN_COMPLAINT", "COMPLAINT", saved.getId(),
                        "Assigned " + saved.getTicketNumber() + " to " + tech.getName() + " (" + wo.getWoNumber() + ")");
            }
            auditService.notify(tech.getId(), "MAINTENANCE", "Assigned Work Order " + wo.getWoNumber(),
                    saved.getTitle() + " at " + saved.getTower() + " " + saved.getUnitNumber(),
                    "WORK_ORDER", wo.getId());
        }
        return saved;
    }

    // Step 4: Physical inspection & diagnosis
    @Transactional
    public Complaint recordInspection(String complaintId, String technicianName, String inspectionNotes, String evidenceUrl) {
        return recordInspection(complaintId, technicianName, inspectionNotes, evidenceUrl, null);
    }

    @Transactional
    public Complaint recordInspection(String complaintId, String technicianName, String inspectionNotes, String evidenceUrl, User actor) {
        Complaint complaint = getComplaintById(complaintId);
        if (actor != null && actor.getRole() == Role.MAINTENANCE
                && complaint.getAssignedTechnicianId() != null
                && !complaint.getAssignedTechnicianId().equals(actor.getId())) {
            throw new AccessDeniedException("Only the assigned technician may inspect this complaint.");
        }
        if (complaint.getStatus() == Complaint.ComplaintStatus.SUBMITTED) {
            throw new IllegalStateException("Complaint must be reviewed/assigned before inspection.");
        }

        String actorName = actor != null ? actor.getName() : technicianName;
        complaint.setStatus(Complaint.ComplaintStatus.INSPECTING);
        complaint.setInspectionNotes(inspectionNotes);
        if (evidenceUrl != null && !evidenceUrl.isBlank()) {
            List<String> before = new ArrayList<>(complaint.getEvidenceBefore());
            if (!before.contains(evidenceUrl)) {
                before.add(evidenceUrl);
                complaint.setEvidenceBefore(before);
            }
        }
        complaint.setUpdatedAt(LocalDateTime.now());

        ComplaintTimeline step = ComplaintTimeline.builder()
                .id("tm-" + UUID.randomUUID())
                .complaint(complaint)
                .stepNumber(4)
                .title("Physical Inspection & Diagnosis")
                .actor(actorName)
                .actorRole(actor != null ? actor.getRole().name() : "MAINTENANCE")
                .notes(inspectionNotes != null && !inspectionNotes.isBlank() ? inspectionNotes : "Completed diagnostic check.")
                .status("INSPECTING")
                .evidenceUrl(evidenceUrl)
                .timestamp(LocalDateTime.now())
                .build();

        complaint.getTimeline().add(step);
        Complaint saved = complaintRepository.save(complaint);
        if (auditService != null && actor != null) {
            auditService.logAction(actor, "RECORD_INSPECTION", "COMPLAINT", saved.getId(), "Recorded inspection on " + saved.getTicketNumber());
        }
        return saved;
    }

    // Step 6: Technician submits resolution proposal (Maintenance staff CANNOT directly close complaint)
    @Transactional
    public Complaint submitResolutionProposal(String complaintId, String technicianName, String resolutionDescription, String evidenceUrl) {
        return submitResolutionProposal(complaintId, technicianName, resolutionDescription, evidenceUrl, null, null);
    }

    @Transactional
    public Complaint submitResolutionProposal(
            String complaintId,
            String technicianName,
            String resolutionDescription,
            String evidenceUrl,
            List<Complaint.ProposedSpareItem> proposedSpares,
            User actor
    ) {
        Complaint complaint = getComplaintById(complaintId);
        if (actor != null && actor.getRole() == Role.MAINTENANCE
                && complaint.getAssignedTechnicianId() != null
                && !complaint.getAssignedTechnicianId().equals(actor.getId())) {
            throw new AccessDeniedException("Only the assigned technician may propose resolution for this complaint.");
        }
        if (complaint.getStatus() == Complaint.ComplaintStatus.RESIDENT_CONFIRMED
                || complaint.getStatus() == Complaint.ComplaintStatus.CLOSED) {
            throw new IllegalStateException("Complaint is already confirmed/closed.");
        }

        String actorName = actor != null ? actor.getName() : technicianName;
        complaint.setStatus(Complaint.ComplaintStatus.PROPOSED);
        complaint.setProposedResolution(resolutionDescription);
        if (evidenceUrl != null && !evidenceUrl.isBlank()) {
            List<String> after = new ArrayList<>(complaint.getEvidenceAfter());
            if (!after.contains(evidenceUrl)) {
                after.add(evidenceUrl);
                complaint.setEvidenceAfter(after);
            }
        }
        if (proposedSpares != null && !proposedSpares.isEmpty()) {
            complaint.setProposedSpares(proposedSpares);
        }
        complaint.setUpdatedAt(LocalDateTime.now());

        workOrderRepository.findByComplaintId(complaintId).ifPresent(wo -> {
            wo.setStatus(WorkOrder.WorkOrderStatus.PROPOSAL_SUBMITTED);
            wo.setTechnicianNotes(resolutionDescription);
            workOrderRepository.save(wo);
        });

        if (proposedSpares != null && !proposedSpares.isEmpty()) {
            ComplaintTimeline step5 = ComplaintTimeline.builder()
                    .id("tm-" + UUID.randomUUID())
                    .complaint(complaint)
                    .stepNumber(5)
                    .title("Spare Parts & Materials Logged")
                    .actor(actorName)
                    .actorRole(actor != null ? actor.getRole().name() : "MAINTENANCE")
                    .notes("Logged " + proposedSpares.size() + " spare part line item(s) for resolution.")
                    .status("PROPOSED")
                    .timestamp(LocalDateTime.now())
                    .build();
            complaint.getTimeline().add(step5);
        }

        ComplaintTimeline step = ComplaintTimeline.builder()
                .id("tm-" + UUID.randomUUID())
                .complaint(complaint)
                .stepNumber(6)
                .title("Resolution Proposal Submitted")
                .actor(actorName)
                .actorRole(actor != null ? actor.getRole().name() : "MAINTENANCE")
                .notes("Repair finalized. Proposal: \"" + resolutionDescription + "\". Awaiting management verification & resident sign-off.")
                .status("PROPOSED")
                .evidenceUrl(evidenceUrl)
                .timestamp(LocalDateTime.now())
                .build();

        complaint.getTimeline().add(step);
        Complaint saved = complaintRepository.save(complaint);

        if (auditService != null) {
            if (actor != null) {
                auditService.logAction(actor, "PROPOSE_RESOLUTION", "COMPLAINT", saved.getId(),
                        "Submitted resolution proposal for " + saved.getTicketNumber());
            }
            auditService.notify(null, "MANAGEMENT", "Resolution Proposal Ready: " + saved.getTicketNumber(),
                    actorName + " submitted fix proposal for " + saved.getTitle(),
                    "COMPLAINT", saved.getId());
        }
        return saved;
    }

    // Step 7A: Management approves proposal
    @Transactional
    public Complaint approveResolutionProposal(String complaintId, String managerName, String notes) {
        return approveResolutionProposal(complaintId, managerName, notes, null);
    }

    @Transactional
    public Complaint approveResolutionProposal(String complaintId, String managerName, String notes, User actor) {
        Complaint complaint = getComplaintById(complaintId);
        if (complaint.getStatus() != Complaint.ComplaintStatus.PROPOSED) {
            throw new IllegalStateException("Complaint must be in PROPOSED status for management approval. Current: " + complaint.getStatus());
        }

        String actorName = actor != null ? actor.getName() : managerName;
        complaint.setStatus(Complaint.ComplaintStatus.MANAGEMENT_APPROVED);
        complaint.setUpdatedAt(LocalDateTime.now());

        ComplaintTimeline step = ComplaintTimeline.builder()
                .id("tm-" + UUID.randomUUID())
                .complaint(complaint)
                .stepNumber(7)
                .title("Management Approved Resolution")
                .actor(actorName)
                .actorRole(actor != null ? actor.getRole().name() : "MANAGEMENT")
                .notes(notes != null && !notes.isBlank() ? notes : "Work verified against safety and SLA standards. Sent to resident for sign-off.")
                .status("MANAGEMENT_APPROVED")
                .timestamp(LocalDateTime.now())
                .build();

        complaint.getTimeline().add(step);
        Complaint saved = complaintRepository.save(complaint);

        if (auditService != null) {
            if (actor != null) {
                auditService.logAction(actor, "APPROVE_PROPOSAL", "COMPLAINT", saved.getId(),
                        "Management approved proposal for " + saved.getTicketNumber());
            }
            auditService.notify(saved.getResidentId(), "RESIDENT", "Sign-off Requested: " + saved.getTicketNumber(),
                    "Management approved the repair for " + saved.getTitle() + ". Please verify and confirm.",
                    "COMPLAINT", saved.getId());
        }
        return saved;
    }

    // Step 7B: Management rejects proposal back to technician
    @Transactional
    public Complaint rejectResolutionProposal(String complaintId, String reason, User actor) {
        Complaint complaint = getComplaintById(complaintId);
        if (complaint.getStatus() != Complaint.ComplaintStatus.PROPOSED) {
            throw new IllegalStateException("Only a PROPOSED resolution can be rejected. Current: " + complaint.getStatus());
        }
        if (reason == null || reason.isBlank()) {
            throw new IllegalArgumentException("Rejection reason is required.");
        }

        complaint.setStatus(Complaint.ComplaintStatus.INSPECTING);
        complaint.setUpdatedAt(LocalDateTime.now());

        workOrderRepository.findByComplaintId(complaintId).ifPresent(wo -> {
            wo.setStatus(WorkOrder.WorkOrderStatus.IN_PROGRESS);
            workOrderRepository.save(wo);
        });

        ComplaintTimeline step = ComplaintTimeline.builder()
                .id("tm-" + UUID.randomUUID())
                .complaint(complaint)
                .stepNumber(7)
                .title("Proposal Returned by Management")
                .actor(actor.getName())
                .actorRole(actor.getRole().name())
                .notes("Returned for rework: \"" + reason + "\"")
                .status("INSPECTING")
                .timestamp(LocalDateTime.now())
                .build();

        complaint.getTimeline().add(step);
        Complaint saved = complaintRepository.save(complaint);

        if (auditService != null) {
            auditService.logAction(actor, "REJECT_PROPOSAL", "COMPLAINT", saved.getId(),
                    "Returned proposal on " + saved.getTicketNumber() + ": " + reason);
            if (saved.getAssignedTechnicianId() != null) {
                auditService.notify(saved.getAssignedTechnicianId(), "MAINTENANCE",
                        "Rework Required: " + saved.getTicketNumber(),
                        "Management returned proposal: " + reason, "COMPLAINT", saved.getId());
            }
        }
        return saved;
    }

    // Step 8A + 9: Resident confirms resolution -> closes work order
    @Transactional
    public Complaint residentConfirmResolution(String complaintId, String residentName, int rating, String feedback, String signature) {
        return residentConfirmResolution(complaintId, residentName, rating, feedback, signature, null);
    }

    @Transactional
    public Complaint residentConfirmResolution(String complaintId, String residentName, int rating, String feedback, String signature, User actor) {
        Complaint complaint = getComplaintById(complaintId);
        if (actor != null && actor.getRole() != Role.ADMIN && !complaint.getResidentId().equals(actor.getId())) {
            throw new AccessDeniedException("Only the complaint's resident owner may confirm resolution.");
        }
        if (rating < 1 || rating > 5) {
            throw new IllegalArgumentException("Rating must be between 1 and 5.");
        }

        String actorName = actor != null ? actor.getName() : residentName;
        complaint.setStatus(Complaint.ComplaintStatus.RESIDENT_CONFIRMED);
        complaint.setResidentRating(rating);
        complaint.setResidentFeedback(feedback);
        complaint.setUpdatedAt(LocalDateTime.now());

        workOrderRepository.findByComplaintId(complaintId).ifPresent(wo -> {
            wo.setStatus(WorkOrder.WorkOrderStatus.COMPLETED);
            workOrderRepository.save(wo);
            if (wo.getAssetId() != null && assetRepository != null) {
                assetRepository.findById(wo.getAssetId()).ifPresent(a -> {
                    int active = a.getActiveWorkOrdersCount() == null ? 0 : a.getActiveWorkOrdersCount();
                    a.setActiveWorkOrdersCount(Math.max(0, active - 1));
                    assetRepository.save(a);
                });
            }
        });

        ComplaintTimeline step8 = ComplaintTimeline.builder()
                .id("tm-" + UUID.randomUUID())
                .complaint(complaint)
                .stepNumber(8)
                .title("Resident Verified & Signed Off")
                .actor(actorName)
                .actorRole("RESIDENT")
                .notes("Resident accepted resolution with " + rating + "/5 stars. Feedback: \"" + (feedback != null && !feedback.isBlank() ? feedback : "Satisfied") + "\"")
                .status("RESIDENT_CONFIRMED")
                .signature(signature != null && !signature.isBlank() ? signature : "Digital Signature Verified")
                .timestamp(LocalDateTime.now())
                .build();

        ComplaintTimeline step9 = ComplaintTimeline.builder()
                .id("tm-" + UUID.randomUUID())
                .complaint(complaint)
                .stepNumber(9)
                .title("Ticket Closed & Archive Seeded")
                .actor("CivicOps System Engine")
                .actorRole("ADMIN")
                .notes("Resolution verified. Asset MTTR updated in Community Memory Graph.")
                .status("CLOSED")
                .timestamp(LocalDateTime.now())
                .build();

        complaint.getTimeline().add(step8);
        complaint.getTimeline().add(step9);
        Complaint saved = complaintRepository.save(complaint);

        if (auditService != null && actor != null) {
            auditService.logAction(actor, "CONFIRM_RESOLUTION", "COMPLAINT", saved.getId(),
                    "Resident confirmed " + saved.getTicketNumber() + " (" + rating + "/5)");
        }
        return saved;
    }

    // Step 8B: Resident disputes resolution -> reopens work order
    @Transactional
    public Complaint residentDisputeResolution(String complaintId, String residentName, String disputeReason) {
        return residentDisputeResolution(complaintId, residentName, disputeReason, null);
    }

    @Transactional
    public Complaint residentDisputeResolution(String complaintId, String residentName, String disputeReason, User actor) {
        Complaint complaint = getComplaintById(complaintId);
        if (actor != null && actor.getRole() != Role.ADMIN && !complaint.getResidentId().equals(actor.getId())) {
            throw new AccessDeniedException("Only the complaint's resident owner may dispute resolution.");
        }
        if (disputeReason == null || disputeReason.isBlank()) {
            throw new IllegalArgumentException("Dispute reason is required.");
        }

        String actorName = actor != null ? actor.getName() : residentName;
        complaint.setStatus(Complaint.ComplaintStatus.DISPUTED);
        complaint.setDisputeReason(disputeReason);
        complaint.setUpdatedAt(LocalDateTime.now());

        workOrderRepository.findByComplaintId(complaintId).ifPresent(wo -> {
            wo.setStatus(WorkOrder.WorkOrderStatus.IN_PROGRESS);
            workOrderRepository.save(wo);
        });

        ComplaintTimeline step = ComplaintTimeline.builder()
                .id("tm-" + UUID.randomUUID())
                .complaint(complaint)
                .stepNumber(8)
                .title("Resolution Disputed by Resident")
                .actor(actorName)
                .actorRole("RESIDENT")
                .notes("Dispute raised: \"" + disputeReason + "\". Re-opened for management escalation.")
                .status("DISPUTED")
                .timestamp(LocalDateTime.now())
                .build();

        complaint.getTimeline().add(step);
        Complaint saved = complaintRepository.save(complaint);

        if (auditService != null) {
            if (actor != null) {
                auditService.logAction(actor, "DISPUTE_RESOLUTION", "COMPLAINT", saved.getId(),
                        "Resident disputed " + saved.getTicketNumber() + ": " + disputeReason);
            }
            auditService.notify(null, "MANAGEMENT", "Resolution Disputed: " + saved.getTicketNumber(),
                    actorName + " disputed resolution: " + disputeReason, "COMPLAINT", saved.getId());
        }
        return saved;
    }
}
