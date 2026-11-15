package com.civicops.community.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "preventive_completion_logs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PreventiveCompletionLog {

    @Id
    private String id;

    @Column(name = "schedule_id", nullable = false, length = 64)
    private String scheduleId;

    @Column(name = "work_order_id", length = 64)
    private String workOrderId;

    @Column(name = "completed_by", nullable = false, length = 120)
    private String completedBy;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Builder.Default
    @Column(name = "completed_at")
    private LocalDateTime completedAt = LocalDateTime.now();
}
