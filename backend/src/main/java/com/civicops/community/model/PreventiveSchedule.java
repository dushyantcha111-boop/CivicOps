package com.civicops.community.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "preventive_schedules")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PreventiveSchedule {

    @Id
    private String id;

    @Column(name = "task_code", nullable = false, unique = true, length = 50)
    private String taskCode;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(name = "asset_name", nullable = false, length = 150)
    private String assetName;

    @Column(nullable = false, length = 50)
    private String tower;

    @Column(nullable = false, length = 30)
    private String frequency;

    @Column(name = "next_due_date", nullable = false)
    private LocalDateTime nextDueDate;

    @Column(name = "assigned_team", nullable = false, length = 120)
    private String assignedTeam;

    @Column(length = 30)
    @Builder.Default
    private String status = "SCHEDULED";

    @Column(name = "created_at", updatable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}
