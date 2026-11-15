package com.civicops.community.model;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "dues_payments")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DuesPayment {

    @Id
    private String id;

    @Column(name = "unit_id", nullable = false, length = 64)
    private String unitId;

    @Column(name = "unit_number", nullable = false, length = 30)
    private String unitNumber;

    @Column(name = "resident_id", nullable = false, length = 64)
    private String residentId;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal amount;

    @Column(name = "payment_ref", nullable = false, unique = true, length = 80)
    private String paymentRef;

    @Column(name = "payment_method", nullable = false, length = 40)
    private String paymentMethod;

    @Builder.Default
    @Column(name = "paid_at")
    private LocalDateTime paidAt = LocalDateTime.now();
}
