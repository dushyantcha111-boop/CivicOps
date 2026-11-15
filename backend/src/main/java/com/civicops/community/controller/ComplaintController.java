package com.civicops.community.controller;

import com.civicops.community.model.Complaint;
import com.civicops.community.model.User;
import com.civicops.community.service.AuditService;
import com.civicops.community.service.ComplaintWorkflowService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/complaints")
@RequiredArgsConstructor
public class ComplaintController {

    private final ComplaintWorkflowService complaintService;
    private final AuditService auditService;

    @GetMapping
    public ResponseEntity<List<Complaint>> getAllComplaints() {
        User currentUser = auditService.requireCurrentUser();
        return ResponseEntity.ok(complaintService.getComplaintsForUser(currentUser));
    }

    @GetMapping("/{id}")
    public ResponseEntity<Complaint> getComplaintById(@PathVariable String id) {
        User currentUser = auditService.requireCurrentUser();
        return ResponseEntity.ok(complaintService.getComplaintForUser(id, currentUser));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('RESIDENT', 'MANAGEMENT', 'ADMIN')")
    public ResponseEntity<Complaint> submitComplaint(@RequestBody Complaint complaint) {
        User currentUser = auditService.requireCurrentUser();
        return ResponseEntity.ok(complaintService.submitComplaint(complaint, currentUser));
    }

    @PostMapping("/{id}/review")
    @PreAuthorize("hasAnyRole('MANAGEMENT', 'ADMIN')")
    public ResponseEntity<Complaint> reviewComplaint(
            @PathVariable String id,
            @RequestBody(required = false) ReviewRequest request
    ) {
        User actor = auditService.requireCurrentUser();
        String reviewer = request != null && request.getReviewerName() != null ? request.getReviewerName() : actor.getName();
        String notes = request != null ? request.getNotes() : null;
        return ResponseEntity.ok(complaintService.reviewComplaint(id, reviewer, notes, actor));
    }

    @PostMapping("/{id}/assign")
    @PreAuthorize("hasAnyRole('MANAGEMENT', 'ADMIN')")
    public ResponseEntity<Complaint> assignComplaint(
            @PathVariable String id,
            @Valid @RequestBody AssignRequest request
    ) {
        User actor = auditService.requireCurrentUser();
        String assigner = request.getAssignerName() != null ? request.getAssignerName() : actor.getName();
        return ResponseEntity.ok(complaintService.assignComplaint(
                id, request.getTechnicianId(), assigner, request.getNotes(), actor
        ));
    }

    @PostMapping("/{id}/inspection")
    @PreAuthorize("hasAnyRole('MAINTENANCE', 'ADMIN')")
    public ResponseEntity<Complaint> recordInspection(
            @PathVariable String id,
            @Valid @RequestBody InspectionRequest request
    ) {
        User actor = auditService.requireCurrentUser();
        String techName = request.getTechnicianName() != null ? request.getTechnicianName() : actor.getName();
        return ResponseEntity.ok(complaintService.recordInspection(
                id, techName, request.getInspectionNotes(), request.getEvidenceUrl(), actor
        ));
    }

    @PostMapping("/{id}/propose-resolution")
    @PreAuthorize("hasAnyRole('MAINTENANCE', 'ADMIN')")
    public ResponseEntity<Complaint> proposeResolution(
            @PathVariable String id,
            @Valid @RequestBody ProposeRequest request
    ) {
        User actor = auditService.requireCurrentUser();
        String techName = request.getTechnicianName() != null ? request.getTechnicianName() : actor.getName();
        return ResponseEntity.ok(complaintService.submitResolutionProposal(
                id, techName, request.getResolutionDescription(), request.getEvidenceUrl(), request.getProposedSpares(), actor
        ));
    }

    @PostMapping("/{id}/approve-proposal")
    @PreAuthorize("hasAnyRole('MANAGEMENT', 'ADMIN')")
    public ResponseEntity<Complaint> approveProposal(
            @PathVariable String id,
            @RequestBody(required = false) ReviewRequest request
    ) {
        User actor = auditService.requireCurrentUser();
        String reviewer = request != null && request.getReviewerName() != null ? request.getReviewerName() : actor.getName();
        String notes = request != null ? request.getNotes() : null;
        return ResponseEntity.ok(complaintService.approveResolutionProposal(id, reviewer, notes, actor));
    }

    @PostMapping("/{id}/reject-proposal")
    @PreAuthorize("hasAnyRole('MANAGEMENT', 'ADMIN')")
    public ResponseEntity<Complaint> rejectProposal(
            @PathVariable String id,
            @Valid @RequestBody RejectProposalRequest request
    ) {
        User actor = auditService.requireCurrentUser();
        return ResponseEntity.ok(complaintService.rejectResolutionProposal(id, request.getReason(), actor));
    }

    @PostMapping("/{id}/confirm")
    @PreAuthorize("hasAnyRole('RESIDENT', 'ADMIN')")
    public ResponseEntity<Complaint> confirmResolution(
            @PathVariable String id,
            @Valid @RequestBody ConfirmRequest request
    ) {
        User actor = auditService.requireCurrentUser();
        String residentName = request.getResidentName() != null ? request.getResidentName() : actor.getName();
        return ResponseEntity.ok(complaintService.residentConfirmResolution(
                id, residentName, request.getRating(), request.getFeedback(), request.getSignature(), actor
        ));
    }

    @PostMapping("/{id}/dispute")
    @PreAuthorize("hasAnyRole('RESIDENT', 'ADMIN')")
    public ResponseEntity<Complaint> disputeResolution(
            @PathVariable String id,
            @Valid @RequestBody DisputeRequest request
    ) {
        User actor = auditService.requireCurrentUser();
        String residentName = request.getResidentName() != null ? request.getResidentName() : actor.getName();
        return ResponseEntity.ok(complaintService.residentDisputeResolution(
                id, residentName, request.getDisputeReason(), actor
        ));
    }

    @Data
    public static class ReviewRequest {
        private String reviewerName;
        private String notes;
    }

    @Data
    public static class RejectProposalRequest {
        @NotBlank(message = "Rejection reason is required")
        private String reason;
    }

    @Data
    public static class AssignRequest {
        @NotBlank(message = "Technician ID is required")
        private String technicianId;
        private String assignerName;
        private String notes;
    }

    @Data
    public static class InspectionRequest {
        private String technicianName;
        @NotBlank(message = "Inspection notes are required")
        private String inspectionNotes;
        private String evidenceUrl;
    }

    @Data
    public static class ProposeRequest {
        private String technicianName;
        @NotBlank(message = "Resolution description is required")
        private String resolutionDescription;
        private String evidenceUrl;
        private List<Complaint.ProposedSpareItem> proposedSpares;
    }

    @Data
    public static class ConfirmRequest {
        private String residentName;
        @Min(value = 1, message = "Rating must be between 1 and 5")
        @Max(value = 5, message = "Rating must be between 1 and 5")
        private int rating;
        private String feedback;
        private String signature;
    }

    @Data
    public static class DisputeRequest {
        private String residentName;
        @NotBlank(message = "Dispute reason is required")
        private String disputeReason;
    }
}
