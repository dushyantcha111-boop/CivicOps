package com.civicops.community.controller;

import com.civicops.community.model.Role;
import com.civicops.community.model.User;
import com.civicops.community.model.VisitorPass;
import com.civicops.community.repository.VisitorPassRepository;
import com.civicops.community.service.AuditService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.UUID;

@RestController
@RequestMapping("/visitors")
@RequiredArgsConstructor
public class VisitorController {

    private final VisitorPassRepository visitorPassRepository;
    private final AuditService auditService;
    private final SecureRandom secureRandom = new SecureRandom();

    @GetMapping
    public ResponseEntity<List<VisitorPass>> getAllVisitorPasses() {
        User currentUser = auditService.requireCurrentUser();
        if (currentUser.getRole() == Role.RESIDENT && currentUser.getUnitNumber() != null) {
            return ResponseEntity.ok(visitorPassRepository.findByUnitNumber(currentUser.getUnitNumber()));
        }
        return ResponseEntity.ok(visitorPassRepository.findAll());
    }

    @PostMapping("/pre-approve")
    @PreAuthorize("hasAnyRole('RESIDENT', 'MANAGEMENT', 'ADMIN')")
    public ResponseEntity<VisitorPass> preApproveVisitor(@Valid @RequestBody PreApproveRequest request) {
        User currentUser = auditService.requireCurrentUser();
        String passSeq = String.format("%04d", secureRandom.nextInt(9000) + 1000);
        String pin = String.format("%06d", secureRandom.nextInt(900000) + 100000);
        LocalDateTime now = LocalDateTime.now();
        int validHours = request.getValidHours() > 0 ? Math.min(request.getValidHours(), 168) : 8;

        String tower = (currentUser.getRole() == Role.RESIDENT && currentUser.getTower() != null)
                ? currentUser.getTower()
                : (request.getTower() != null ? request.getTower() : "Tower A");
        String unitNumber = (currentUser.getRole() == Role.RESIDENT && currentUser.getUnitNumber() != null)
                ? currentUser.getUnitNumber()
                : (request.getUnitNumber() != null ? request.getUnitNumber() : "101");
        String residentName = currentUser.getRole() == Role.RESIDENT
                ? currentUser.getName()
                : (request.getResidentName() != null && !request.getResidentName().isBlank()
                ? request.getResidentName() : currentUser.getName());

        VisitorPass pass = VisitorPass.builder()
                .id("vp-" + UUID.randomUUID().toString().substring(0, 8))
                .passCode("GV-" + passSeq)
                .sixDigitPin(pin)
                .visitorName(request.getVisitorName().trim())
                .visitorPhone(request.getVisitorPhone().trim())
                .visitorType(request.getVisitorType() != null ? request.getVisitorType() : "GUEST")
                .vehicleNumber(request.getVehicleNumber())
                .tower(tower)
                .unitNumber(unitNumber)
                .residentName(residentName)
                .entryGate("Gate 1 (Main Entrance)")
                .validFrom(now)
                .validUntil(now.plusHours(validHours))
                .status("PRE_APPROVED")
                .overstayMinutes(0)
                .createdAt(now)
                .build();

        VisitorPass saved = visitorPassRepository.save(pass);
        auditService.logAction(currentUser, "PRE_APPROVE_VISITOR", "VISITOR_PASS", saved.getId(),
                "Generated visitor pass " + saved.getPassCode() + " for " + saved.getVisitorName() + " (" + saved.getUnitNumber() + ")");
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    @PostMapping("/verify")
    @PreAuthorize("hasAnyRole('SECURITY', 'ADMIN')")
    public ResponseEntity<?> verifyAndCheckIn(@Valid @RequestBody VerifyRequest request) {
        User guard = auditService.requireCurrentUser();
        String code = request.getCodeOrPin().trim();
        VisitorPass pass = visitorPassRepository.findBySixDigitPin(code)
                .or(() -> visitorPassRepository.findByPassCode(code.toUpperCase()))
                .orElse(null);

        if (pass == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", "Pass not found or invalid PIN/Code."));
        }

        if ("REVOKED".equalsIgnoreCase(pass.getStatus())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Access Denied: This pass was revoked (" + pass.getRevocationReason() + ")"));
        }

        if ("EXITED".equalsIgnoreCase(pass.getStatus())) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(Map.of("error", "Pass already used and checked out at " + pass.getCheckOutTime()));
        }

        if ("ENTERED".equalsIgnoreCase(pass.getStatus())) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(Map.of("error", "Visitor is already checked inside the premises since " + pass.getCheckInTime()));
        }

        if (LocalDateTime.now().isAfter(pass.getValidUntil())) {
            pass.setStatus("EXPIRED");
            visitorPassRepository.save(pass);
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Access Denied: Pass expired at " + pass.getValidUntil()));
        }

