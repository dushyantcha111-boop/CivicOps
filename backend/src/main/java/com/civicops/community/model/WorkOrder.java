package com.civicops.community.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "work_orders")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WorkOrder {

    @Id
    private String id;

    @Column(name = "wo_number", nullable = false, unique = true)
    private String woNumber;

    @Column(nullable = false)
    private String title;

    @Column(name = "complaint_id")
    private String complaintId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private WorkOrderType type;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private WorkOrderStatus status;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Priority priority;

    @Column(name = "asset_id")
    private String assetId;

    @Column(nullable = false)
    private String tower;

    @Column(nullable = false)
    private String location;

    @Column(name = "technician_id", nullable = false)
    private String technicianId;

    @Column(name = "technician_name", nullable = false)
    private String technicianName;

    @Column(name = "due_date", nullable = false)
    private LocalDateTime dueDate;

    @Column(name = "estimated_hours")
    private Double estimatedHours;

    @Column(name = "actual_hours")
    private Double actualHours;

    @Column(name = "technician_notes", columnDefinition = "TEXT")
    private String technicianNotes;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    public enum WorkOrderType {
        CORRECTIVE, PREVENTIVE, EMERGENCY
    }

    public enum WorkOrderStatus {
        SCHEDULED, IN_PROGRESS, ON_HOLD, PROPOSAL_SUBMITTED, COMPLETED
    }

    public enum Priority {
        LOW, MEDIUM, HIGH, URGENT
    }
}
