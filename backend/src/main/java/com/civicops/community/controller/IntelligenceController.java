package com.civicops.community.controller;

import com.civicops.community.model.*;
import com.civicops.community.repository.*;
import com.civicops.community.service.AuditService;
import com.civicops.community.service.MemoryGraphService;
import lombok.Builder;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/analytics")
@RequiredArgsConstructor
public class IntelligenceController {

    private final ComplaintRepository complaintRepository;
    private final AssetRepository assetRepository;
    private final WorkOrderRepository workOrderRepository;
    private final PreventiveScheduleRepository preventiveScheduleRepository;
    private final RecurrenceInvestigationRepository investigationRepository;
    private final UnitRepository unitRepository;
    private final UserRepository userRepository;
    private final AuditService auditService;
    private final MemoryGraphService memoryGraphService;

    @GetMapping("/memory-graph")
    @PreAuthorize("hasAnyRole('RESIDENT', 'MANAGEMENT', 'MAINTENANCE', 'ADMIN')")
    public ResponseEntity<MemoryGraphService.MemoryGraphResponse> getMemoryGraph(
            @RequestParam(required = false) String tower,
            @RequestParam(required = false) String nodeType,
            @RequestParam(required = false) String relationship,
            @RequestParam(required = false) String q
    ) {
        User actor = auditService.requireCurrentUser();
        return ResponseEntity.ok(memoryGraphService.buildGraph(actor, tower, nodeType, relationship, q));
    }

    @GetMapping("/memory-graph/nodes/{nodeId}")
    @PreAuthorize("hasAnyRole('RESIDENT', 'MANAGEMENT', 'MAINTENANCE', 'ADMIN')")
    public ResponseEntity<MemoryGraphService.MemoryGraphNodeDetailResponse> getMemoryGraphNode(
            @PathVariable String nodeId
    ) {
        User actor = auditService.requireCurrentUser();
        return ResponseEntity.ok(memoryGraphService.getNodeDetails(actor, nodeId));
    }

    @GetMapping("/memory-graph/nodes/{nodeId}/expand")
    @PreAuthorize("hasAnyRole('RESIDENT', 'MANAGEMENT', 'MAINTENANCE', 'ADMIN')")
    public ResponseEntity<MemoryGraphService.MemoryGraphExpandResponse> expandMemoryGraphNode(
            @PathVariable String nodeId
    ) {
        User actor = auditService.requireCurrentUser();
        return ResponseEntity.ok(memoryGraphService.expandNode(actor, nodeId));
    }

    @GetMapping("/memory-graph/search")
    @PreAuthorize("hasAnyRole('RESIDENT', 'MANAGEMENT', 'MAINTENANCE', 'ADMIN')")
    public ResponseEntity<MemoryGraphService.MemoryGraphResponse> searchMemoryGraph(
            @RequestParam(defaultValue = "") String q
    ) {
        User actor = auditService.requireCurrentUser();
        return ResponseEntity.ok(memoryGraphService.searchNodes(actor, q));
    }

    @GetMapping("/memory-graph/path")
    @PreAuthorize("hasAnyRole('RESIDENT', 'MANAGEMENT', 'MAINTENANCE', 'ADMIN')")
    public ResponseEntity<MemoryGraphService.MemoryGraphPathResponse> findMemoryGraphPath(
            @RequestParam String from,
            @RequestParam String to
    ) {
        User actor = auditService.requireCurrentUser();
        return ResponseEntity.ok(memoryGraphService.findShortestPath(actor, from, to));
    }

    @PutMapping("/memory-graph/layout")
    @PreAuthorize("hasAnyRole('MANAGEMENT', 'MAINTENANCE', 'ADMIN')")
    public ResponseEntity<Map<String, Object>> saveMemoryGraphLayout(
            @RequestBody List<MemoryGraphService.NodeLayoutInput> positions
    ) {
        User actor = auditService.requireCurrentUser();
        List<MemoryGraphNodeState> saved = memoryGraphService.saveLayout(actor, positions);
        auditService.logAction(actor, "SAVE_GRAPH_LAYOUT", "MEMORY_GRAPH", "layout",
                "Persisted " + saved.size() + " pinned graph node coordinates");
        return ResponseEntity.ok(Map.of("savedCount", saved.size(), "nodes", saved));
    }

