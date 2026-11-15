package com.civicops.community.controller;

import com.civicops.community.model.Role;
import com.civicops.community.model.User;
import com.civicops.community.model.WorkOrder;
import com.civicops.community.repository.WorkOrderRepository;
import com.civicops.community.service.AuditService;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.NoSuchElementException;

@RestController
@RequestMapping("/work-orders")
@RequiredArgsConstructor
public class WorkOrderController {

    private final WorkOrderRepository workOrderRepository;
    private final AuditService auditService;

    @GetMapping
    @PreAuthorize("hasAnyRole('MAINTENANCE', 'MANAGEMENT', 'ADMIN')")
    public ResponseEntity<List<WorkOrder>> getAllWorkOrders() {
        User currentUser = auditService.requireCurrentUser();
        if (currentUser.getRole() == Role.MAINTENANCE) {
            return ResponseEntity.ok(workOrderRepository.findByTechnicianId(currentUser.getId()));
        }
        return ResponseEntity.ok(workOrderRepository.findAll());
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('MAINTENANCE', 'MANAGEMENT', 'ADMIN')")
    public ResponseEntity<WorkOrder> getWorkOrderById(@PathVariable String id) {
        User currentUser = auditService.requireCurrentUser();
        WorkOrder wo = workOrderRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Work order not found: " + id));
        if (currentUser.getRole() == Role.MAINTENANCE && !wo.getTechnicianId().equals(currentUser.getId())) {
            throw new AccessDeniedException("Maintenance technicians may only access assigned work orders.");
        }
        return ResponseEntity.ok(wo);
    }

    @PutMapping("/{id}/status")
    @PreAuthorize("hasAnyRole('MAINTENANCE', 'MANAGEMENT', 'ADMIN')")
    public ResponseEntity<WorkOrder> updateStatus(
            @PathVariable String id,
            @RequestBody StatusUpdateRequest request
    ) {
        User currentUser = auditService.requireCurrentUser();
        WorkOrder wo = workOrderRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Work order not found: " + id));

        if (currentUser.getRole() == Role.MAINTENANCE && !wo.getTechnicianId().equals(currentUser.getId())) {
            throw new AccessDeniedException("You may only update your own assigned work orders.");
        }

        WorkOrder.WorkOrderStatus nextStatus = WorkOrder.WorkOrderStatus.valueOf(request.getStatus().toUpperCase());

        // CRITICAL DOMAIN RULE: A technician cannot directly mark a complaint-linked work order COMPLETED
        if (currentUser.getRole() == Role.MAINTENANCE
                && wo.getComplaintId() != null
                && nextStatus == WorkOrder.WorkOrderStatus.COMPLETED) {
            throw new IllegalStateException("Complaint-linked work orders require resident sign-off before COMPLETED status. Submit a resolution proposal instead.");
        }

        wo.setStatus(nextStatus);
        if (request.getTechnicianNotes() != null) {
            wo.setTechnicianNotes(request.getTechnicianNotes());
        }
        if (request.getActualHours() != null) {
            wo.setActualHours(request.getActualHours());
        }

        WorkOrder saved = workOrderRepository.save(wo);
        auditService.logAction(currentUser, "UPDATE_WORK_ORDER_STATUS", "WORK_ORDER", saved.getId(),
                saved.getWoNumber() + " -> " + saved.getStatus());
        return ResponseEntity.ok(saved);
    }

    @PutMapping("/{id}/checklist")
    @PreAuthorize("hasAnyRole('MAINTENANCE', 'MANAGEMENT', 'ADMIN')")
    public ResponseEntity<WorkOrder> updateChecklist(
            @PathVariable String id,
            @RequestBody ChecklistUpdateRequest request
    ) {
        User currentUser = auditService.requireCurrentUser();
        WorkOrder wo = workOrderRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Work order not found: " + id));

        if (currentUser.getRole() == Role.MAINTENANCE && !wo.getTechnicianId().equals(currentUser.getId())) {
            throw new AccessDeniedException("You may only update checklists on your assigned work orders.");
        }

        if (request.getChecklists() != null) {
            wo.setChecklists(request.getChecklists());
        }
        if (request.getTechnicianNotes() != null) {
            wo.setTechnicianNotes(request.getTechnicianNotes());
        }

        WorkOrder saved = workOrderRepository.save(wo);
        auditService.logAction(currentUser, "UPDATE_WORK_ORDER_CHECKLIST", "WORK_ORDER", saved.getId(),
                "Updated checklist for " + saved.getWoNumber());
        return ResponseEntity.ok(saved);
    }

    @Data
    public static class StatusUpdateRequest {
        private String status;
        private String technicianNotes;
        private BigDecimal actualHours;
    }

    @Data
    public static class ChecklistUpdateRequest {
        private List<WorkOrder.ChecklistItem> checklists;
        private String technicianNotes;
    }
}
