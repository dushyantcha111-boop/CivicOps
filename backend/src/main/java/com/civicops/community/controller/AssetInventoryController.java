package com.civicops.community.controller;

import com.civicops.community.model.*;
import com.civicops.community.repository.*;
import com.civicops.community.service.AuditService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

@RestController
@RequiredArgsConstructor
public class AssetInventoryController {

    private final AssetRepository assetRepository;
    private final SparePartRepository sparePartRepository;
    private final SpareRequisitionRepository requisitionRepository;
    private final InventoryMovementRepository movementRepository;
    private final WorkOrderRepository workOrderRepository;
    private final AuditService auditService;

    @GetMapping("/assets")
    @PreAuthorize("hasAnyRole('MAINTENANCE', 'MANAGEMENT', 'ADMIN')")
    public ResponseEntity<List<Asset>> getAllAssets() {
        return ResponseEntity.ok(assetRepository.findAll());
    }

    @GetMapping("/assets/{id}")
    @PreAuthorize("hasAnyRole('MAINTENANCE', 'MANAGEMENT', 'ADMIN')")
    public ResponseEntity<Asset> getAssetById(@PathVariable String id) {
        return assetRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/assets")
    @PreAuthorize("hasAnyRole('MANAGEMENT', 'ADMIN')")
    public ResponseEntity<Asset> createAsset(@Valid @RequestBody CreateAssetRequest request) {
        User actor = auditService.requireCurrentUser();
        long count = assetRepository.count() + 10;
        String assetCode = (request.getAssetCode() != null && !request.getAssetCode().isBlank())
                ? request.getAssetCode().trim().toUpperCase()
                : String.format("AST-%s-%02d", request.getTower().replace("Tower ", "").trim().toUpperCase(), count);

        Asset asset = Asset.builder()
                .id("ast-" + UUID.randomUUID().toString().substring(0, 8))
                .assetCode(assetCode)
                .name(request.getName().trim())
                .category(request.getCategory().trim().toUpperCase())
                .tower(request.getTower().trim())
                .location(request.getLocation().trim())
                .installationDate(request.getInstallationDate() != null ? request.getInstallationDate() : LocalDate.now())
                .warrantyExpiry(request.getWarrantyExpiry())
                .healthScore(request.getHealthScore() != null ? request.getHealthScore() : 98)
                .status(request.getStatus() != null ? request.getStatus() : "OPERATIONAL")
                .mtbfHours(request.getMtbfHours() != null ? request.getMtbfHours() : 1500)
                .mttrHours(request.getMttrHours() != null ? request.getMttrHours() : new BigDecimal("2.0"))
                .nextScheduledPm(request.getNextScheduledPm() != null ? request.getNextScheduledPm() : LocalDate.now().plusDays(30))
                .vendorName(request.getVendorName())
                .vendorContact(request.getVendorContact())
                .activeWorkOrdersCount(0)
                .createdAt(LocalDateTime.now())
                .build();

        Asset saved = assetRepository.save(asset);
        auditService.logAction(actor, "CREATE_ASSET", "ASSET", saved.getId(), "Registered asset " + saved.getAssetCode() + ": " + saved.getName());
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    @PutMapping("/assets/{id}")
    @PreAuthorize("hasAnyRole('MANAGEMENT', 'ADMIN')")
    public ResponseEntity<Asset> updateAsset(@PathVariable String id, @RequestBody Map<String, Object> updates) {
        User actor = auditService.requireCurrentUser();
        Asset asset = assetRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Asset not found: " + id));

        if (updates.containsKey("status")) asset.setStatus(String.valueOf(updates.get("status")));
        if (updates.containsKey("healthScore")) asset.setHealthScore(Integer.parseInt(String.valueOf(updates.get("healthScore"))));
        if (updates.containsKey("vendorName")) asset.setVendorName(String.valueOf(updates.get("vendorName")));
        if (updates.containsKey("vendorContact")) asset.setVendorContact(String.valueOf(updates.get("vendorContact")));

        Asset saved = assetRepository.save(asset);
        auditService.logAction(actor, "UPDATE_ASSET", "ASSET", saved.getId(), "Updated asset " + saved.getAssetCode());
        return ResponseEntity.ok(saved);
    }

    @GetMapping("/spares")
    @PreAuthorize("hasAnyRole('MAINTENANCE', 'MANAGEMENT', 'ADMIN')")
    public ResponseEntity<List<SparePart>> getAllSpares() {
        return ResponseEntity.ok(sparePartRepository.findAll());
    }

    @GetMapping("/inventory/movements")
    @PreAuthorize("hasAnyRole('MAINTENANCE', 'MANAGEMENT', 'ADMIN')")
    public ResponseEntity<List<InventoryMovement>> getInventoryMovements(@RequestParam(required = false) String partId) {
        if (partId != null && !partId.isBlank()) {
            return ResponseEntity.ok(movementRepository.findByPartIdOrderByCreatedAtDesc(partId));
        }
        return ResponseEntity.ok(movementRepository.findAllByOrderByCreatedAtDesc());
    }

    @PostMapping("/spares/{id}/reorder")
    @PreAuthorize("hasAnyRole('MANAGEMENT', 'ADMIN')")
    @Transactional
    public ResponseEntity<SparePart> reorderSpare(@PathVariable String id, @RequestBody Map<String, Integer> body) {
        User actor = auditService.requireCurrentUser();
        int qty = body != null ? body.getOrDefault("quantity", 10) : 10;
        if (qty <= 0) {
            throw new IllegalArgumentException("Reorder quantity must be greater than zero.");
        }

        SparePart part = sparePartRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Part not found: " + id));

        int newStock = part.getCurrentStock() + qty;
        part.setCurrentStock(newStock);
        SparePart saved = sparePartRepository.save(part);

        movementRepository.save(InventoryMovement.builder()
                .id("mov-" + UUID.randomUUID().toString().substring(0, 8))
                .partId(saved.getId())
                .partName(saved.getName())
                .movementType("RESTOCK")
                .quantity(qty)
                .balanceAfter(newStock)
                .actorName(actor.getName())
                .notes("Store restock purchase order received")
                .createdAt(LocalDateTime.now())
                .build());

        auditService.logAction(actor, "RESTOCK_SPARE", "SPARE_PART", saved.getId(),
                "Restocked " + saved.getName() + " by +" + qty + " (Balance: " + newStock + ")");
        return ResponseEntity.ok(saved);
    }

    @GetMapping("/requisitions")
    @PreAuthorize("hasAnyRole('MAINTENANCE', 'MANAGEMENT', 'ADMIN')")
    public ResponseEntity<List<SpareRequisition>> getAllRequisitions() {
        User currentUser = auditService.requireCurrentUser();
        if (currentUser.getRole() == Role.MAINTENANCE) {
            return ResponseEntity.ok(requisitionRepository.findByTechnicianId(currentUser.getId()));
        }
        return ResponseEntity.ok(requisitionRepository.findAll());
    }

    @PostMapping("/requisitions")
    @PreAuthorize("hasAnyRole('MAINTENANCE', 'MANAGEMENT', 'ADMIN')")
    @Transactional
    public ResponseEntity<SpareRequisition> createRequisition(@Valid @RequestBody CreateRequisitionRequest request) {
        User actor = auditService.requireCurrentUser();
        SparePart part = sparePartRepository.findById(request.getPartId())
                .orElseThrow(() -> new NoSuchElementException("Spare part not found: " + request.getPartId()));

        long count = requisitionRepository.count() + 100;
        String techId = (actor.getRole() == Role.MAINTENANCE || request.getTechnicianId() == null)
                ? actor.getId() : request.getTechnicianId();
        String techName = (actor.getRole() == Role.MAINTENANCE || request.getTechnicianName() == null)
                ? actor.getName() : request.getTechnicianName();

        SpareRequisition req = SpareRequisition.builder()
                .id("req-" + UUID.randomUUID().toString().substring(0, 8))
                .reqNumber(String.format("REQ-2024-%03d", count))
                .workOrderId(request.getWorkOrderId())
                .technicianId(techId)
                .technicianName(techName)
                .partId(part.getId())
                .partName(part.getName())
                .quantity(request.getQuantity())
                .urgency(request.getUrgency() != null ? request.getUrgency() : "ROUTINE")
                .status("PENDING_APPROVAL")
                .requestedAt(LocalDateTime.now())
                .build();

        SpareRequisition saved = requisitionRepository.save(req);
        auditService.logAction(actor, "CREATE_REQUISITION", "SPARE_REQUISITION", saved.getId(),
                "Requested " + saved.getQuantity() + "x " + saved.getPartName() + " (" + saved.getReqNumber() + ")");
        auditService.notify(null, "MANAGEMENT", "Spare Requisition Pending: " + saved.getReqNumber(),
                techName + " requested " + saved.getQuantity() + "x " + saved.getPartName(), "INVENTORY", saved.getId());
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    @PostMapping("/requisitions/{id}/approve")
    @PreAuthorize("hasAnyRole('MANAGEMENT', 'ADMIN')")
    @Transactional
    public ResponseEntity<?> approveRequisition(@PathVariable String id, @RequestBody(required = false) Map<String, String> body) {
        User actor = auditService.requireCurrentUser();
        SpareRequisition req = requisitionRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Requisition not found: " + id));

        if (!"PENDING_APPROVAL".equalsIgnoreCase(req.getStatus())) {
            throw new IllegalStateException("Requisition " + req.getReqNumber() + " has already been processed (" + req.getStatus() + "). Duplicate deduction blocked.");
        }

        SparePart part = sparePartRepository.findById(req.getPartId())
                .orElseThrow(() -> new NoSuchElementException("Spare part not found: " + req.getPartId()));

        if (part.getCurrentStock() < req.getQuantity()) {
            throw new IllegalArgumentException(
                    "Insufficient stock for " + part.getName() + ". Available: " + part.getCurrentStock() + ", Requested: " + req.getQuantity()
            );
        }

        int newStock = part.getCurrentStock() - req.getQuantity();
        part.setCurrentStock(newStock);
        sparePartRepository.save(part);

        req.setStatus("APPROVED");
        if (body != null && body.containsKey("notes")) {
            req.setManagerNotes(body.get("notes"));
        }
        SpareRequisition savedReq = requisitionRepository.save(req);

        movementRepository.save(InventoryMovement.builder()
                .id("mov-" + UUID.randomUUID().toString().substring(0, 8))
                .partId(part.getId())
                .partName(part.getName())
                .workOrderId(req.getWorkOrderId())
                .requisitionId(req.getId())
                .movementType("OUTBOUND_REQ")
                .quantity(req.getQuantity())
                .balanceAfter(newStock)
                .actorName(actor.getName())
                .notes("Approved " + req.getReqNumber() + " for " + req.getTechnicianName())
                .createdAt(LocalDateTime.now())
                .build());

        if (req.getWorkOrderId() != null && !req.getWorkOrderId().isBlank()) {
            workOrderRepository.findById(req.getWorkOrderId()).ifPresent(wo -> {
                List<WorkOrder.AllocatedSpare> spares = new ArrayList<>(wo.getSparesAllocated());
                spares.add(new WorkOrder.AllocatedSpare(part.getId(), part.getName(), req.getQuantity(), true));
                wo.setSparesAllocated(spares);
                workOrderRepository.save(wo);
            });
        }

        if (newStock <= part.getMinThreshold()) {
            auditService.notify(null, "MANAGEMENT", "Low Stock Alert: " + part.getName(),
                    "Stock dropped to " + newStock + " units (Threshold: " + part.getMinThreshold() + ")", "INVENTORY", part.getId());
        }
        auditService.notify(req.getTechnicianId(), "MAINTENANCE", "Spare Requisition Approved: " + req.getReqNumber(),
                req.getQuantity() + "x " + req.getPartName() + " issued from stores.", "INVENTORY", req.getId());
        auditService.logAction(actor, "APPROVE_REQUISITION", "SPARE_REQUISITION", savedReq.getId(),
                "Approved " + savedReq.getReqNumber() + ", deducted " + savedReq.getQuantity() + "x " + part.getName() + " (Balance: " + newStock + ")");

        return ResponseEntity.ok(savedReq);
    }

    @PostMapping("/requisitions/{id}/reject")
    @PreAuthorize("hasAnyRole('MANAGEMENT', 'ADMIN')")
    @Transactional
    public ResponseEntity<?> rejectRequisition(@PathVariable String id, @RequestBody(required = false) Map<String, String> body) {
        User actor = auditService.requireCurrentUser();
        SpareRequisition req = requisitionRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Requisition not found: " + id));

        if (!"PENDING_APPROVAL".equalsIgnoreCase(req.getStatus())) {
            throw new IllegalStateException("Requisition " + req.getReqNumber() + " is already " + req.getStatus());
        }

        req.setStatus("REJECTED");
        if (body != null && body.containsKey("notes")) {
            req.setManagerNotes(body.get("notes"));
        }
        SpareRequisition saved = requisitionRepository.save(req);

        auditService.notify(req.getTechnicianId(), "MAINTENANCE", "Spare Requisition Rejected: " + req.getReqNumber(),
                "Rejected by " + actor.getName() + (req.getManagerNotes() != null ? ": " + req.getManagerNotes() : ""),
                "INVENTORY", req.getId());
        auditService.logAction(actor, "REJECT_REQUISITION", "SPARE_REQUISITION", saved.getId(),
                "Rejected " + saved.getReqNumber());

        return ResponseEntity.ok(saved);
    }

    @Data
    public static class CreateAssetRequest {
        private String assetCode;
        @NotBlank(message = "Asset name is required")
        private String name;
        @NotBlank(message = "Asset category is required")
        private String category;
        @NotBlank(message = "Tower is required")
        private String tower;
        @NotBlank(message = "Location is required")
        private String location;
        private LocalDate installationDate;
        private LocalDate warrantyExpiry;
        private Integer healthScore;
        private String status;
        private Integer mtbfHours;
        private BigDecimal mttrHours;
        private LocalDate nextScheduledPm;
        private String vendorName;
        private String vendorContact;
    }

    @Data
    public static class CreateRequisitionRequest {
        private String workOrderId;
        private String technicianId;
        private String technicianName;
        @NotBlank(message = "Spare part ID is required")
        private String partId;
        private String partName;
        @Min(value = 1, message = "Quantity must be at least 1")
        private int quantity;
        private String urgency;
    }
}