    @DeleteMapping("/memory-graph/layout")
    @PreAuthorize("hasAnyRole('MANAGEMENT', 'MAINTENANCE', 'ADMIN')")
    public ResponseEntity<Map<String, String>> resetMemoryGraphLayout() {
        User actor = auditService.requireCurrentUser();
        memoryGraphService.resetLayout();
        auditService.logAction(actor, "RESET_GRAPH_LAYOUT", "MEMORY_GRAPH", "layout",
                "Reset persisted Memory Graph node positions to automatic hierarchy");
        return ResponseEntity.ok(Map.of("message", "Graph layout positions reset."));
    }

    @GetMapping("/reliability-radar")
    @PreAuthorize("hasAnyRole('MANAGEMENT', 'MAINTENANCE', 'ADMIN')")
    public ResponseEntity<ReliabilityRadarResponse> getReliabilityRadar() {
        List<Complaint> complaints = complaintRepository.findAll();
        List<Asset> assets = assetRepository.findAll();
        List<WorkOrder> workOrders = workOrderRepository.findAll();
        List<PreventiveSchedule> schedules = preventiveScheduleRepository.findAll();
        List<Unit> units = unitRepository.findAll();

        long totalComplaints = complaints.size();
        long breached = complaints.stream().filter(c -> Boolean.TRUE.equals(c.getSlaBreached())).count();
        double slaAdherence = totalComplaints > 0 ? ((double) (totalComplaints - breached) / totalComplaints) * 100.0 : 100.0;

        double avgHealth = assets.stream().mapToInt(Asset::getHealthScore).average().orElse(100.0);

        long totalPm = schedules.size();
        long overduePm = schedules.stream()
                .filter(s -> "OVERDUE".equalsIgnoreCase(s.getStatus())
                        || ("SCHEDULED".equalsIgnoreCase(s.getStatus()) && s.getNextDueDate() != null && s.getNextDueDate().isBefore(LocalDateTime.now())))
                .count();
        double pmCompliance = totalPm > 0 ? ((double) (totalPm - overduePm) / totalPm) * 100.0 : 100.0;

        long totalWos = workOrders.size();
        long completedWos = workOrders.stream().filter(w -> w.getStatus() == WorkOrder.WorkOrderStatus.COMPLETED).count();
        double woCompletion = totalWos > 0 ? ((double) completedWos / totalWos) * 100.0 : 100.0;

        long recurringCount = complaints.stream().filter(c -> c.getRecurringCount() != null && c.getRecurringCount() > 1).count();
        double recurrenceStability = totalComplaints > 0 ? Math.max(0.0, 100.0 - (((double) recurringCount / totalComplaints) * 35.0)) : 100.0;

        double overall = round1(0.30 * slaAdherence + 0.30 * avgHealth + 0.20 * pmCompliance + 0.20 * recurrenceStability);

        // Compute dynamic per-tower reliability scores purely from DB records
        Set<String> allTowers = new TreeSet<>();
        units.forEach(u -> allTowers.add(u.getTower()));
        assets.forEach(a -> allTowers.add(a.getTower()));
        complaints.forEach(c -> allTowers.add(c.getTower()));
        if (allTowers.isEmpty()) {
            allTowers.addAll(List.of("Tower A", "Tower B", "Tower C", "Tower D"));
        }

        Map<String, Double> towerScores = new LinkedHashMap<>();
        for (String tower : allTowers) {
            List<Asset> tAssets = assets.stream().filter(a -> tower.equalsIgnoreCase(a.getTower())).collect(Collectors.toList());
            List<Complaint> tComplaints = complaints.stream().filter(c -> tower.equalsIgnoreCase(c.getTower())).collect(Collectors.toList());
            long tOpen = tComplaints.stream()
                    .filter(c -> c.getStatus() != Complaint.ComplaintStatus.CLOSED && c.getStatus() != Complaint.ComplaintStatus.RESIDENT_CONFIRMED)
                    .count();
            long tBreached = tComplaints.stream().filter(c -> Boolean.TRUE.equals(c.getSlaBreached())).count();
            double tAssetAvg = tAssets.stream().mapToInt(Asset::getHealthScore).average().orElse(avgHealth);
            double tSla = tComplaints.isEmpty() ? 100.0 : ((double) (tComplaints.size() - tBreached) / tComplaints.size()) * 100.0;
            double openPenalty = Math.min(20.0, tOpen * 3.5);
            double score = Math.max(0.0, Math.min(100.0, (0.55 * tAssetAvg + 0.45 * tSla) - openPenalty));
            towerScores.put(tower, round1(score));
        }

        // 6 subsystem radar axes derived from Asset categories + Complaint backlog
        List<String> axesCategories = List.of("ELEVATOR", "ELECTRICAL", "PLUMBING", "HVAC", "FIRE_SAFETY", "SECURITY");
        List<RadarAxis> radarAxes = new ArrayList<>();
        for (String cat : axesCategories) {
            List<Asset> catAssets = assets.stream().filter(a -> cat.equalsIgnoreCase(a.getCategory())).collect(Collectors.toList());
            double catHealth = catAssets.stream().mapToInt(Asset::getHealthScore).average().orElse(avgHealth);
            long catOpenComplaints = complaints.stream()
                    .filter(c -> cat.equalsIgnoreCase(c.getCategory().name()))
                    .filter(c -> c.getStatus() != Complaint.ComplaintStatus.CLOSED && c.getStatus() != Complaint.ComplaintStatus.RESIDENT_CONFIRMED)
                    .count();
            double computed = round1(Math.max(0.0, Math.min(100.0, catHealth - (catOpenComplaints * 4.0))));
            radarAxes.add(RadarAxis.builder()
                    .axis(cat)
                    .score(computed)
                    .assetCount(catAssets.size())
                    .openComplaints(catOpenComplaints)
                    .build());
        }

        return ResponseEntity.ok(ReliabilityRadarResponse.builder()
                .overallReliabilityScore(overall)
                .slaCompliancePercentage(round1(slaAdherence))
                .averageAssetHealthScore(round1(avgHealth))
                .pmCompliancePercentage(round1(pmCompliance))
                .workOrderCompletionPercentage(round1(woCompletion))
                .recurrenceStabilityPercentage(round1(recurrenceStability))
                .towerScores(towerScores)
                .radarAxes(radarAxes)
                .evidenceCounts(Map.of(
                        "totalComplaints", totalComplaints,
                        "breachedComplaints", breached,
                        "totalAssets", assets.size(),
                        "overduePmCount", overduePm,
                        "totalPmCount", totalPm,
                        "completedWorkOrders", completedWos,
                        "totalWorkOrders", totalWos
                ))
                .methodology("Composite = 30% SLA Adherence + 30% Mean Asset Health + 20% PM Schedule Compliance + 20% Recurrence Stability")
                .sourceOfTruth("Live PostgreSQL Complaints, Assets, WorkOrders & PreventiveSchedules")
                .lastCalculatedAt(LocalDateTime.now())
                .build());
    }

