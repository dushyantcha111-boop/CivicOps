package com.civicops.community.controller;

import com.civicops.community.model.Complaint;
import com.civicops.community.service.ComplaintWorkflowService;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/complaints")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class ComplaintController {

    private final ComplaintWorkflowService complaintService;

    @GetMapping
    public ResponseEntity<List<Complaint>> getAllComplaints() {
        return ResponseEntity.ok(complaintService.getAllComplaints());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Complaint> getComplaintById(@PathVariable String id) {
        return ResponseEntity.ok(complaintService.getComplaintById(id));
    }

    @PostMapping
    public ResponseEntity<Complaint> submitComplaint(@RequestBody Complaint complaint) {
        return ResponseEntity.ok(complaintService.submitComplaint(complaint));
    }

    @PostMapping("/{id}/review")
    public ResponseEntity<Complaint> reviewComplaint(
            @PathVariable String id,
            @RequestBody ReviewRequest request
    ) {
        return ResponseEntity.ok(complaintService.reviewComplaint(id, request.getReviewerName(), request.getNotes()));
    }

    @PostMapping("/{id}/assign")
    public ResponseEntity<Complaint> assignComplaint(
            @PathVariable String id,
            @RequestBody AssignRequest request
    ) {
        return ResponseEntity.ok(complaintService.assignComplaint(
                id, request.getTechnicianId(), request.getAssignerName(), request.getNotes()
        ));
    }

    @PostMapping("/{id}/propose-resolution")
    public ResponseEntity<Complaint> proposeResolution(
            @PathVariable String id,
            @RequestBody ProposeRequest request
    ) {
        return ResponseEntity.ok(complaintService.submitResolutionProposal(
                id, request.getTechnicianName(), request.getResolutionDescription(), request.getEvidenceUrl()
        ));
    }

    @PostMapping("/{id}/approve-proposal")
    public ResponseEntity<Complaint> approveProposal(
            @PathVariable String id,
            @RequestBody ReviewRequest request
    ) {
        return ResponseEntity.ok(complaintService.approveResolutionProposal(
                id, request.getReviewerName(), request.getNotes()
        ));
    }

    @PostMapping("/{id}/confirm")
    public ResponseEntity<Complaint> confirmResolution(
            @PathVariable String id,
            @RequestBody ConfirmRequest request
    ) {
        return ResponseEntity.ok(complaintService.residentConfirmResolution(
                id, request.getResidentName(), request.getRating(), request.getFeedback(), request.getSignature()
        ));
    }

    @PostMapping("/{id}/dispute")
    public ResponseEntity<Complaint> disputeResolution(
            @PathVariable String id,
            @RequestBody DisputeRequest request
    ) {
        return ResponseEntity.ok(complaintService.residentDisputeResolution(
                id, request.getResidentName(), request.getDisputeReason()
        ));
    }

    @Data
    public static class ReviewRequest {
        private String reviewerName;
        private String notes;
    }

    @Data
    public static class AssignRequest {
        private String technicianId;
        private String assignerName;
        private String notes;
    }

    @Data
    public static class ProposeRequest {
        private String technicianName;
        private String resolutionDescription;
        private String evidenceUrl;
    }

    @Data
    public static class ConfirmRequest {
        private String residentName;
        private int rating;
        private String feedback;
        private String signature;
    }

    @Data
    public static class DisputeRequest {
        private String residentName;
        private String disputeReason;
    }
}
