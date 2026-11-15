package com.civicops.community.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "inventory_movements")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InventoryMovement {

    @Id
    private String id;

    @Column(name = "part_id", nullable = false, length = 64)
    private String partId;

    @Column(name = "part_name", nullable = false, length = 150)
    private String partName;

    @Column(name = "work_order_id", length = 64)
    private String workOrderId;

    @Column(name = "requisition_id", length = 64)
    private String requisitionId;

    @Column(name = "movement_type", nullable = false, length = 30)
    private String movementType;

    @Column(nullable = false)
    private Integer quantity;

    @Column(name = "balance_after", nullable = false)
    private Integer balanceAfter;

    @Column(name = "actor_name", nullable = false, length = 120)
    private String actorName;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Builder.Default
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();
}