    @GetMapping("/recurrence-queue")
    @PreAuthorize("hasAnyRole('MANAGEMENT', 'MAINTENANCE', 'ADMIN')")
    public ResponseEntity<List<RecurrenceClusterResponse>> getRecurrenceQueue(
            @RequestParam(defaultValue = "30") int windowDays
    ) {
        int clampedWindow = Math.max(1, Math.min(windowDays, 365));
        LocalDateTime since = LocalDateTime.now().minusDays(clampedWindow);
        List<Complaint> windowedComplaints = complaintRepository.findSubmittedSince(since);
        List<RecurrenceInvestigation> storedInvestigations = investigationRepository.findAll();
        List<Asset> assets = assetRepository.findAll();

        Map<String, List<Complaint>> grouped = windowedComplaints.stream()
                .collect(Collectors.groupingBy(c -> c.getTower() + "::" + c.getCategory().name()));

        List<RecurrenceClusterResponse> results = new ArrayList<>();
        Set<String> coveredKeys = new HashSet<>();

        for (RecurrenceInvestigation inv : storedInvestigations) {
            String key = inv.getTower() + "::" + inv.getCategory();
            coveredKeys.add(key);
            List<Complaint> matches = grouped.getOrDefault(key, List.of());
            int count = Math.max(inv.getIncidentCount(), matches.size());
            Asset linkedAsset = inv.getAssetId() != null
                    ? assets.stream().filter(a -> a.getId().equals(inv.getAssetId())).findFirst().orElse(null)
                    : null;

            results.add(RecurrenceClusterResponse.builder()
                    .id(inv.getId())
                    .clusterCode(inv.getClusterCode())
                    .title(inv.getTitle())
                    .tower(inv.getTower())
                    .category(inv.getCategory())
                    .assetId(inv.getAssetId())
                    .assetName(linkedAsset != null ? linkedAsset.getName() : null)
                    .severity(inv.getSeverity())
                    .incidentCount(count)
                    .timeWindowDays(clampedWindow)
                    .status(inv.getStatus())
                    .rootCause(inv.getRootCause())
                    .suggestedFix(inv.getSuggestedFix())
                    .capexEstimate(inv.getCapexEstimate())
                    .investigationNotes(inv.getInvestigationNotes())
                    .followUpAction(inv.getFollowUpAction())
                    .investigatedBy(inv.getInvestigatedBy())
                    .updatedAt(inv.getUpdatedAt())
                    .relatedComplaints(matches.stream().map(this::toComplaintRef).collect(Collectors.toList()))
                    .build());
        }

        // Add any newly detected repeat complaint clusters (>= 2 tickets in tower+category within windowDays)
        for (Map.Entry<String, List<Complaint>> entry : grouped.entrySet()) {
            if (coveredKeys.contains(entry.getKey()) || entry.getValue().size() < 2) {
                continue;
            }
            List<Complaint> group = entry.getValue();
            Complaint sample = group.get(0);
            Asset matchedAsset = assets.stream()
                    .filter(a -> a.getTower().equalsIgnoreCase(sample.getTower())
                            && a.getCategory().equalsIgnoreCase(sample.getCategory().name()))
                    .findFirst().orElse(null);

            String slug = ("inv-" + sample.getTower() + "-" + sample.getCategory())
                    .toLowerCase().replaceAll("[^a-z0-9]+", "-");
            RecurrenceInvestigation created = investigationRepository.save(RecurrenceInvestigation.builder()
                    .id(slug)
                    .clusterCode("CLUSTER-" + sample.getCategory().name().substring(0, Math.min(3, sample.getCategory().name().length())) + "-" + group.size())
                    .title(sample.getTower() + " Recurring " + sample.getCategory().name() + " Incidents")
                    .tower(sample.getTower())
                    .category(sample.getCategory().name())
                    .assetId(matchedAsset != null ? matchedAsset.getId() : sample.getAssetId())
                    .severity(group.size() >= 3 ? "HIGH_RECURRENCE" : "MODERATE_RECURRENCE")
                    .incidentCount(group.size())
                    .timeWindowDays(clampedWindow)
                    .status("PENDING_DIRECTIVE")
                    .rootCause("Auto-detected " + group.size() + " complaints in " + clampedWindow + "-day window.")
                    .suggestedFix("Inspect underlying asset or riser in " + sample.getTower() + " and schedule preventive overhaul.")
                    .capexEstimate("Pending Field Estimate")
                    .createdAt(LocalDateTime.now())
                    .updatedAt(LocalDateTime.now())
                    .build());

            results.add(RecurrenceClusterResponse.builder()
                    .id(created.getId())
                    .clusterCode(created.getClusterCode())
                    .title(created.getTitle())
                    .tower(created.getTower())
                    .category(created.getCategory())
                    .assetId(created.getAssetId())
                    .assetName(matchedAsset != null ? matchedAsset.getName() : null)
                    .severity(created.getSeverity())
                    .incidentCount(group.size())
                    .timeWindowDays(clampedWindow)
                    .status(created.getStatus())
                    .rootCause(created.getRootCause())
                    .suggestedFix(created.getSuggestedFix())
                    .capexEstimate(created.getCapexEstimate())
                    .updatedAt(created.getUpdatedAt())
                    .relatedComplaints(group.stream().map(this::toComplaintRef).collect(Collectors.toList()))
                    .build());
        }

        return ResponseEntity.ok(results);
    }

