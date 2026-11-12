package com.civicops.community.controller;

import com.civicops.community.model.VisitorPass;
import com.civicops.community.repository.VisitorPassRepository;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.UUID;

@RestController
@RequestMapping("/visitors")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class VisitorController {

    private final VisitorPassRepository visitorPassRepository;
    private final Random random = new Random();

    @GetMapping
    public ResponseEntity<List<VisitorPass>> getAllVisitorPasses() {
        return ResponseEntity.ok(visitorPassRepository.findAll());
    }

    @PostMapping("/pre-approve")
    public ResponseEntity<VisitorPass> preApproveVisitor(@RequestBody PreApproveRequest request) {
        String passSeq = String.format("%04d", random.nextInt(9000) + 1000);
        String pin = String.format("%06d", random.nextInt(900000) + 100000);
        LocalDateTime now = LocalDateTime.now();
        int validHours = request.getValidHours() > 0 ? request.getValidHours() : 8;

        VisitorPass pass = VisitorPass.builder()
                .id("vp-" + UUID.randomUUID().toString().substring(0, 8))
                .passCode("GV-" + passSeq)
                .sixDigitPin(pin)
                .visitorName(request.getVisitorName())
                .visitorPhone(request.getVisitorPhone())
                .visitorType(request.getVisitorType() != null ? request.getVisitorType() : "GUEST")
                .vehicleNumber(request.getVehicleNumber())
                .tower(request.getTower())
                .unitNumber(request.getUnitNumber())
                .residentName(request.getResidentName())
                .entryGate("Gate 1 (Main Entrance)")
                .validFrom(now)
                .validUntil(now.plusHours(validHours))
                .status("PRE_APPROVED")
                .createdAt(now)
                .build();

        return ResponseEntity.status(HttpStatus.CREATED).body(visitorPassRepository.save(pass));
    }

    @PostMapping("/verify")
    public ResponseEntity<?> verifyAndCheckIn(@RequestBody VerifyRequest request) {
        String code = request.getCodeOrPin().trim();
        VisitorPass pass = visitorPassRepository.findBySixDigitPin(code)
                .or(() -> visitorPassRepository.findByPassCode(code.toUpperCase()))
                .orElse(null);

        if (pass == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", "Pass not found or invalid PIN/Code"));
        }

        if ("REVOKED".equalsIgnoreCase(pass.getStatus())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Access Denied: This pass was revoked by resident/management (" + pass.getRevocationReason() + ")"));
        }

        if (LocalDateTime.now().isAfter(pass.getValidUntil())) {
            pass.setStatus("EXPIRED");
            visitorPassRepository.save(pass);
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Access Denied: Pass expired at " + pass.getValidUntil()));
        }

        pass.setStatus("ENTERED");
        pass.setCheckInTime(LocalDateTime.now());
        return ResponseEntity.ok(visitorPassRepository.save(pass));
    }

    @PostMapping("/{id}/revoke")
    public ResponseEntity<?> revokePass(@PathVariable String id, @RequestBody Map<String, String> body) {
        VisitorPass pass = visitorPassRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Pass not found: " + id));

        pass.setStatus("REVOKED");
        pass.setRevocationReason(body.getOrDefault("reason", "Revoked by resident or security protocol"));
        return ResponseEntity.ok(visitorPassRepository.save(pass));
    }

    @PostMapping("/{id}/check-out")
    public ResponseEntity<?> checkOutPass(@PathVariable String id) {
        VisitorPass pass = visitorPassRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Pass not found: " + id));

        pass.setStatus("EXITED");
        pass.setCheckOutTime(LocalDateTime.now());
        return ResponseEntity.ok(visitorPassRepository.save(pass));
    }

    @PostMapping("/walk-in")
    public ResponseEntity<VisitorPass> checkInWalkIn(@RequestBody WalkInRequest request) {
        String passSeq = String.format("%04d", random.nextInt(9000) + 1000);
        String pin = String.format("%06d", random.nextInt(900000) + 100000);
        LocalDateTime now = LocalDateTime.now();

        VisitorPass pass = VisitorPass.builder()
                .id("vp-" + UUID.randomUUID().toString().substring(0, 8))
                .passCode("GV-" + passSeq)
                .sixDigitPin(pin)
                .visitorName(request.getName() + " (" + request.getPurpose() + ")")
                .visitorPhone(request.getPhone())
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
                .createdAt(now)
                .build();

        return ResponseEntity.status(HttpStatus.CREATED).body(visitorPassRepository.save(pass));
    }

    @Data
    public static class PreApproveRequest {
        private String visitorName;
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
        private String codeOrPin;
    }

    @Data
    public static class WalkInRequest {
        private String name;
        private String phone;
        private String purpose;
        private String tower;
        private String unitNumber;
        private String vehicleNumber;
    }
}
