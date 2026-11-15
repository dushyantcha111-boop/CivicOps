package com.civicops.community.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "recurrence_investigations")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RecurrenceInvestigation {

    @Id
    private String id;

    @Column(name = "cluster_code", nullable = false, unique = true, length = 50)
    private String clusterCode;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(nullable = false, length = 50)
    private String tower;

    @Column(nullable = false, length = 50)
    private String category;

    @Column(name = "asset_id", length = 64)
    private String assetId;

    @Column(nullable = false, length = 40)
    private String severity;

    @Builder.Default
    @Column(name = "incident_count", nullable = false)
    private Integer incidentCount = 1;

    @Builder.Default
    @Column(name = "time_window_days", nullable = false)
    private Integer timeWindowDays = 30;

    @Builder.Default
    @Column(nullable = false, length = 40)
    private String status = "PENDING_DIRECTIVE";

    @Column(name = "root_cause", columnDefinition = "TEXT")
    private String rootCause;

    @Column(name = "suggested_fix", columnDefinition = "TEXT")
    private String suggestedFix;

    @Column(name = "capex_estimate", length = 80)
    private String capexEstimate;

    @Column(name = "investigation_notes", columnDefinition = "TEXT")
    private String investigationNotes;

    @Column(name = "follow_up_action", columnDefinition = "TEXT")
    private String followUpAction;

    @Column(name = "investigated_by", length = 120)
    private String investigatedBy;

    @Builder.Default
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @Builder.Default
    @Column(name = "updated_at")
    private LocalDateTime updatedAt = LocalDateTime.now();
}
