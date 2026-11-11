package com.civicops.community.model;

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

    @Column(name = "assigned_technician_id")
    private String assignedTechnicianId;

    @Column(name = "assigned_technician_name")
    private String assignedTechnicianName;

    @Column(name = "sla_deadline", nullable = false)
    private LocalDateTime slaDeadline;

    @Column(name = "sla_breached")
    private Boolean slaBreached = false;

    @Column(name = "recurrence_warning")
    private String recurrenceWarning;

    @Column(name = "recurring_count")
    private Integer recurringCount = 1;

    @Column(name = "inspection_notes", columnDefinition = "TEXT")
    private String inspectionNotes;

    @Column(name = "proposed_resolution", columnDefinition = "TEXT")
    private String proposedResolution;

    @Column(name = "resident_rating")
    private Integer residentRating;

    @Column(name = "resident_feedback", columnDefinition = "TEXT")
    private String residentFeedback;

    @Column(name = "dispute_reason", columnDefinition = "TEXT")
    private String disputeReason;

    @OneToMany(mappedBy = "complaint", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("stepNumber ASC")
    private List<ComplaintTimeline> timeline = new ArrayList<>();

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at")
    private LocalDateTime updatedAt = LocalDateTime.now();

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
