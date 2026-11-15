package com.civicops.community.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.core.type.TypeReference;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "work_orders")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WorkOrder {

    @Id
    private String id;

    @Column(name = "wo_number", nullable = false, unique = true)
    private String woNumber;

    @Column(nullable = false)
    private String title;

    @Column(name = "complaint_id")
    private String complaintId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private WorkOrderType type;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private WorkOrderStatus status;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Priority priority;

    @Column(name = "asset_id")
    private String assetId;

    @Column(name = "asset_name", length = 150)
    private String assetName;

    @Column(nullable = false)
    private String tower;

    @Column(nullable = false)
    private String location;

    @Column(name = "technician_id", nullable = false)
    private String technicianId;

    @Column(name = "technician_name", nullable = false)
    private String technicianName;

    @Column(name = "due_date", nullable = false)
    private LocalDateTime dueDate;

    @Column(name = "estimated_hours", precision = 4, scale = 2)
    private BigDecimal estimatedHours;

    @Column(name = "actual_hours", precision = 4, scale = 2)
    private BigDecimal actualHours;

    @Column(name = "technician_notes", columnDefinition = "TEXT")
    private String technicianNotes;

    @JsonIgnore
    @Column(name = "checklists", columnDefinition = "TEXT")
    private String checklistsJson;

    @JsonIgnore
    @Column(name = "spares_allocated", columnDefinition = "TEXT")
    private String sparesAllocatedJson;

    @Builder.Default
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @JsonProperty("checklists")
    public List<ChecklistItem> getChecklists() {
        return JsonFieldHelper.readList(checklistsJson, new TypeReference<>() {});
    }

    @JsonProperty("checklists")
    public void setChecklists(List<ChecklistItem> items) {
        this.checklistsJson = JsonFieldHelper.writeList(items);
    }

    @JsonProperty("sparesAllocated")
    public List<AllocatedSpare> getSparesAllocated() {
        return JsonFieldHelper.readList(sparesAllocatedJson, new TypeReference<>() {});
    }

    @JsonProperty("sparesAllocated")
    public void setSparesAllocated(List<AllocatedSpare> spares) {
        this.sparesAllocatedJson = JsonFieldHelper.writeList(spares);
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ChecklistItem {
        private String item;
        private boolean completed;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AllocatedSpare {
        private String partId;
        private String partName;
        private int quantity;
        private boolean fulfilled;
    }

    public enum WorkOrderType {
        CORRECTIVE, PREVENTIVE, EMERGENCY
    }

    public enum WorkOrderStatus {
        SCHEDULED, IN_PROGRESS, ON_HOLD, PROPOSAL_SUBMITTED, COMPLETED
    }

    public enum Priority {
        LOW, MEDIUM, HIGH, URGENT
    }
}
