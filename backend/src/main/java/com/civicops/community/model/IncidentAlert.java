package com.civicops.community.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "incident_alerts")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class IncidentAlert {

    @Id
    private String id;

    @Column(name = "alert_code", nullable = false, unique = true, length = 50)
    private String alertCode;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(nullable = false, length = 30)
    private String severity;

    @Column(nullable = false, length = 30)
    private String category;

    @Column(nullable = false, length = 50)
    private String tower;

    @Column(nullable = false, length = 150)
    private String location;

    @Column(name = "reported_by", nullable = false, length = 120)
    private String reportedBy;

    @Column(name = "reported_at", updatable = false)
    @Builder.Default
    private LocalDateTime reportedAt = LocalDateTime.now();

    @Column(length = 30)
    @Builder.Default
    private String status = "ACTIVE";

    @Column(name = "broadcast_sent")
    @Builder.Default
    private Boolean broadcastSent = true;

    @Column(name = "sms_sent_count")
    @Builder.Default
    private Integer smsSentCount = 480;
}
