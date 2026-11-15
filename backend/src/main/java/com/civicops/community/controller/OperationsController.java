package com.civicops.community.controller;

import com.civicops.community.model.*;
import com.civicops.community.repository.*;
import com.civicops.community.service.AuditService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.*;

@RestController
@RequiredArgsConstructor
public class OperationsController {

    private final UnitRepository unitRepository;
    private final ParcelRepository parcelRepository;
    private final IncidentAlertRepository incidentAlertRepository;
    private final PreventiveScheduleRepository preventiveScheduleRepository;
    private final PreventiveCompletionLogRepository pmLogRepository;
    private final WorkOrderRepository workOrderRepository;
    private final AssetRepository assetRepository;
    private final DuesPaymentRepository duesPaymentRepository;
    private final UserRepository userRepository;
    private final AuditService auditService;
    private final SecureRandom secureRandom = new SecureRandom();

    // ==================== UNITS & DUES ====================

    @GetMapping("/units")
    public ResponseEntity<List<Unit>> getAllUnits() {
        User currentUser = auditService.requireCurrentUser();
        if (currentUser.getRole() == Role.RESIDENT) {
            if (!currentUser.hasVerifiedUnit()) {
                return ResponseEntity.ok(List.of());
            }
            if (currentUser.getUnitNumber() != null) {
                return unitRepository.findByUnitNumber(currentUser.getUnitNumber())
                        .map(List::of)
                        .map(ResponseEntity::ok)
                        .orElse(ResponseEntity.ok(unitRepository.findByResidentUserId(currentUser.getId())));
            }
            return ResponseEntity.ok(unitRepository.findByResidentUserId(currentUser.getId()));
        }
        return ResponseEntity.ok(unitRepository.findAll());
    }

