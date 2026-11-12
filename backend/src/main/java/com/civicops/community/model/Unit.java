package com.civicops.community.model;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "units")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Unit {

    @Id
    private String id;

    @Column(name = "unit_number", nullable = false, unique = true, length = 30)
    private String unitNumber;

    @Column(nullable = false, length = 50)
    private String tower;

    @Column(nullable = false)
    private Integer floor;

    @Column(nullable = false, length = 30)
    private String type;

    @Column(name = "owner_name", nullable = false, length = 120)
    private String ownerName;

    @Column(name = "owner_phone", nullable = false, length = 30)
    private String ownerPhone;

    @Column(name = "is_tenant_occupied")
    @Builder.Default
    private Boolean isTenantOccupied = false;

    @Column(name = "tenant_name", length = 120)
    private String tenantName;

    @Column(name = "tenant_phone", length = 30)
    private String tenantPhone;

    @Column(name = "occupancy_status", length = 30)
    @Builder.Default
    private String occupancyStatus = "OCCUPIED";

    @Column(name = "dues_amount")
    @Builder.Default
    private BigDecimal duesAmount = BigDecimal.ZERO;

    @Column(name = "dues_status", length = 20)
    @Builder.Default
    private String duesStatus = "PAID";

    @Column(name = "created_at", updatable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}
