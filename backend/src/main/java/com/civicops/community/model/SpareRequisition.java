package com.civicops.community.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "spare_requisitions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SpareRequisition {

    @Id
    private String id;

    @Column(name = "req_number", nullable = false, unique = true, length = 50)
    private String reqNumber;

    @Column(name = "work_order_id", length = 64)
    private String workOrderId;

    @Column(name = "technician_id", nullable = false, length = 64)
    private String technicianId;

    @Column(name = "technician_name", nullable = false, length = 120)
    private String technicianName;

    @Column(name = "part_id", nullable = false, length = 64)
    private String partId;

    @Column(name = "part_name", nullable = false, length = 150)
    private String partName;

    @Column(nullable = false)
    private Integer quantity;

    @Column(length = 30)
    @Builder.Default
    private String urgency = "ROUTINE";

    @Column(name = "requested_at")
    @Builder.Default
    private LocalDateTime requestedAt = LocalDateTime.now();

    @Column(length = 30)
    @Builder.Default
    private String status = "PENDING_APPROVAL";

    @Column(name = "manager_notes", columnDefinition = "TEXT")
    private String managerNotes;
}
