package com.civicops.community.controller;

import com.civicops.community.model.WorkOrder;
import com.civicops.community.repository.WorkOrderRepository;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/work-orders")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class WorkOrderController {

    private final WorkOrderRepository workOrderRepository;

    @GetMapping
    public ResponseEntity<List<WorkOrder>> getAllWorkOrders() {
        return ResponseEntity.ok(workOrderRepository.findAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<WorkOrder> getWorkOrderById(@PathVariable String id) {
        return workOrderRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<WorkOrder> updateStatus(
            @PathVariable String id,
            @RequestBody StatusUpdateRequest request
    ) {
        WorkOrder wo = workOrderRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Work order not found: " + id));

        wo.setStatus(WorkOrder.WorkOrderStatus.valueOf(request.getStatus().toUpperCase()));
        if (request.getTechnicianNotes() != null) {
            wo.setTechnicianNotes(request.getTechnicianNotes());
        }
        return ResponseEntity.ok(workOrderRepository.save(wo));
    }

    @Data
    public static class StatusUpdateRequest {
        private String status;
        private String technicianNotes;
    }
}
