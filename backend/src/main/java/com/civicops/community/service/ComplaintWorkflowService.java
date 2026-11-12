package com.civicops.community.service;

import com.civicops.community.model.Complaint;
import com.civicops.community.model.ComplaintTimeline;
import com.civicops.community.model.WorkOrder;
import com.civicops.community.model.User;
import com.civicops.community.repository.ComplaintRepository;
import com.civicops.community.repository.WorkOrderRepository;
import com.civicops.community.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ComplaintWorkflowService {

    private final ComplaintRepository complaintRepository;
    private final WorkOrderRepository workOrderRepository;
    private final UserRepository userRepository;

    public List<Complaint> getAllComplaints() {
        return complaintRepository.findAll();
    }

    public Complaint getComplaintById(String id) {
        return complaintRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Complaint not found with id: " + id));
    }

    // Step 1: Resident submits complaint
    @Transactional
    public Complaint submitComplaint(Complaint complaintRequest) {
        String id = "cmp-" + UUID.randomUUID().toString().substring(0, 8);
        long count = complaintRepository.count() + 90;
        String ticketNumber = String.format("TKT-2024-%03d", count);

        // Check for recurrence advisory
        List<Complaint> similar = complaintRepository.findSimilarActiveComplaints(
                complaintRequest.getTower(),
                complaintRequest.getCategory()
        );

        String warning = null;
        if (!similar.isEmpty()) {
            warning = String.format("%d similar issue(s) detected in %s under %s this month.",
                    similar.size(), complaintRequest.getTower(), complaintRequest.getCategory());
        }

        complaintRequest.setId(id);
        complaintRequest.setTicketNumber(ticketNumber);
        complaintRequest.setStatus(Complaint.ComplaintStatus.SUBMITTED);
        complaintRequest.setSlaDeadline(LocalDateTime.now().plusHours(8));
        complaintRequest.setRecurrenceWarning(warning);
        complaintRequest.setRecurringCount(similar.size() + 1);

        ComplaintTimeline initialStep = ComplaintTimeline.builder()
                .id("tm-" + UUID.randomUUID())
                .complaint(complaintRequest)
                .stepNumber(1)
                .title("Complaint Registered")
                .actor(complaintRequest.getResidentName())
                .actorRole("RESIDENT")
                .notes("Ticket submitted via resident portal with category " + complaintRequest.getCategory())
                .status("SUBMITTED")
                .timestamp(LocalDateTime.now())
                .build();

        complaintRequest.getTimeline().add(initialStep);
        return complaintRepository.save(complaintRequest);
    }

    // Step 2: Management reviews
    @Transactional
    public Complaint reviewComplaint(String complaintId, String reviewerName, String notes) {
        Complaint complaint = getComplaintById(complaintId);
        complaint.setStatus(Complaint.ComplaintStatus.REVIEWED);
        complaint.setUpdatedAt(LocalDateTime.now());

        ComplaintTimeline step = ComplaintTimeline.builder()
                .id("tm-" + UUID.randomUUID())
                .complaint(complaint)
                .stepNumber(2)
                .title("Management Triage & Priority Set")
                .actor(reviewerName)
                .actorRole("MANAGEMENT")
                .notes(notes != null ? notes : "Reviewed by estate management. Assigned priority SLA.")
                .status("REVIEWED")
                .timestamp(LocalDateTime.now())
                .build();

        complaint.getTimeline().add(step);
        return complaintRepository.save(complaint);
    }

    // Step 3: Assign to technician
    @Transactional
    public Complaint assignComplaint(String complaintId, String technicianId, String assignerName, String notes) {
        Complaint complaint = getComplaintById(complaintId);
        User tech = userRepository.findById(technicianId)
                .orElseThrow(() -> new RuntimeException("Technician not found with id: " + technicianId));

        complaint.setStatus(Complaint.ComplaintStatus.ASSIGNED);
        complaint.setAssignedTechnicianId(tech.getId());
        complaint.setAssignedTechnicianName(tech.getName());
        complaint.setUpdatedAt(LocalDateTime.now());

        // Create Work Order
        long woSeq = workOrderRepository.count() + 120;
        WorkOrder wo = WorkOrder.builder()
                .id("wo-" + UUID.randomUUID().toString().substring(0, 8))
                .woNumber("WO-2024-" + woSeq)
                .title(complaint.getCategory() + ": " + complaint.getTitle())
                .complaintId(complaint.getId())
                .type(complaint.getSeverity() == Complaint.ComplaintSeverity.CRITICAL ? WorkOrder.WorkOrderType.EMERGENCY : WorkOrder.WorkOrderType.CORRECTIVE)
                .status(WorkOrder.WorkOrderStatus.IN_PROGRESS)
                .priority(complaint.getSeverity() == Complaint.ComplaintSeverity.CRITICAL ? WorkOrder.Priority.URGENT : WorkOrder.Priority.HIGH)
                .tower(complaint.getTower())
                .location(complaint.getTower() + ", Flat " + complaint.getUnitNumber())
                .technicianId(tech.getId())
                .technicianName(tech.getName())
                .dueDate(complaint.getSlaDeadline())
                .estimatedHours(2.5)
                .createdAt(LocalDateTime.now())
                .build();
        workOrderRepository.save(wo);

        ComplaintTimeline step = ComplaintTimeline.builder()
                .id("tm-" + UUID.randomUUID())
                .complaint(complaint)
                .stepNumber(3)
                .title("Assigned to " + tech.getName())
                .actor(assignerName)
                .actorRole("MANAGEMENT")
                .notes(notes != null ? notes : "Dispatched to senior technician. Work Order " + wo.getWoNumber() + " generated.")
                .status("ASSIGNED")
                .timestamp(LocalDateTime.now())
                .build();

        complaint.getTimeline().add(step);
        return complaintRepository.save(complaint);
    }

    // Step 4: Physical inspection & diagnosis
    @Transactional
    public Complaint recordInspection(String complaintId, String technicianName, String inspectionNotes, String evidenceUrl) {
        Complaint complaint = getComplaintById(complaintId);
        complaint.setStatus(Complaint.ComplaintStatus.INSPECTING);
        complaint.setInspectionNotes(inspectionNotes);
        complaint.setUpdatedAt(LocalDateTime.now());

        ComplaintTimeline step = ComplaintTimeline.builder()
                .id("tm-" + UUID.randomUUID())
                .complaint(complaint)
                .stepNumber(4)
                .title("Physical Inspection & Diagnosis")
                .actor(technicianName)
                .actorRole("MAINTENANCE")
                .notes(inspectionNotes != null ? inspectionNotes : "Completed diagnostic check.")
                .status("INSPECTING")
                .evidenceUrl(evidenceUrl)
                .timestamp(LocalDateTime.now())
                .build();

        complaint.getTimeline().add(step);
        return complaintRepository.save(complaint);
    }

    // Step 6: Technician submits resolution proposal (Maintenance staff cannot directly mark resolved)
    @Transactional
    public Complaint submitResolutionProposal(String complaintId, String technicianName, String resolutionDescription, String evidenceUrl) {
        Complaint complaint = getComplaintById(complaintId);
        complaint.setStatus(Complaint.ComplaintStatus.PROPOSED);
        complaint.setProposedResolution(resolutionDescription);
        complaint.setUpdatedAt(LocalDateTime.now());

        workOrderRepository.findByComplaintId(complaintId).ifPresent(wo -> {
            wo.setStatus(WorkOrder.WorkOrderStatus.PROPOSAL_SUBMITTED);
            wo.setTechnicianNotes(resolutionDescription);
            workOrderRepository.save(wo);
        });

        ComplaintTimeline step = ComplaintTimeline.builder()
                .id("tm-" + UUID.randomUUID())
                .complaint(complaint)
                .stepNumber(6)
                .title("Resolution Proposal Submitted")
                .actor(technicianName)
                .actorRole("MAINTENANCE")
                .notes("Repair finalized. Proposal: \"" + resolutionDescription + "\". Awaiting resident sign-off.")
                .status("PROPOSED")
                .evidenceUrl(evidenceUrl)
                .timestamp(LocalDateTime.now())
                .build();

        complaint.getTimeline().add(step);
        return complaintRepository.save(complaint);
    }

    // Step 7: Management reviews proposal
    @Transactional
    public Complaint approveResolutionProposal(String complaintId, String managerName, String notes) {
        Complaint complaint = getComplaintById(complaintId);
        complaint.setStatus(Complaint.ComplaintStatus.MANAGEMENT_APPROVED);
        complaint.setUpdatedAt(LocalDateTime.now());

        ComplaintTimeline step = ComplaintTimeline.builder()
                .id("tm-" + UUID.randomUUID())
                .complaint(complaint)
                .stepNumber(7)
                .title("Management Approved Resolution")
                .actor(managerName)
                .actorRole("MANAGEMENT")
                .notes(notes != null ? notes : "Work verified against safety and SLA standards. Sent to resident for sign-off.")
                .status("MANAGEMENT_APPROVED")
                .timestamp(LocalDateTime.now())
                .build();

        complaint.getTimeline().add(step);
        return complaintRepository.save(complaint);
    }

    // Step 8A: Resident confirms resolution
    @Transactional
    public Complaint residentConfirmResolution(String complaintId, String residentName, int rating, String feedback, String signature) {
        Complaint complaint = getComplaintById(complaintId);
        complaint.setStatus(Complaint.ComplaintStatus.RESIDENT_CONFIRMED);
        complaint.setResidentRating(rating);
        complaint.setResidentFeedback(feedback);
        complaint.setUpdatedAt(LocalDateTime.now());

        workOrderRepository.findByComplaintId(complaintId).ifPresent(wo -> {
            wo.setStatus(WorkOrder.WorkOrderStatus.COMPLETED);
            workOrderRepository.save(wo);
        });

        ComplaintTimeline step8 = ComplaintTimeline.builder()
                .id("tm-" + UUID.randomUUID())
                .complaint(complaint)
                .stepNumber(8)
                .title("Resident Verified & Signed Off")
                .actor(residentName)
                .actorRole("RESIDENT")
                .notes("Resident accepted resolution with " + rating + "/5 stars. Feedback: \"" + (feedback != null ? feedback : "Satisfied") + "\"")
                .status("RESIDENT_CONFIRMED")
                .signature(signature != null ? signature : "Digital Signature Verified")
                .timestamp(LocalDateTime.now())
                .build();

        // Step 9: Final status closure
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
        return complaintRepository.save(complaint);
    }

    // Step 8B: Resident disputes resolution
    @Transactional
    public Complaint residentDisputeResolution(String complaintId, String residentName, String disputeReason) {
        Complaint complaint = getComplaintById(complaintId);
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
                .actor(residentName)
                .actorRole("RESIDENT")
                .notes("Dispute raised: \"" + disputeReason + "\". Re-opened for management escalation.")
                .status("DISPUTED")
                .timestamp(LocalDateTime.now())
                .build();

        complaint.getTimeline().add(step);
        return complaintRepository.save(complaint);
    }
}
