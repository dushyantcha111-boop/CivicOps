package com.civicops.community.controller;

import com.civicops.community.model.Asset;
import com.civicops.community.model.SparePart;
import com.civicops.community.model.SpareRequisition;
import com.civicops.community.repository.AssetRepository;
import com.civicops.community.repository.SparePartRepository;
import com.civicops.community.repository.SpareRequisitionRepository;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class AssetInventoryController {

    private final AssetRepository assetRepository;
    private final SparePartRepository sparePartRepository;
    private final SpareRequisitionRepository requisitionRepository;

    @GetMapping("/assets")
    public ResponseEntity<List<Asset>> getAllAssets() {
        return ResponseEntity.ok(assetRepository.findAll());
    }

    @GetMapping("/assets/{id}")
    public ResponseEntity<Asset> getAssetById(@PathVariable String id) {
        return assetRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/spares")
    public ResponseEntity<List<SparePart>> getAllSpares() {
        return ResponseEntity.ok(sparePartRepository.findAll());
    }

    @PostMapping("/spares/{id}/reorder")
    @Transactional
    public ResponseEntity<SparePart> reorderSpare(@PathVariable String id, @RequestBody Map<String, Integer> body) {
        int qty = body.getOrDefault("quantity", 10);
        SparePart part = sparePartRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Part not found: " + id));

        part.setCurrentStock(part.getCurrentStock() + qty);
        return ResponseEntity.ok(sparePartRepository.save(part));
    }

    @GetMapping("/requisitions")
    public ResponseEntity<List<SpareRequisition>> getAllRequisitions() {
        return ResponseEntity.ok(requisitionRepository.findAll());
    }

    @PostMapping("/requisitions")
    public ResponseEntity<SpareRequisition> createRequisition(@RequestBody CreateRequisitionRequest request) {
        long count = requisitionRepository.count() + 100;
        SpareRequisition req = SpareRequisition.builder()
                .id("req-" + UUID.randomUUID().toString().substring(0, 8))
                .reqNumber(String.format("REQ-2024-%03d", count))
                .workOrderId(request.getWorkOrderId())
                .technicianId(request.getTechnicianId())
                .technicianName(request.getTechnicianName())
                .partId(request.getPartId())
                .partName(request.getPartName())
                .quantity(request.getQuantity())
                .urgency(request.getUrgency() != null ? request.getUrgency() : "ROUTINE")
                .status("PENDING_APPROVAL")
                .requestedAt(LocalDateTime.now())
                .build();

        return ResponseEntity.status(HttpStatus.CREATED).body(requisitionRepository.save(req));
    }

    @PostMapping("/requisitions/{id}/approve")
    @Transactional
    public ResponseEntity<?> approveRequisition(@PathVariable String id, @RequestBody(required = false) Map<String, String> body) {
        SpareRequisition req = requisitionRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Requisition not found: " + id));

        req.setStatus("APPROVED");
        if (body != null && body.containsKey("notes")) {
            req.setManagerNotes(body.get("notes"));
        }

        // Deduct inventory
        sparePartRepository.findById(req.getPartId()).ifPresent(part -> {
            if (part.getCurrentStock() >= req.getQuantity()) {
                part.setCurrentStock(part.getCurrentStock() - req.getQuantity());
                sparePartRepository.save(part);
            }
        });

        return ResponseEntity.ok(requisitionRepository.save(req));
    }

    @PostMapping("/requisitions/{id}/reject")
    @Transactional
    public ResponseEntity<?> rejectRequisition(@PathVariable String id, @RequestBody(required = false) Map<String, String> body) {
        SpareRequisition req = requisitionRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Requisition not found: " + id));

        req.setStatus("REJECTED");
        if (body != null && body.containsKey("notes")) {
            req.setManagerNotes(body.get("notes"));
        }
        return ResponseEntity.ok(requisitionRepository.save(req));
    }

    @Data
    public static class CreateRequisitionRequest {
        private String workOrderId;
        private String technicianId;
        private String technicianName;
        private String partId;
        private String partName;
        private int quantity;
        private String urgency;
    }
}