    @PostMapping("/units")
    @PreAuthorize("hasAnyRole('MANAGEMENT', 'ADMIN')")
    public ResponseEntity<Unit> createUnit(@Valid @RequestBody CreateUnitRequest request) {
        User actor = auditService.requireCurrentUser();
        String unitNo = request.getUnitNumber().trim().toUpperCase();
        if (unitRepository.findByUnitNumber(unitNo).isPresent()) {
            throw new IllegalStateException("Unit " + unitNo + " already exists.");
        }

        Unit unit = Unit.builder()
                .id("unit-" + unitNo.toLowerCase().replaceAll("[^a-z0-9]+", "-"))
                .unitNumber(unitNo)
                .tower(request.getTower().trim())
                .floor(request.getFloor())
                .type(request.getType().trim())
                .ownerName(request.getOwnerName().trim())
                .ownerPhone(request.getOwnerPhone().trim())
                .isTenantOccupied(Boolean.TRUE.equals(request.getIsTenantOccupied()))
                .tenantName(request.getTenantName())
                .tenantPhone(request.getTenantPhone())
                .occupancyStatus(request.getOccupancyStatus() != null ? request.getOccupancyStatus() : "OCCUPIED")
                .duesAmount(request.getDuesAmount() != null ? request.getDuesAmount() : BigDecimal.ZERO)
                .duesStatus(request.getDuesAmount() != null && request.getDuesAmount().compareTo(BigDecimal.ZERO) > 0 ? "PENDING" : "PAID")
                .createdAt(LocalDateTime.now())
                .build();
        unit.setRegisteredVehicles(request.getRegisteredVehicles() != null ? request.getRegisteredVehicles() : List.of());

        Unit saved = unitRepository.save(unit);
        auditService.logAction(actor, "CREATE_UNIT", "UNIT", saved.getId(), "Onboarded unit " + saved.getUnitNumber());
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    @PostMapping("/units/{id}/pay-dues")
    @PreAuthorize("hasAnyRole('RESIDENT', 'MANAGEMENT', 'ADMIN')")
    @Transactional
    public ResponseEntity<?> payUnitDues(@PathVariable String id, @RequestBody(required = false) Map<String, String> body) {
        User actor = auditService.requireCurrentUser();
        Unit unit = unitRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Unit not found: " + id));

        if (actor.getRole() == Role.RESIDENT) {
            if (!actor.hasVerifiedUnit()) {
                throw new AccessDeniedException("Your apartment unit claim must be verified by Management before settling dues.");
            }
            boolean ownsByUnitNo = actor.getUnitNumber() != null && unit.getUnitNumber().equalsIgnoreCase(actor.getUnitNumber());
            boolean ownsById = unit.getResidentUserId() != null && unit.getResidentUserId().equals(actor.getId());
            if (!ownsByUnitNo && !ownsById) {
                throw new AccessDeniedException("Residents can only settle dues for their own apartment unit.");
            }
        }

        if (unit.getDuesAmount() == null || unit.getDuesAmount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalStateException("Unit " + unit.getUnitNumber() + " has no outstanding maintenance dues.");
        }

        BigDecimal paidAmount = unit.getDuesAmount();
        String rawMethod = body != null ? body.getOrDefault("paymentMethod", "Manual / Demo Ledger Entry") : "Manual / Demo Ledger Entry";
        String method = (rawMethod != null && (rawMethod.toLowerCase().contains("demo") || rawMethod.toLowerCase().contains("manual") || rawMethod.toLowerCase().contains("ledger")))
                ? rawMethod
                : "Manual / Demo Ledger (" + rawMethod + ")";
        String paymentRef = "LEDGER-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();

        DuesPayment payment = DuesPayment.builder()
                .id("dues-" + UUID.randomUUID().toString().substring(0, 8))
                .unitId(unit.getId())
                .unitNumber(unit.getUnitNumber())
                .residentId(actor.getId())
                .amount(paidAmount)
                .paymentRef(paymentRef)
                .paymentMethod(method)
                .paidAt(LocalDateTime.now())
                .build();
        duesPaymentRepository.save(payment);

        unit.setDuesAmount(BigDecimal.ZERO);
        unit.setDuesStatus("PAID");
        Unit savedUnit = unitRepository.save(unit);

        auditService.logAction(actor, "RECORD_DEMO_DUES_PAYMENT", "UNIT", unit.getId(),
                "Recorded manual/demo ledger settlement of INR " + paidAmount + " for unit " + unit.getUnitNumber() + " (Ref: " + paymentRef + ")");

        return ResponseEntity.ok(Map.of(
                "unit", savedUnit,
                "payment", payment
        ));
    }

    @GetMapping("/units/payments")
    @PreAuthorize("hasAnyRole('RESIDENT', 'MANAGEMENT', 'ADMIN')")
    public ResponseEntity<List<DuesPayment>> getDuesPayments() {
        User actor = auditService.requireCurrentUser();
        if (actor.getRole() == Role.RESIDENT) {
            return ResponseEntity.ok(duesPaymentRepository.findByResidentIdOrderByPaidAtDesc(actor.getId()));
        }
        return ResponseEntity.ok(duesPaymentRepository.findAll());
    }

    // ==================== PARCELS ====================

    @GetMapping("/parcels")
    public ResponseEntity<List<Parcel>> getAllParcels() {
        User currentUser = auditService.requireCurrentUser();
        if (currentUser.getRole() == Role.RESIDENT) {
            if (currentUser.hasVerifiedUnit()) {
                return ResponseEntity.ok(parcelRepository.findByUnitNumber(currentUser.getUnitNumber()));
            }
            return ResponseEntity.ok(List.of());
        }
        return ResponseEntity.ok(parcelRepository.findAll());
    }

    @PostMapping("/parcels")
    @PreAuthorize("hasAnyRole('SECURITY', 'ADMIN')")
    public ResponseEntity<Parcel> createParcel(@Valid @RequestBody CreateParcelRequest request) {
        User guard = auditService.requireCurrentUser();
        String otp = String.format("%06d", secureRandom.nextInt(900000) + 100000);
        String tracking = (request.getTrackingNumber() != null && !request.getTrackingNumber().isBlank())
                ? request.getTrackingNumber().trim().toUpperCase()
                : request.getCarrier().trim().toUpperCase().substring(0, Math.min(3, request.getCarrier().trim().length()))
                        + "-" + (10000 + secureRandom.nextInt(90000));

        Parcel parcel = Parcel.builder()
                .id("pcl-" + UUID.randomUUID().toString().substring(0, 8))
                .trackingNumber(tracking)
                .carrier(request.getCarrier().trim().toUpperCase())
                .recipientName(request.getRecipientName().trim())
                .tower(request.getTower().trim())
                .unitNumber(request.getUnitNumber().trim().toUpperCase())
                .deliveryAgentName(request.getDeliveryAgentName().trim())
                .deliveryAgentPhone(request.getDeliveryAgentPhone())
                .lockerNumber(request.getLockerNumber() != null && !request.getLockerNumber().isBlank()
                        ? request.getLockerNumber().trim() : "Gate 1 Desk Rack")
                .pickupOtp(otp)
                .receivedAt(LocalDateTime.now())
                .status(request.getLockerNumber() != null && request.getLockerNumber().toLowerCase().contains("locker")
                        ? "IN_LOCKER" : "AT_GATE")
                .build();

        Parcel saved = parcelRepository.save(parcel);
        auditService.logAction(guard, "LOG_PARCEL", "PARCEL", saved.getId(),
                "Logged parcel " + saved.getTrackingNumber() + " for " + saved.getUnitNumber());
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    @PostMapping("/parcels/{id}/collect")
    @PreAuthorize("hasAnyRole('RESIDENT', 'SECURITY', 'ADMIN')")
    public ResponseEntity<?> markParcelCollected(@PathVariable String id, @RequestBody(required = false) Map<String, String> body) {
        User actor = auditService.requireCurrentUser();
        Parcel parcel = parcelRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Parcel not found: " + id));

        if (actor.getRole() == Role.RESIDENT
                && (!actor.hasVerifiedUnit() || !parcel.getUnitNumber().equalsIgnoreCase(actor.getUnitNumber()))) {
            throw new AccessDeniedException("Residents may only collect parcels belonging to their verified unit.");
        }

        if ("COLLECTED".equalsIgnoreCase(parcel.getStatus())) {
            throw new IllegalStateException("Parcel has already been collected.");
        }

        if (body != null && body.containsKey("otp") && body.get("otp") != null && !body.get("otp").isBlank()) {
            if (!parcel.getPickupOtp().equals(body.get("otp").trim())) {
                return ResponseEntity.badRequest().body(Map.of("error", "Invalid 6-digit pickup OTP."));
            }
        }

        parcel.setStatus("COLLECTED");
        parcel.setPickedUpAt(LocalDateTime.now());
        Parcel saved = parcelRepository.save(parcel);
        auditService.logAction(actor, "COLLECT_PARCEL", "PARCEL", saved.getId(),
                "Collected parcel " + saved.getTrackingNumber() + " (" + saved.getUnitNumber() + ")");
        return ResponseEntity.ok(saved);
    }

    // ==================== INCIDENTS & SOS ====================

    @GetMapping("/incidents")
    public ResponseEntity<List<IncidentAlert>> getAllIncidents() {
        return ResponseEntity.ok(incidentAlertRepository.findAll());
    }

    @PostMapping("/incidents/sos")
    public ResponseEntity<IncidentAlert> triggerSos(@Valid @RequestBody SosRequest request) {
        User actor = auditService.requireCurrentUser();
        long count = incidentAlertRepository.count() + 10;
        int notifiedUnits = (int) unitRepository.count();
        IncidentAlert alert = IncidentAlert.builder()
                .id("inc-" + UUID.randomUUID().toString().substring(0, 8))
                .alertCode(String.format("SOS-2024-%03d", count))
                .title(request.getTitle().trim())
                .severity(request.getSeverity() != null ? request.getSeverity() : "SOS_EMERGENCY")
                .category(request.getCategory() != null ? request.getCategory() : "SECURITY")
                .tower(request.getTower() != null ? request.getTower() : (actor.getTower() != null ? actor.getTower() : "Tower B"))
                .location(request.getLocation() != null ? request.getLocation() : "Main Campus")
                .reportedBy(actor.getName() + " (" + actor.getRole().name() + ")")
                .reportedAt(LocalDateTime.now())
                .status("ACTIVE")
                .broadcastSent(true)
                .smsSentCount(notifiedUnits)
                .build();
        alert.setActionsTaken(List.of("Emergency alert logged by " + actor.getName(), "Security command desk notified"));

        IncidentAlert saved = incidentAlertRepository.save(alert);
        auditService.logAction(actor, "TRIGGER_SOS_INCIDENT", "INCIDENT_ALERT", saved.getId(),
                "Broadcast " + saved.getAlertCode() + ": " + saved.getTitle());
        auditService.notify(null, "SECURITY", "EMERGENCY ALERT: " + saved.getAlertCode(),
                saved.getTitle() + " @ " + saved.getLocation(), "INCIDENT", saved.getId());
        auditService.notify(null, "MANAGEMENT", "EMERGENCY ALERT: " + saved.getAlertCode(),
                saved.getTitle() + " @ " + saved.getLocation(), "INCIDENT", saved.getId());
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    @PostMapping("/incidents/{id}/resolve")
    @PreAuthorize("hasAnyRole('SECURITY', 'MANAGEMENT', 'ADMIN')")
    public ResponseEntity<IncidentAlert> resolveIncident(@PathVariable String id, @RequestBody(required = false) Map<String, String> body) {
        User actor = auditService.requireCurrentUser();
        IncidentAlert alert = incidentAlertRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Incident not found: " + id));

        String notes = body != null ? body.getOrDefault("notes", "Site secured and cleared by response team.")
                : "Site secured and cleared by response team.";
        alert.setStatus("RESOLVED");
        alert.setResolvedAt(LocalDateTime.now());
        alert.setResolvedBy(actor.getName());
        alert.setResolutionNotes(notes);
        List<String> actions = new ArrayList<>(alert.getActionsTaken());
        actions.add("Resolved by " + actor.getName() + ": " + notes);
        alert.setActionsTaken(actions);

        IncidentAlert saved = incidentAlertRepository.save(alert);
        auditService.logAction(actor, "RESOLVE_INCIDENT", "INCIDENT_ALERT", saved.getId(),
                "Resolved " + saved.getAlertCode() + ": " + notes);
        return ResponseEntity.ok(saved);
    }

    // ==================== PREVENTIVE MAINTENANCE ====================

    @GetMapping("/preventive-schedules")
    @PreAuthorize("hasAnyRole('MAINTENANCE', 'MANAGEMENT', 'ADMIN')")
    public ResponseEntity<List<PreventiveSchedule>> getPreventiveSchedules() {
        return ResponseEntity.ok(preventiveScheduleRepository.findAll());
    }

    @GetMapping("/preventive-schedules/logs")
    @PreAuthorize("hasAnyRole('MAINTENANCE', 'MANAGEMENT', 'ADMIN')")
    public ResponseEntity<List<PreventiveCompletionLog>> getPreventiveLogs() {
        return ResponseEntity.ok(pmLogRepository.findAllByOrderByCompletedAtDesc());
    }

    @PostMapping("/preventive-schedules")
    @PreAuthorize("hasAnyRole('MANAGEMENT', 'ADMIN')")
    public ResponseEntity<PreventiveSchedule> createSchedule(@Valid @RequestBody CreateScheduleRequest request) {
        User actor = auditService.requireCurrentUser();
        long count = preventiveScheduleRepository.count() + 10;
        String assetName = request.getAssetName();
        if (request.getAssetId() != null && !request.getAssetId().isBlank()) {
            assetName = assetRepository.findById(request.getAssetId())
                    .map(Asset::getName)
                    .orElse(request.getAssetName());
        }

        PreventiveSchedule schedule = PreventiveSchedule.builder()
                .id("ps-" + UUID.randomUUID().toString().substring(0, 8))
                .taskCode(String.format("PM-2024-%03d", count))
                .title(request.getTitle().trim())
                .assetId(request.getAssetId())
                .assetName(assetName != null ? assetName : "Community Infrastructure")
                .tower(request.getTower().trim())
                .frequency(request.getFrequency().trim().toUpperCase())
                .nextDueDate(request.getNextDueDate() != null ? request.getNextDueDate() : LocalDateTime.now().plusDays(7))
                .assignedTeam(request.getAssignedTeam().trim())
                .status("SCHEDULED")
                .createdAt(LocalDateTime.now())
                .build();

        PreventiveSchedule saved = preventiveScheduleRepository.save(schedule);
        auditService.logAction(actor, "CREATE_PM_SCHEDULE", "PREVENTIVE_SCHEDULE", saved.getId(),
                "Created " + saved.getTaskCode() + " (" + saved.getFrequency() + ")");
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    @PostMapping("/preventive-schedules/sync-overdue")
    @PreAuthorize("hasAnyRole('MAINTENANCE', 'MANAGEMENT', 'ADMIN')")
    @Transactional
    public ResponseEntity<List<PreventiveSchedule>> syncOverdueSchedules() {
        LocalDateTime now = LocalDateTime.now();
        List<PreventiveSchedule> schedules = preventiveScheduleRepository.findAll();
        for (PreventiveSchedule ps : schedules) {
            if ("SCHEDULED".equalsIgnoreCase(ps.getStatus()) && ps.getNextDueDate() != null && ps.getNextDueDate().isBefore(now)) {
                ps.setStatus("OVERDUE");
                preventiveScheduleRepository.save(ps);
            }
        }
        return ResponseEntity.ok(preventiveScheduleRepository.findAll());
    }

    @PostMapping("/preventive-schedules/{id}/generate-work-order")
    @PreAuthorize("hasAnyRole('MAINTENANCE', 'MANAGEMENT', 'ADMIN')")
    @Transactional
    public ResponseEntity<WorkOrder> generatePmWorkOrder(@PathVariable String id, @RequestBody(required = false) Map<String, String> body) {
        User actor = auditService.requireCurrentUser();
        PreventiveSchedule ps = preventiveScheduleRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Preventive schedule not found: " + id));

        String requestedTechId = body != null ? body.get("technicianId") : null;
        User tech = null;
        if (requestedTechId != null && !requestedTechId.isBlank()) {
            tech = userRepository.findById(requestedTechId).orElse(null);
        }
        if (tech == null) {
            tech = userRepository.findByRole(Role.MAINTENANCE).stream().findFirst().orElse(actor);
        }

        long woSeq = workOrderRepository.count() + 120;
        WorkOrder wo = WorkOrder.builder()
                .id("wo-" + UUID.randomUUID().toString().substring(0, 8))
                .woNumber("WO-2024-" + woSeq)
                .title("PM [" + ps.getTaskCode() + "]: " + ps.getTitle())
                .type(WorkOrder.WorkOrderType.PREVENTIVE)
                .status(WorkOrder.WorkOrderStatus.SCHEDULED)
                .priority("OVERDUE".equalsIgnoreCase(ps.getStatus()) ? WorkOrder.Priority.URGENT : WorkOrder.Priority.MEDIUM)
                .assetId(ps.getAssetId())
                .assetName(ps.getAssetName())
                .tower(ps.getTower())
                .location(ps.getTower() + " — " + ps.getAssetName())
                .technicianId(tech.getId())
                .technicianName(tech.getName())
                .dueDate(ps.getNextDueDate())
                .estimatedHours(new BigDecimal("2.00"))
                .createdAt(LocalDateTime.now())
                .build();
        wo.setChecklists(List.of(
                new WorkOrder.ChecklistItem("Perform " + ps.getFrequency().toLowerCase() + " preventive inspection", false),
                new WorkOrder.ChecklistItem("Lubricate, tighten & test operational safety thresholds", false),
                new WorkOrder.ChecklistItem("Update PM log & verify readings", false)
        ));
        wo.setSparesAllocated(List.of());

        WorkOrder savedWo = workOrderRepository.save(wo);
        ps.setStatus("IN_PROGRESS");
        preventiveScheduleRepository.save(ps);

        auditService.notify(tech.getId(), "MAINTENANCE", "PM Work Order Generated: " + savedWo.getWoNumber(),
                ps.getTitle() + " (" + ps.getAssetName() + ")", "WORK_ORDER", savedWo.getId());
        auditService.logAction(actor, "GENERATE_PM_WORK_ORDER", "WORK_ORDER", savedWo.getId(),
                "Generated " + savedWo.getWoNumber() + " from " + ps.getTaskCode());
        return ResponseEntity.status(HttpStatus.CREATED).body(savedWo);
    }

    @PostMapping("/preventive-schedules/{id}/complete")
    @PreAuthorize("hasAnyRole('MAINTENANCE', 'MANAGEMENT', 'ADMIN')")
    @Transactional
    public ResponseEntity<?> completeScheduleCycle(@PathVariable String id, @RequestBody(required = false) Map<String, String> body) {
        User actor = auditService.requireCurrentUser();
        PreventiveSchedule ps = preventiveScheduleRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Preventive schedule not found: " + id));

        String notes = body != null ? body.getOrDefault("notes", "Routine preventive service completed and verified.")
                : "Routine preventive service completed and verified.";
        String workOrderId = body != null ? body.get("workOrderId") : null;

        PreventiveCompletionLog log = PreventiveCompletionLog.builder()
                .id("pmlog-" + UUID.randomUUID().toString().substring(0, 8))
                .scheduleId(ps.getId())
                .workOrderId(workOrderId)
                .completedBy(actor.getName())
                .notes(notes)
                .completedAt(LocalDateTime.now())
                .build();
        pmLogRepository.save(log);

        LocalDateTime baseDate = LocalDateTime.now();
        LocalDateTime nextDue = switch (ps.getFrequency().toUpperCase()) {
            case "WEEKLY" -> baseDate.plusWeeks(1);
            case "QUARTERLY" -> baseDate.plusMonths(3);
            case "ANNUAL" -> baseDate.plusYears(1);
            default -> baseDate.plusMonths(1);
        };
        ps.setNextDueDate(nextDue);
        ps.setStatus("SCHEDULED");
        PreventiveSchedule saved = preventiveScheduleRepository.save(ps);

        if (ps.getAssetId() != null) {
            assetRepository.findById(ps.getAssetId()).ifPresent(asset -> {
                asset.setLastServicedDate(baseDate.toLocalDate());
                asset.setNextScheduledPm(nextDue.toLocalDate());
                asset.setHealthScore(Math.min(100, asset.getHealthScore() + 4));
                assetRepository.save(asset);
            });
        }

        auditService.logAction(actor, "COMPLETE_PM_CYCLE", "PREVENTIVE_SCHEDULE", saved.getId(),
                "Completed " + saved.getTaskCode() + "; next due " + nextDue.toLocalDate());
        return ResponseEntity.ok(Map.of("schedule", saved, "completionLog", log));
    }

    @Data
    public static class CreateUnitRequest {
        @NotBlank(message = "Unit number is required")
        private String unitNumber;
        @NotBlank(message = "Tower is required")
        private String tower;
        private int floor;
        @NotBlank(message = "Unit type is required")
        private String type;
        @NotBlank(message = "Owner name is required")
        private String ownerName;
        @NotBlank(message = "Owner phone is required")
        private String ownerPhone;
        private Boolean isTenantOccupied;
        private String tenantName;
        private String tenantPhone;
        private String occupancyStatus;
        private BigDecimal duesAmount;
        private List<String> registeredVehicles;
    }

    @Data
    public static class CreateParcelRequest {
        private String trackingNumber;
        @NotBlank(message = "Carrier is required")
        private String carrier;
        @NotBlank(message = "Recipient name is required")
        private String recipientName;
        @NotBlank(message = "Tower is required")
        private String tower;
        @NotBlank(message = "Unit number is required")
        private String unitNumber;
        @NotBlank(message = "Delivery agent name is required")
        private String deliveryAgentName;
        private String deliveryAgentPhone;
        private String lockerNumber;
    }

    @Data
    public static class SosRequest {
        @NotBlank(message = "Incident title is required")
        private String title;
        private String severity;
        private String category;
        private String tower;
        private String location;
        private String reportedBy;
    }

    @Data
    public static class CreateScheduleRequest {
        @NotBlank(message = "Schedule title is required")
        private String title;
        private String assetId;
        private String assetName;
        @NotBlank(message = "Tower is required")
        private String tower;
        @NotBlank(message = "Frequency is required")
        private String frequency;
        private LocalDateTime nextDueDate;
        @NotBlank(message = "Assigned team is required")
        private String assignedTeam;
    }
}