    @PostMapping("/recurrence-queue/{id}/investigate")
    @PreAuthorize("hasAnyRole('MANAGEMENT', 'ADMIN')")
    @Transactional
    public ResponseEntity<RecurrenceInvestigation> saveInvestigation(
            @PathVariable String id,
            @RequestBody InvestigationRequest request
    ) {
        User actor = auditService.requireCurrentUser();
        RecurrenceInvestigation inv = investigationRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Recurrence investigation not found: " + id));

        if (request.getInvestigationNotes() != null) inv.setInvestigationNotes(request.getInvestigationNotes());
        if (request.getFollowUpAction() != null) inv.setFollowUpAction(request.getFollowUpAction());
        if (request.getRootCause() != null && !request.getRootCause().isBlank()) inv.setRootCause(request.getRootCause());
        if (request.getSuggestedFix() != null && !request.getSuggestedFix().isBlank()) inv.setSuggestedFix(request.getSuggestedFix());
        if (request.getCapexEstimate() != null && !request.getCapexEstimate().isBlank()) inv.setCapexEstimate(request.getCapexEstimate());
        inv.setStatus(request.getStatus() != null && !request.getStatus().isBlank() ? request.getStatus() : "PREVENTIVE_SCHEDULED");
        inv.setInvestigatedBy(actor.getName());
        inv.setUpdatedAt(LocalDateTime.now());

        if (Boolean.TRUE.equals(request.getCreatePreventiveSchedule())) {
            long count = preventiveScheduleRepository.count() + 10;
            Asset asset = inv.getAssetId() != null ? assetRepository.findById(inv.getAssetId()).orElse(null) : null;
            PreventiveSchedule ps = PreventiveSchedule.builder()
                    .id("ps-" + UUID.randomUUID().toString().substring(0, 8))
                    .taskCode(String.format("PM-2024-%03d", count))
                    .title("RCA Follow-up: " + inv.getTitle())
                    .assetId(inv.getAssetId())
                    .assetName(asset != null ? asset.getName() : inv.getTower() + " " + inv.getCategory())
                    .tower(inv.getTower())
                    .frequency("MONTHLY")
                    .nextDueDate(LocalDateTime.now().plusDays(2))
                    .assignedTeam("Reliability & Maintenance Squad")
                    .status("SCHEDULED")
                    .createdAt(LocalDateTime.now())
                    .build();
            preventiveScheduleRepository.save(ps);
        }

        if (Boolean.TRUE.equals(request.getCreateWorkOrder())) {
            long woSeq = workOrderRepository.count() + 120;
            User tech = userRepository.findByRole(Role.MAINTENANCE).stream().findFirst().orElse(actor);
            Asset asset = inv.getAssetId() != null ? assetRepository.findById(inv.getAssetId()).orElse(null) : null;
            WorkOrder wo = WorkOrder.builder()
                    .id("wo-" + UUID.randomUUID().toString().substring(0, 8))
                    .woNumber("WO-2024-" + woSeq)
                    .title("RCA Overhaul: " + inv.getTitle())
                    .type(WorkOrder.WorkOrderType.CORRECTIVE)
                    .status(WorkOrder.WorkOrderStatus.SCHEDULED)
                    .priority(WorkOrder.Priority.HIGH)
                    .assetId(inv.getAssetId())
                    .assetName(asset != null ? asset.getName() : null)
                    .tower(inv.getTower())
                    .location(asset != null ? asset.getLocation() : inv.getTower())
                    .technicianId(tech.getId())
                    .technicianName(tech.getName())
                    .dueDate(LocalDateTime.now().plusHours(24))
                    .estimatedHours(new BigDecimal("4.00"))
                    .technicianNotes(request.getFollowUpAction() != null ? request.getFollowUpAction() : inv.getSuggestedFix())
                    .createdAt(LocalDateTime.now())
                    .build();
            wo.setChecklists(List.of(
                    new WorkOrder.ChecklistItem("Inspect recurring root cause in " + inv.getTower(), false),
                    new WorkOrder.ChecklistItem("Execute structural fix: " + (inv.getSuggestedFix() != null ? inv.getSuggestedFix() : "Engineering remedy"), false)
            ));
            wo.setSparesAllocated(List.of());
            workOrderRepository.save(wo);
        }

        RecurrenceInvestigation saved = investigationRepository.save(inv);
        auditService.logAction(actor, "INVESTIGATE_RECURRENCE", "RECURRENCE_INVESTIGATION", saved.getId(),
                saved.getClusterCode() + " -> " + saved.getStatus());
        return ResponseEntity.ok(saved);
    }

