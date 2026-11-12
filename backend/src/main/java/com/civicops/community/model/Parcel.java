package com.civicops.community.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "parcels")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Parcel {

    @Id
    private String id;

    @Column(name = "tracking_number", nullable = false, unique = true, length = 60)
    private String trackingNumber;

    @Column(nullable = false, length = 30)
    private String carrier;

    @Column(name = "recipient_name", nullable = false, length = 120)
    private String recipientName;

    @Column(nullable = false, length = 50)
    private String tower;

    @Column(name = "unit_number", nullable = false, length = 30)
    private String unitNumber;

    @Column(name = "delivery_agent_name", nullable = false, length = 120)
    private String deliveryAgentName;

    @Column(name = "delivery_agent_phone", length = 30)
    private String deliveryAgentPhone;

    @Column(name = "locker_number", length = 60)
    private String lockerNumber;

    @Column(name = "pickup_otp", nullable = false, length = 10)
    private String pickupOtp;

    @Column(name = "received_at", updatable = false)
    @Builder.Default
    private LocalDateTime receivedAt = LocalDateTime.now();

    @Column(name = "picked_up_at")
    private LocalDateTime pickedUpAt;

    @Column(length = 30)
    @Builder.Default
    private String status = "IN_LOCKER";
}
