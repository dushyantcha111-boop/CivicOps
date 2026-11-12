package com.civicops.community.model;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "assets")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Asset {

    @Id
    private String id;

    @Column(name = "asset_code", nullable = false, unique = true, length = 50)
    private String assetCode;

    @Column(nullable = false, length = 150)
    private String name;

    @Column(nullable = false, length = 80)
    private String category;

    @Column(nullable = false, length = 50)
    private String tower;

    @Column(nullable = false, length = 150)
    private String location;

    @Column(name = "installation_date")
    private LocalDate installationDate;

    @Column(name = "warranty_expiry")
    private LocalDate warrantyExpiry;

    @Column(name = "health_score", nullable = false)
    @Builder.Default
    private Integer healthScore = 100;

    @Column(length = 30)
    @Builder.Default
    private String status = "OPERATIONAL";

    @Column(name = "mtbf_hours")
    @Builder.Default
    private Integer mtbfHours = 1000;

    @Column(name = "mttr_hours")
    @Builder.Default
    private BigDecimal mttrHours = new BigDecimal("2.0");

    @Column(name = "last_serviced_date")
    private LocalDate lastServicedDate;

    @Column(name = "next_scheduled_pm")
    private LocalDate nextScheduledPm;

    @Column(name = "vendor_name", length = 150)
    private String vendorName;

    @Column(name = "vendor_contact", length = 150)
    private String vendorContact;

    @Column(name = "created_at", updatable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}
