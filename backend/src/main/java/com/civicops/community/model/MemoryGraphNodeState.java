package com.civicops.community.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "memory_graph_node_states")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MemoryGraphNodeState {

    @Id
    @Column(name = "node_id", length = 128)
    private String nodeId;

    @Column(name = "pos_x", nullable = false)
    private Double posX;

    @Column(name = "pos_y", nullable = false)
    private Double posY;

    @Builder.Default
    @Column(name = "pinned")
    private Boolean pinned = false;

    @Column(name = "updated_by", length = 120)
    private String updatedBy;

    @Builder.Default
    @Column(name = "updated_at")
    private LocalDateTime updatedAt = LocalDateTime.now();
}
