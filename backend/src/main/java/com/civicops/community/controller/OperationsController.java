package com.civicops.community.controller;

import com.civicops.community.model.IncidentAlert;
import com.civicops.community.model.Parcel;
import com.civicops.community.model.PreventiveSchedule;
import com.civicops.community.model.Unit;
import com.civicops.community.repository.IncidentAlertRepository;
import com.civicops.community.repository.ParcelRepository;
import com.civicops.community.repository.PreventiveScheduleRepository;
import com.civicops.community.repository.UnitRepository;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class OperationsController {

    private final UnitRepository unitRepository;
    private final ParcelRepository parcelRepository;
    private final IncidentAlertRepository incidentAlertRepository;
    private final PreventiveScheduleRepository preventiveScheduleRepository;

    @GetMapping("/units")
    public ResponseEntity<List<Unit>> getAllUnits() {
        return ResponseEntity.ok(unitRepository.findAll());
    }

    @GetMapping("/parcels")
    public ResponseEntity<List<Parcel>> getAllParcels() {
        return ResponseEntity.ok(parcelRepository.findAll());
    }

    @PostMapping("/parcels/{id}/collect")
    public ResponseEntity<?> markParcelCollected(@PathVariable String id) {
        Parcel parcel = parcelRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Parcel not found: " + id));

        parcel.setStatus("COLLECTED");
        parcel.setPickedUpAt(LocalDateTime.now());
        return ResponseEntity.ok(parcelRepository.save(parcel));
    }

    @GetMapping("/incidents")
    public ResponseEntity<List<IncidentAlert>> getAllIncidents() {
        return ResponseEntity.ok(incidentAlertRepository.findAll());
    }

    @PostMapping("/incidents/sos")
    public ResponseEntity<IncidentAlert> triggerSos(@RequestBody SosRequest request) {
        long count = incidentAlertRepository.count() + 10;
        IncidentAlert alert = IncidentAlert.builder()
                .id("inc-" + UUID.randomUUID().toString().substring(0, 8))
                .alertCode(String.format("SOS-2024-%03d", count))
                .title(request.getTitle())
                .severity("SOS_EMERGENCY")
                .category(request.getCategory() != null ? request.getCategory() : "SECURITY")
                .tower(request.getTower() != null ? request.getTower() : "Tower B")
                .location(request.getLocation() != null ? request.getLocation() : "Tower B Lobby")
                .reportedBy(request.getReportedBy())
                .reportedAt(LocalDateTime.now())
                .status("ACTIVE")
                .broadcastSent(true)
                .smsSentCount(480)
                .build();

        return ResponseEntity.status(HttpStatus.CREATED).body(incidentAlertRepository.save(alert));
    }

    @GetMapping("/preventive-schedules")
    public ResponseEntity<List<PreventiveSchedule>> getPreventiveSchedules() {
        return ResponseEntity.ok(preventiveScheduleRepository.findAll());
    }

    @Data
    public static class SosRequest {
        private String title;
        private String category;
        private String tower;
        private String location;
        private String reportedBy;
    }
}