    private RelatedComplaintRef toComplaintRef(Complaint c) {
        return RelatedComplaintRef.builder()
                .id(c.getId())
                .ticketNumber(c.getTicketNumber())
                .title(c.getTitle())
                .status(c.getStatus().name())
                .severity(c.getSeverity().name())
                .proposedResolution(c.getProposedResolution())
                .submittedAt(c.getSubmittedAt())
                .build();
    }

    private double round1(double val) {
        return Math.round(val * 10.0) / 10.0;
    }

    @Data
    @Builder
    public static class RadarAxis {
        private String axis;
        private double score;
        private long assetCount;
        private long openComplaints;
    }

    @Data
    @Builder
    public static class ReliabilityRadarResponse {
        private double overallReliabilityScore;
        private double slaCompliancePercentage;
        private double averageAssetHealthScore;
        private double pmCompliancePercentage;
        private double workOrderCompletionPercentage;
        private double recurrenceStabilityPercentage;
        private Map<String, Double> towerScores;
        private List<RadarAxis> radarAxes;
        private Map<String, Long> evidenceCounts;
        private String methodology;
        private String sourceOfTruth;
        private LocalDateTime lastCalculatedAt;
    }

    @Data
    @Builder
    public static class RelatedComplaintRef {
        private String id;
        private String ticketNumber;
        private String title;
        private String status;
        private String severity;
        private String proposedResolution;
        private LocalDateTime submittedAt;
    }

    @Data
    @Builder
    public static class RecurrenceClusterResponse {
        private String id;
        private String clusterCode;
        private String title;
        private String tower;
        private String category;
        private String assetId;
        private String assetName;
        private String severity;
        private int incidentCount;
        private int timeWindowDays;
        private String status;
        private String rootCause;
        private String suggestedFix;
        private String capexEstimate;
        private String investigationNotes;
        private String followUpAction;
        private String investigatedBy;
        private LocalDateTime updatedAt;
        private List<RelatedComplaintRef> relatedComplaints;
    }

    @Data
    public static class InvestigationRequest {
        private String status;
        private String rootCause;
        private String suggestedFix;
        private String capexEstimate;
        private String investigationNotes;
        private String followUpAction;
        private Boolean createPreventiveSchedule;
        private Boolean createWorkOrder;
    }
}
