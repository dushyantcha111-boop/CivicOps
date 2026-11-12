package com.civicops.community.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "visitor_passes")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class VisitorPass {

    @Id
    private String id;

    @Column(name = "pass_code", nullable = false, unique = true, length = 40)
    private String passCode;

    @Column(name = "six_digit_pin", nullable = false, length = 10)
    private String sixDigitPin;

    @Column(name = "visitor_name", nullable = false, length = 120)
    private String visitorName;

    @Column(name = "visitor_phone", nullable = false, length = 30)
    private String visitorPhone;

    @Column(name = "visitor_type", nullable = false, length = 30)
    private String visitorType;

    @Column(name = "vehicle_number", length = 40)
    private String vehicleNumber;

    @Column(nullable = false, length = 50)
    private String tower;

    @Column(name = "unit_number", nullable = false, length = 30)
    private String unitNumber;

    @Column(name = "resident_name", nullable = false, length = 120)
    private String residentName;

    @Column(name = "entry_gate", length = 60)
    @Builder.Default
    private String entryGate = "Gate 1";

    @Column(name = "valid_from", nullable = false)
    private LocalDateTime validFrom;

    @Column(name = "valid_until", nullable = false)
    private LocalDateTime validUntil;

    @Column(nullable = false, length = 30)
    @Builder.Default
    private String status = "PRE_APPROVED";

    @Column(name = "check_in_time")
    private LocalDateTime checkInTime;

    @Column(name = "check_out_time")
    private LocalDateTime checkOutTime;

    @Column(name = "overstay_minutes")
    @Builder.Default
    private Integer overstayMinutes = 0;

    @Column(name = "revocation_reason", length = 255)
    private String revocationReason;

    @Column(name = "created_at", updatable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}
