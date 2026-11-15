package com.civicops.community.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonManagedReference;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.core.type.TypeReference;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "complaints")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Complaint {

    @Id
    private String id;

    @Column(name = "ticket_number", nullable = false, unique = true)
    private String ticketNumber;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ComplaintCategory category;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ComplaintSeverity severity;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ComplaintStatus status;

    @Column(nullable = false)
    private String tower;

    @Column(name = "unit_number", nullable = false)
    private String unitNumber;

    @Column(name = "resident_id", nullable = false)
    private String residentId;

    @Column(name = "resident_name", nullable = false)
    private String residentName;

    @Column(name = "resident_phone", nullable = false)
    private String residentPhone;

    @Column(name = "asset_id", length = 64)
    private String assetId;

    @Column(name = "assigned_technician_id")
    private String assignedTechnicianId;

    @Column(name = "assigned_technician_name")
    private String assignedTechnicianName;

    @Column(name = "sla_deadline", nullable = false)
    private LocalDateTime slaDeadline;

    @Builder.Default
    @Column(name = "sla_breached")
    private Boolean slaBreached = false;

    @Column(name = "recurrence_warning")
    private String recurrenceWarning;

    @Builder.Default
    @Column(name = "recurring_count")
    private Integer recurringCount = 1;

    @Column(name = "inspection_notes", columnDefinition = "TEXT")
    private String inspectionNotes;

    @Column(name = "proposed_resolution", columnDefinition = "TEXT")
    private String proposedResolution;

    @JsonIgnore
    @Column(name = "evidence_before", columnDefinition = "TEXT")
    private String evidenceBeforeJson;

    @JsonIgnore
    @Column(name = "evidence_after", columnDefinition = "TEXT")
    private String evidenceAfterJson;

    @JsonIgnore
    @Column(name = "proposed_spares", columnDefinition = "TEXT")
    private String proposedSparesJson;

    @Column(name = "resident_rating")
    private Integer residentRating;

    @Column(name = "resident_feedback", columnDefinition = "TEXT")
    private String residentFeedback;

    @Column(name = "dispute_reason", columnDefinition = "TEXT")
    private String disputeReason;

    @JsonManagedReference
    @Builder.Default
    @OneToMany(mappedBy = "complaint", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("stepNumber ASC")
    private List<ComplaintTimeline> timeline = new ArrayList<>();

    @Builder.Default
    @Column(name = "submitted_at")
    private LocalDateTime submittedAt = LocalDateTime.now();

    @Builder.Default
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @Builder.Default
    @Column(name = "updated_at")
    private LocalDateTime updatedAt = LocalDateTime.now();

    @JsonProperty("evidenceBefore")
    public List<String> getEvidenceBefore() {
        return JsonFieldHelper.readList(evidenceBeforeJson, new TypeReference<>() {});
    }

    @JsonProperty("evidenceBefore")
    public void setEvidenceBefore(List<String> list) {
        this.evidenceBeforeJson = JsonFieldHelper.writeList(list);
    }

    @JsonProperty("evidenceAfter")
    public List<String> getEvidenceAfter() {
        return JsonFieldHelper.readList(evidenceAfterJson, new TypeReference<>() {});
    }

    @JsonProperty("evidenceAfter")
    public void setEvidenceAfter(List<String> list) {
        this.evidenceAfterJson = JsonFieldHelper.writeList(list);
    }

    @JsonProperty("proposedSpares")
    public List<ProposedSpareItem> getProposedSpares() {
        return JsonFieldHelper.readList(proposedSparesJson, new TypeReference<>() {});
    }

    @JsonProperty("proposedSpares")
    public void setProposedSpares(List<ProposedSpareItem> list) {
        this.proposedSparesJson = JsonFieldHelper.writeList(list);
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ProposedSpareItem {
        private String partId;
        private String partName;
        private int quantity;
    }

    public enum ComplaintCategory {
        PLUMBING, ELECTRICAL, ELEVATOR, HVAC, CIVIL, SECURITY, COMMON_AREA
    }

    public enum ComplaintSeverity {
        LOW, MEDIUM, HIGH, CRITICAL
    }

    public enum ComplaintStatus {
        SUBMITTED, REVIEWED, ASSIGNED, INSPECTING, PROPOSED, MANAGEMENT_APPROVED, RESIDENT_CONFIRMED, DISPUTED, CLOSED
    }
}