        pass.setStatus("ENTERED");
        pass.setCheckInTime(LocalDateTime.now());
        VisitorPass saved = visitorPassRepository.save(pass);
        auditService.logAction(guard, "VISITOR_CHECK_IN", "VISITOR_PASS", saved.getId(),
                "Verified & checked in " + saved.getVisitorName() + " (" + saved.getPassCode() + ")");
        return ResponseEntity.ok(saved);
    }

    @PostMapping("/{id}/revoke")
    @PreAuthorize("hasAnyRole('RESIDENT', 'SECURITY', 'MANAGEMENT', 'ADMIN')")
    public ResponseEntity<?> revokePass(@PathVariable String id, @RequestBody(required = false) Map<String, String> body) {
        User currentUser = auditService.requireCurrentUser();
        VisitorPass pass = visitorPassRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Pass not found: " + id));

        if (currentUser.getRole() == Role.RESIDENT
                && currentUser.getUnitNumber() != null
                && !pass.getUnitNumber().equalsIgnoreCase(currentUser.getUnitNumber())) {
            throw new AccessDeniedException("Residents may only revoke visitor passes for their own unit.");
        }

        if ("EXITED".equalsIgnoreCase(pass.getStatus())) {
            throw new IllegalStateException("Cannot revoke a pass after the visitor has already exited.");
        }

        String reason = body != null ? body.getOrDefault("reason", "Revoked by resident or security protocol")
                : "Revoked by " + currentUser.getRole().name();
        pass.setStatus("REVOKED");
        pass.setRevocationReason(reason);
        VisitorPass saved = visitorPassRepository.save(pass);
        auditService.logAction(currentUser, "REVOKE_VISITOR_PASS", "VISITOR_PASS", saved.getId(),
                "Revoked " + saved.getPassCode() + ": " + reason);
        return ResponseEntity.ok(saved);
    }

    @PostMapping("/{id}/check-out")
    @PreAuthorize("hasAnyRole('SECURITY', 'MANAGEMENT', 'ADMIN')")
    public ResponseEntity<?> checkOutPass(@PathVariable String id) {
        User actor = auditService.requireCurrentUser();
        VisitorPass pass = visitorPassRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Pass not found: " + id));

        if (!"ENTERED".equalsIgnoreCase(pass.getStatus())) {
            throw new IllegalStateException("Only currently ENTERED visitors can be checked out. Current status: " + pass.getStatus());
        }

        LocalDateTime now = LocalDateTime.now();
        int overstayMinutes = 0;
        if (pass.getValidUntil() != null && now.isAfter(pass.getValidUntil())) {
            overstayMinutes = (int) ChronoUnit.MINUTES.between(pass.getValidUntil(), now);
        }

        pass.setStatus("EXITED");
        pass.setCheckOutTime(now);
        pass.setOverstayMinutes(overstayMinutes);
        VisitorPass saved = visitorPassRepository.save(pass);

        auditService.logAction(actor, "VISITOR_CHECK_OUT", "VISITOR_PASS", saved.getId(),
                "Checked out " + saved.getVisitorName() + " (Overstay: " + overstayMinutes + " min)");
        return ResponseEntity.ok(saved);
    }

    @PostMapping("/walk-in")
    @PreAuthorize("hasAnyRole('SECURITY', 'ADMIN')")
    public ResponseEntity<VisitorPass> checkInWalkIn(@Valid @RequestBody WalkInRequest request) {
        User guard = auditService.requireCurrentUser();
        String passSeq = String.format("%04d", secureRandom.nextInt(9000) + 1000);
        String pin = String.format("%06d", secureRandom.nextInt(900000) + 100000);
        LocalDateTime now = LocalDateTime.now();

        VisitorPass pass = VisitorPass.builder()
                .id("vp-" + UUID.randomUUID().toString().substring(0, 8))
                .passCode("GV-" + passSeq)
                .sixDigitPin(pin)
                .visitorName(request.getName().trim() + " (" + request.getPurpose().trim() + ")")
                .visitorPhone(request.getPhone().trim())
                .visitorType("SERVICE")
                .vehicleNumber(request.getVehicleNumber())
                .tower(request.getTower())
                .unitNumber(request.getUnitNumber())
                .residentName("Security Verified Walk-In")
                .entryGate("Gate 1 (Main Entrance)")
                .validFrom(now)
                .validUntil(now.plusHours(4))
                .status("ENTERED")
                .checkInTime(now)
                .overstayMinutes(0)
                .createdAt(now)
                .build();

        VisitorPass saved = visitorPassRepository.save(pass);
        auditService.logAction(guard, "WALK_IN_CHECK_IN", "VISITOR_PASS", saved.getId(),
                "Logged walk-in visitor " + saved.getVisitorName() + " for unit " + saved.getUnitNumber());
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    @Data
    public static class PreApproveRequest {
        @NotBlank(message = "Visitor name is required")
        private String visitorName;
        @NotBlank(message = "Visitor phone is required")
        private String visitorPhone;
        private String visitorType;
        private String vehicleNumber;
        private String tower;
        private String unitNumber;
        private String residentName;
        private int validHours;
    }

    @Data
    public static class VerifyRequest {
        @NotBlank(message = "Pass code or 6-digit PIN is required")
        private String codeOrPin;
    }

    @Data
    public static class WalkInRequest {
        @NotBlank(message = "Visitor name is required")
        private String name;
        @NotBlank(message = "Visitor phone is required")
        private String phone;
        @NotBlank(message = "Purpose of visit is required")
        private String purpose;
        @NotBlank(message = "Tower is required")
        private String tower;
        @NotBlank(message = "Unit number is required")
        private String unitNumber;
        private String vehicleNumber;
    }
}
