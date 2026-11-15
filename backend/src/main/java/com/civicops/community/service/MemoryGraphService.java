package com.civicops.community.service;

import com.civicops.community.model.*;
import com.civicops.community.repository.*;
import lombok.Builder;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class MemoryGraphService {

    private final ComplaintRepository complaintRepository;
    private final AssetRepository assetRepository;
    private final WorkOrderRepository workOrderRepository;
    private final PreventiveScheduleRepository preventiveScheduleRepository;
    private final RecurrenceInvestigationRepository investigationRepository;
    private final SparePartRepository sparePartRepository;
    private final MemoryGraphNodeStateRepository nodeStateRepository;

    public MemoryGraphResponse buildGraph(
            User actor,
            String towerFilter,
            String nodeTypeFilter,
            String relationshipFilter,
            String query
    ) {
        MemoryGraphResponse full = buildAuthorizedGraph(actor);

        List<GraphNode> nodes = new ArrayList<>(full.getNodes());
        List<GraphEdge> edges = new ArrayList<>(full.getEdges());

        if (towerFilter != null && !towerFilter.isBlank() && !"ALL".equalsIgnoreCase(towerFilter) && !"All Towers".equalsIgnoreCase(towerFilter)) {
            nodes = nodes.stream()
                    .filter(n -> towerFilter.equalsIgnoreCase(n.getTower()) || "All Towers".equalsIgnoreCase(n.getTower()))
                    .collect(Collectors.toList());
        }

        if (nodeTypeFilter != null && !nodeTypeFilter.isBlank() && !"ALL".equalsIgnoreCase(nodeTypeFilter)) {
            nodes = nodes.stream()
                    .filter(n -> nodeTypeFilter.equalsIgnoreCase(n.getType()))
                    .collect(Collectors.toList());
        }

        if (query != null && !query.isBlank()) {
            String q = query.trim().toLowerCase();
            nodes = nodes.stream()
                    .filter(n -> matchesQuery(n, q))
                    .collect(Collectors.toList());
        }

        Set<String> activeNodeIds = nodes.stream().map(GraphNode::getId).collect(Collectors.toSet());
        edges = edges.stream()
                .filter(e -> activeNodeIds.contains(e.getSource()) && activeNodeIds.contains(e.getTarget()))
                .filter(e -> relationshipFilter == null || relationshipFilter.isBlank()
                        || "ALL".equalsIgnoreCase(relationshipFilter)
                        || relationshipFilter.equalsIgnoreCase(e.getRelationship()))
                .collect(Collectors.toList());

        return MemoryGraphResponse.builder()
                .nodes(nodes)
                .edges(edges)
                .totalNodes(full.getTotalNodes())
                .totalEdges(full.getTotalEdges())
                .scopeRole(actor.getRole() != null ? actor.getRole().name() : "UNKNOWN")
                .availableNodeTypes(full.getAvailableNodeTypes())
                .availableRelationships(full.getAvailableRelationships())
                .generatedAt(LocalDateTime.now())
                .build();
    }

    public MemoryGraphNodeDetailResponse getNodeDetails(User actor, String nodeId) {
        MemoryGraphResponse graph = buildAuthorizedGraph(actor);
        GraphNode target = graph.getNodes().stream()
                .filter(n -> n.getId().equals(nodeId))
                .findFirst()
                .orElseThrow(() -> new NoSuchElementException("Memory Graph node not found or not permitted: " + nodeId));

        List<GraphEdge> incoming = graph.getEdges().stream()
                .filter(e -> e.getTarget().equals(nodeId))
                .collect(Collectors.toList());
        List<GraphEdge> outgoing = graph.getEdges().stream()
                .filter(e -> e.getSource().equals(nodeId))
                .collect(Collectors.toList());

        Set<String> neighborIds = new LinkedHashSet<>();
        incoming.forEach(e -> neighborIds.add(e.getSource()));
        outgoing.forEach(e -> neighborIds.add(e.getTarget()));

        List<GraphNode> connectedNodes = graph.getNodes().stream()
                .filter(n -> neighborIds.contains(n.getId()))
                .collect(Collectors.toList());

        return MemoryGraphNodeDetailResponse.builder()
                .node(target)
                .incomingEdges(incoming)
                .outgoingEdges(outgoing)
                .connectedNodes(connectedNodes)
                .generatedAt(LocalDateTime.now())
                .build();
    }

    public MemoryGraphExpandResponse expandNode(User actor, String nodeId) {
        MemoryGraphNodeDetailResponse detail = getNodeDetails(actor, nodeId);
        List<GraphNode> nodes = new ArrayList<>();
        nodes.add(detail.getNode());
        nodes.addAll(detail.getConnectedNodes());

        List<GraphEdge> edges = new ArrayList<>();
        edges.addAll(detail.getIncomingEdges());
        edges.addAll(detail.getOutgoingEdges());

        return MemoryGraphExpandResponse.builder()
                .rootNodeId(nodeId)
                .nodes(nodes)
                .edges(edges)
                .generatedAt(LocalDateTime.now())
                .build();
    }

    public MemoryGraphResponse searchNodes(User actor, String query) {
        MemoryGraphResponse full = buildAuthorizedGraph(actor);
        String q = query == null ? "" : query.trim().toLowerCase();

        List<GraphNode> matched = q.isEmpty()
                ? full.getNodes()
                : full.getNodes().stream().filter(n -> matchesQuery(n, q)).collect(Collectors.toList());

        Set<String> matchedIds = matched.stream().map(GraphNode::getId).collect(Collectors.toSet());
        List<GraphEdge> relatedEdges = full.getEdges().stream()
                .filter(e -> matchedIds.contains(e.getSource()) || matchedIds.contains(e.getTarget()))
                .collect(Collectors.toList());

        // Include 1-hop neighbors if exact match is small so results show immediate context
        Set<String> contextIds = new LinkedHashSet<>(matchedIds);
        relatedEdges.forEach(e -> {
            contextIds.add(e.getSource());
            contextIds.add(e.getTarget());
        });
        List<GraphNode> contextNodes = full.getNodes().stream()
                .filter(n -> contextIds.contains(n.getId()))
                .collect(Collectors.toList());

        return MemoryGraphResponse.builder()
                .nodes(contextNodes)
                .edges(relatedEdges)
                .totalNodes(full.getTotalNodes())
                .totalEdges(full.getTotalEdges())
                .scopeRole(full.getScopeRole())
                .availableNodeTypes(full.getAvailableNodeTypes())
                .availableRelationships(full.getAvailableRelationships())
                .generatedAt(LocalDateTime.now())
                .build();
    }

    public MemoryGraphPathResponse findShortestPath(User actor, String fromNodeId, String toNodeId) {
        if (fromNodeId == null || fromNodeId.isBlank() || toNodeId == null || toNodeId.isBlank()) {
            throw new IllegalArgumentException("Both 'from' and 'to' node IDs are required.");
        }

        MemoryGraphResponse full = buildAuthorizedGraph(actor);
        Map<String, GraphNode> nodeById = full.getNodes().stream()
                .collect(Collectors.toMap(GraphNode::getId, n -> n, (a, b) -> a, LinkedHashMap::new));

        if (!nodeById.containsKey(fromNodeId) || !nodeById.containsKey(toNodeId)) {
            throw new NoSuchElementException("One or both graph nodes were not found or are outside your authorized scope.");
        }

        if (fromNodeId.equals(toNodeId)) {
            return MemoryGraphPathResponse.builder()
                    .found(true)
                    .fromNodeId(fromNodeId)
                    .toNodeId(toNodeId)
                    .hopCount(0)
                    .pathNodeIds(List.of(fromNodeId))
                    .pathEdgeIds(List.of())
                    .steps(List.of())
                    .build();
        }

        // Build undirected adjacency list retaining edge objects
        Map<String, List<PathLink>> adjacency = new HashMap<>();
        for (GraphEdge edge : full.getEdges()) {
            adjacency.computeIfAbsent(edge.getSource(), k -> new ArrayList<>())
                    .add(new PathLink(edge.getTarget(), edge, true));
            adjacency.computeIfAbsent(edge.getTarget(), k -> new ArrayList<>())
                    .add(new PathLink(edge.getSource(), edge, false));
        }

        Queue<String> queue = new ArrayDeque<>();
        Set<String> visited = new HashSet<>();
        Map<String, ParentStep> parent = new HashMap<>();

        queue.add(fromNodeId);
        visited.add(fromNodeId);

        boolean found = false;
        while (!queue.isEmpty()) {
            String current = queue.poll();
            if (current.equals(toNodeId)) {
                found = true;
                break;
            }
            for (PathLink link : adjacency.getOrDefault(current, List.of())) {
                if (visited.add(link.neighborId)) {
                    parent.put(link.neighborId, new ParentStep(current, link.edge, link.forward));
                    queue.add(link.neighborId);
                }
            }
        }

        if (!found) {
            return MemoryGraphPathResponse.builder()
                    .found(false)
                    .fromNodeId(fromNodeId)
                    .toNodeId(toNodeId)
                    .hopCount(-1)
                    .pathNodeIds(List.of())
                    .pathEdgeIds(List.of())
                    .steps(List.of())
                    .build();
        }

        LinkedList<String> pathNodeIds = new LinkedList<>();
        LinkedList<String> pathEdgeIds = new LinkedList<>();
        LinkedList<PathStepDto> steps = new LinkedList<>();

        String cursor = toNodeId;
        pathNodeIds.addFirst(cursor);
        while (!cursor.equals(fromNodeId)) {
            ParentStep step = parent.get(cursor);
            pathEdgeIds.addFirst(step.edge.getId());
            GraphNode fromNode = nodeById.get(step.prevNodeId);
            GraphNode toNode = nodeById.get(cursor);
            steps.addFirst(PathStepDto.builder()
                    .fromNodeId(step.prevNodeId)
                    .fromLabel(fromNode != null ? fromNode.getLabel() : step.prevNodeId)
                    .toNodeId(cursor)
                    .toLabel(toNode != null ? toNode.getLabel() : cursor)
                    .edgeId(step.edge.getId())
                    .relationship(step.edge.getRelationship())
                    .direction(step.forward ? "OUTGOING" : "INCOMING")
                    .label(step.edge.getLabel())
                    .build());
            cursor = step.prevNodeId;
            pathNodeIds.addFirst(cursor);
        }

        return MemoryGraphPathResponse.builder()
                .found(true)
                .fromNodeId(fromNodeId)
                .toNodeId(toNodeId)
                .hopCount(pathEdgeIds.size())
                .pathNodeIds(pathNodeIds)
                .pathEdgeIds(pathEdgeIds)
                .steps(steps)
                .build();
    }

    @Transactional
    public List<MemoryGraphNodeState> saveLayout(User actor, List<NodeLayoutInput> positions) {
        if (positions == null || positions.isEmpty()) {
            return List.of();
        }
        List<MemoryGraphNodeState> saved = new ArrayList<>();
        LocalDateTime now = LocalDateTime.now();
        for (NodeLayoutInput input : positions) {
            if (input.getNodeId() == null || input.getNodeId().isBlank()
                    || input.getPosX() == null || input.getPosY() == null) {
                continue;
            }
            MemoryGraphNodeState state = MemoryGraphNodeState.builder()
                    .nodeId(input.getNodeId().trim())
                    .posX(input.getPosX())
                    .posY(input.getPosY())
                    .pinned(Boolean.TRUE.equals(input.getPinned()))
                    .updatedBy(actor.getName())
                    .updatedAt(now)
                    .build();
            saved.add(nodeStateRepository.save(state));
        }
        return saved;
    }

    @Transactional
    public void resetLayout() {
        nodeStateRepository.deleteAll();
    }

    public MemoryGraphResponse buildAuthorizedGraph(User actor) {
        Role role = actor.getRole() != null ? actor.getRole() : Role.RESIDENT;
        boolean isResident = role == Role.RESIDENT;
        boolean isMaintenance = role == Role.MAINTENANCE;
        boolean isPrivileged = role == Role.MANAGEMENT || role == Role.ADMIN;

        List<Complaint> allComplaints = complaintRepository.findAll();
        List<Asset> allAssets = assetRepository.findAll();
        List<WorkOrder> allWorkOrders = workOrderRepository.findAll();
        List<PreventiveSchedule> allSchedules = preventiveScheduleRepository.findAll();
        List<RecurrenceInvestigation> allInvestigations = isResident ? List.of() : investigationRepository.findAll();
        List<SparePart> allSpareParts = isResident ? List.of() : sparePartRepository.findAll();

        Map<String, MemoryGraphNodeState> savedPositions = nodeStateRepository.findAll().stream()
                .collect(Collectors.toMap(MemoryGraphNodeState::getNodeId, s -> s, (a, b) -> b));

        // Scope filtering by role
        List<Complaint> visibleComplaints;
        if (isResident) {
            visibleComplaints = allComplaints.stream()
                    .filter(c -> actor.getId().equals(c.getResidentId()))
                    .collect(Collectors.toList());
        } else if (isMaintenance) {
            Set<String> assignedComplaintIds = allWorkOrders.stream()
                    .filter(w -> actor.getId().equals(w.getTechnicianId()))
                    .map(WorkOrder::getComplaintId)
                    .filter(Objects::nonNull)
                    .collect(Collectors.toSet());
            visibleComplaints = allComplaints.stream()
                    .filter(c -> actor.getId().equals(c.getAssignedTechnicianId()) || assignedComplaintIds.contains(c.getId()))
                    .collect(Collectors.toList());
        } else {
            visibleComplaints = allComplaints;
        }

        Set<String> residentTowers = new LinkedHashSet<>();
        if (isResident) {
            if (actor.hasVerifiedUnit() && actor.getTower() != null) {
                residentTowers.add(actor.getTower());
            }
            visibleComplaints.forEach(c -> {
                if (c.getTower() != null) residentTowers.add(c.getTower());
            });
            if (residentTowers.isEmpty() && actor.getRequestedTower() != null) {
                residentTowers.add(actor.getRequestedTower());
            }
        }

        List<Asset> visibleAssets = isResident
                ? allAssets.stream().filter(a -> residentTowers.contains(a.getTower())).collect(Collectors.toList())
                : allAssets;

        Set<String> visibleComplaintIds = visibleComplaints.stream().map(Complaint::getId).collect(Collectors.toSet());
        List<WorkOrder> visibleWorkOrders;
        if (isResident) {
            visibleWorkOrders = allWorkOrders.stream()
                    .filter(w -> w.getComplaintId() != null && visibleComplaintIds.contains(w.getComplaintId()))
                    .collect(Collectors.toList());
        } else if (isMaintenance) {
            visibleWorkOrders = allWorkOrders.stream()
                    .filter(w -> actor.getId().equals(w.getTechnicianId())
                            || w.getType() == WorkOrder.WorkOrderType.PREVENTIVE)
                    .collect(Collectors.toList());
        } else {
            visibleWorkOrders = allWorkOrders;
        }

        List<PreventiveSchedule> visibleSchedules = isResident
                ? allSchedules.stream().filter(s -> residentTowers.contains(s.getTower())).collect(Collectors.toList())
                : allSchedules;

        List<GraphNode> nodes = new ArrayList<>();
        List<GraphEdge> edges = new ArrayList<>();
        Set<String> nodeIds = new HashSet<>();
        Set<String> edgeIds = new HashSet<>();

        // 1. Tower Nodes
        Set<String> towers = new LinkedHashSet<>();
        if (isResident) {
            towers.addAll(residentTowers);
        } else {
            visibleAssets.forEach(a -> towers.add(a.getTower()));
            visibleComplaints.forEach(c -> towers.add(c.getTower()));
            visibleSchedules.forEach(s -> towers.add(s.getTower()));
        }

        for (String tower : towers) {
            if (tower == null || tower.isBlank()) continue;
            String tId = towerNodeId(tower);
            if (nodeIds.add(tId)) {
                long openIssues = visibleComplaints.stream()
                        .filter(c -> tower.equalsIgnoreCase(c.getTower()))
                        .filter(c -> c.getStatus() != Complaint.ComplaintStatus.CLOSED
                                && c.getStatus() != Complaint.ComplaintStatus.RESIDENT_CONFIRMED)
                        .count();
                long assetCount = visibleAssets.stream().filter(a -> tower.equalsIgnoreCase(a.getTower())).count();
                Map<String, Object> meta = new LinkedHashMap<>();
                meta.put("assetCount", assetCount);
                meta.put("visibleOpenIssues", openIssues);

                nodes.add(applyLayout(GraphNode.builder()
                        .id(tId)
                        .sourceId(tower)
                        .sourceType("TOWER")
                        .label(tower)
                        .type("TOWER")
                        .category("INFRASTRUCTURE")
                        .status(openIssues > 0 ? "ATTENTION" : "HEALTHY")
                        .tower(tower)
                        .details(assetCount + " monitored asset(s) • " + openIssues + " visible active issue(s)")
                        .provenance("PostgreSQL: towers / assets / complaints")
                        .createdAt(LocalDateTime.now())
                        .metadata(meta)
                        .build(), savedPositions));
            }
        }

        // 2. Asset Nodes + LOCATED_IN -> Tower
        for (Asset a : visibleAssets) {
            String nodeId = "asset-" + a.getId();
            if (nodeIds.add(nodeId)) {
                Map<String, Object> meta = new LinkedHashMap<>();
                meta.put("assetCode", a.getAssetCode());
                meta.put("healthScore", a.getHealthScore());
                meta.put("mtbfHours", a.getMtbfHours());
                meta.put("location", a.getLocation());
                if (!isResident && a.getVendorName() != null) {
                    meta.put("vendorName", a.getVendorName());
                }

                nodes.add(applyLayout(GraphNode.builder()
                        .id(nodeId)
                        .sourceId(a.getId())
                        .sourceType("ASSET")
                        .label(a.getName())
                        .type("ASSET")
                        .category(a.getCategory())
                        .status(a.getStatus())
                        .tower(a.getTower())
                        .details(String.format("Health: %d/100 • MTBF: %dh • Code: %s",
                                a.getHealthScore(), a.getMtbfHours(), a.getAssetCode()))
                        .provenance("PostgreSQL: assets (" + a.getAssetCode() + ")")
                        .createdAt(a.getCreatedAt())
                        .metadata(meta)
                        .build(), savedPositions));
            }
            addEdgeIfValid(edges, edgeIds, nodeIds,
                    "edge-" + nodeId + "-" + towerNodeId(a.getTower()),
                    nodeId, towerNodeId(a.getTower()),
                    "LOCATED_IN", "Installed in " + a.getTower(),
                    "PostgreSQL: assets.tower", a.getCreatedAt(), Map.of("location", a.getLocation()));
        }

        // 3. Complaint Nodes + AFFECTS_ASSET -> Asset (or LOCATED_IN -> Tower)
        for (Complaint c : visibleComplaints) {
            String compNodeId = "comp-" + c.getId();
            if (nodeIds.add(compNodeId)) {
                Map<String, Object> meta = new LinkedHashMap<>();
                meta.put("ticketNumber", c.getTicketNumber());
                meta.put("severity", c.getSeverity().name());
                meta.put("recurringCount", c.getRecurringCount());
                meta.put("slaBreached", Boolean.TRUE.equals(c.getSlaBreached()));
                if (isPrivileged) {
                    meta.put("unitNumber", c.getUnitNumber());
                }

                String detailText = isResident
                        ? String.format("Severity: %s • Status: %s • Recurrences: %d",
                                c.getSeverity(), c.getStatus(), c.getRecurringCount())
                        : String.format("Unit %s • Severity: %s • Recurrences: %d",
                                c.getUnitNumber(), c.getSeverity(), c.getRecurringCount());

                nodes.add(applyLayout(GraphNode.builder()
                        .id(compNodeId)
                        .sourceId(c.getId())
                        .sourceType("COMPLAINT")
                        .label(c.getTicketNumber() + ": " + c.getTitle())
                        .type("COMPLAINT")
                        .category(c.getCategory().name())
                        .status(c.getStatus().name())
                        .tower(c.getTower())
                        .details(detailText)
                        .provenance("PostgreSQL: complaints (" + c.getTicketNumber() + ")")
                        .createdAt(c.getSubmittedAt())
                        .updatedAt(c.getUpdatedAt())
                        .metadata(meta)
                        .build(), savedPositions));
            }

            Asset matchedAsset = resolveComplaintAsset(c, visibleAssets);
            if (matchedAsset != null) {
                addEdgeIfValid(edges, edgeIds, nodeIds,
                        "edge-" + compNodeId + "-asset-" + matchedAsset.getId(),
                        compNodeId, "asset-" + matchedAsset.getId(),
                        "AFFECTS_ASSET", "Impacts " + matchedAsset.getName(),
                        "PostgreSQL: complaints.asset_id / tower+category match",
                        c.getSubmittedAt(),
                        Map.of("severity", c.getSeverity().name()));
            } else {
                addEdgeIfValid(edges, edgeIds, nodeIds,
                        "edge-" + compNodeId + "-" + towerNodeId(c.getTower()),
                        compNodeId, towerNodeId(c.getTower()),
                        "LOCATED_IN", "Reported in " + c.getTower(),
                        "PostgreSQL: complaints.tower", c.getSubmittedAt(), Map.of());
            }
        }

        // 4. WorkOrder + Technician Nodes
        for (WorkOrder wo : visibleWorkOrders) {
            String woNodeId = "wo-" + wo.getId();
            if (nodeIds.add(woNodeId)) {
                Map<String, Object> meta = new LinkedHashMap<>();
                meta.put("woNumber", wo.getWoNumber());
                meta.put("priority", wo.getPriority().name());
                meta.put("type", wo.getType().name());
                if (!isResident) {
                    meta.put("technicianName", wo.getTechnicianName());
                    meta.put("location", wo.getLocation());
                }

                nodes.add(applyLayout(GraphNode.builder()
                        .id(woNodeId)
                        .sourceId(wo.getId())
                        .sourceType("WORK_ORDER")
                        .label(wo.getWoNumber() + ": " + wo.getTitle())
                        .type("WORK_ORDER")
                        .category(wo.getType().name())
                        .status(wo.getStatus().name())
                        .tower(wo.getTower())
                        .details(isResident
                                ? "Priority: " + wo.getPriority() + " • Status: " + wo.getStatus()
                                : "Assigned: " + wo.getTechnicianName() + " • Status: " + wo.getStatus())
                        .provenance("PostgreSQL: work_orders (" + wo.getWoNumber() + ")")
                        .createdAt(wo.getCreatedAt())
                        .metadata(meta)
                        .build(), savedPositions));
            }

            if (wo.getComplaintId() != null) {
                addEdgeIfValid(edges, edgeIds, nodeIds,
                        "edge-" + woNodeId + "-comp-" + wo.getComplaintId(),
                        woNodeId, "comp-" + wo.getComplaintId(),
                        "RESOLVES_ISSUE", "Dispatched for " + wo.getWoNumber(),
                        "PostgreSQL: work_orders.complaint_id", wo.getCreatedAt(), Map.of());
            }
            if (wo.getAssetId() != null) {
                addEdgeIfValid(edges, edgeIds, nodeIds,
                        "edge-" + woNodeId + "-asset-" + wo.getAssetId(),
                        woNodeId, "asset-" + wo.getAssetId(),
                        "SERVICES_ASSET", "Services " + (wo.getAssetName() != null ? wo.getAssetName() : wo.getAssetId()),
                        "PostgreSQL: work_orders.asset_id", wo.getCreatedAt(), Map.of());
            } else if (wo.getComplaintId() == null) {
                addEdgeIfValid(edges, edgeIds, nodeIds,
                        "edge-" + woNodeId + "-" + towerNodeId(wo.getTower()),
                        woNodeId, towerNodeId(wo.getTower()),
                        "LOCATED_IN", "Assigned in " + wo.getTower(),
                        "PostgreSQL: work_orders.tower", wo.getCreatedAt(), Map.of());
            }

            if (!isResident && wo.getTechnicianId() != null) {
                String techNodeId = "tech-" + wo.getTechnicianId();
                if (nodeIds.add(techNodeId)) {
                    long activeJobs = visibleWorkOrders.stream()
                            .filter(w -> wo.getTechnicianId().equals(w.getTechnicianId())
                                    && w.getStatus() != WorkOrder.WorkOrderStatus.COMPLETED)
                            .count();
                    nodes.add(applyLayout(GraphNode.builder()
                            .id(techNodeId)
                            .sourceId(wo.getTechnicianId())
                            .sourceType("TECHNICIAN")
                            .label(wo.getTechnicianName())
                            .type("TECHNICIAN")
                            .category("MAINTENANCE")
                            .status(activeJobs > 0 ? "ASSIGNED" : "AVAILABLE")
                            .tower(wo.getTower())
                            .details(activeJobs + " active work order(s)")
                            .provenance("PostgreSQL: users / work_orders")
                            .createdAt(wo.getCreatedAt())
                            .metadata(Map.of("activeWorkOrders", activeJobs))
                            .build(), savedPositions));
                }
                addEdgeIfValid(edges, edgeIds, nodeIds,
                        "edge-" + techNodeId + "-" + woNodeId,
                        techNodeId, woNodeId,
                        "ASSIGNED_TO", "Executes " + wo.getWoNumber(),
                        "PostgreSQL: work_orders.technician_id", wo.getCreatedAt(), Map.of());
            }
        }

        // 5. Preventive Schedule Nodes
        for (PreventiveSchedule ps : visibleSchedules) {
            String psNodeId = "pm-" + ps.getId();
            if (nodeIds.add(psNodeId)) {
                Map<String, Object> meta = new LinkedHashMap<>();
                meta.put("taskCode", ps.getTaskCode());
                meta.put("frequency", ps.getFrequency());
                meta.put("assignedTeam", ps.getAssignedTeam());
                meta.put("nextDueDate", ps.getNextDueDate() != null ? ps.getNextDueDate().toString() : "");

                nodes.add(applyLayout(GraphNode.builder()
                        .id(psNodeId)
                        .sourceId(ps.getId())
                        .sourceType("PREVENTIVE_SCHEDULE")
                        .label(ps.getTaskCode() + ": " + ps.getTitle())
                        .type("PREVENTIVE_SCHEDULE")
                        .category(ps.getFrequency())
                        .status(ps.getStatus())
                        .tower(ps.getTower())
                        .details("Asset: " + ps.getAssetName() + " • Team: " + ps.getAssignedTeam())
                        .provenance("PostgreSQL: preventive_schedules (" + ps.getTaskCode() + ")")
                        .createdAt(ps.getCreatedAt())
                        .metadata(meta)
                        .build(), savedPositions));
            }

            Asset matchedAsset = visibleAssets.stream()
                    .filter(a -> (ps.getAssetId() != null && ps.getAssetId().equals(a.getId()))
                            || a.getName().equalsIgnoreCase(ps.getAssetName()))
                    .findFirst()
                    .orElse(null);

            if (matchedAsset != null) {
                addEdgeIfValid(edges, edgeIds, nodeIds,
                        "edge-" + psNodeId + "-asset-" + matchedAsset.getId(),
                        psNodeId, "asset-" + matchedAsset.getId(),
                        "PREVENTIVE_FOR", "Preventive cycle for " + matchedAsset.getName(),
                        "PostgreSQL: preventive_schedules", ps.getCreatedAt(), Map.of("frequency", ps.getFrequency()));
            } else {
                addEdgeIfValid(edges, edgeIds, nodeIds,
                        "edge-" + psNodeId + "-" + towerNodeId(ps.getTower()),
                        psNodeId, towerNodeId(ps.getTower()),
                        "LOCATED_IN", "Scheduled in " + ps.getTower(),
                        "PostgreSQL: preventive_schedules.tower", ps.getCreatedAt(), Map.of());
            }
        }

        // 6. Recurrence Investigation Nodes (Management, Maintenance, Admin only)
        if (!isResident) {
            for (RecurrenceInvestigation inv : allInvestigations) {
                String clNodeId = "cluster-" + inv.getId();
                if (nodeIds.add(clNodeId)) {
                    Map<String, Object> meta = new LinkedHashMap<>();
                    meta.put("clusterCode", inv.getClusterCode());
                    meta.put("incidentCount", inv.getIncidentCount());
                    meta.put("severity", inv.getSeverity());
                    if (isPrivileged && inv.getCapexEstimate() != null) {
                        meta.put("capexEstimate", inv.getCapexEstimate());
                    }

                    nodes.add(applyLayout(GraphNode.builder()
                            .id(clNodeId)
                            .sourceId(inv.getId())
                            .sourceType("RECURRENCE_INVESTIGATION")
                            .label(inv.getClusterCode() + ": " + inv.getTitle())
                            .type("RECURRENCE_INVESTIGATION")
                            .category(inv.getCategory())
                            .status(inv.getStatus())
                            .tower(inv.getTower())
                            .details(inv.getIncidentCount() + " incidents • Root Cause: "
                                    + (inv.getRootCause() != null ? inv.getRootCause() : "Under investigation"))
                            .provenance("PostgreSQL: recurrence_investigations (" + inv.getClusterCode() + ")")
                            .createdAt(inv.getCreatedAt())
                            .updatedAt(inv.getUpdatedAt())
                            .metadata(meta)
                            .build(), savedPositions));
                }

                if (inv.getAssetId() != null && nodeIds.contains("asset-" + inv.getAssetId())) {
                    addEdgeIfValid(edges, edgeIds, nodeIds,
                            "edge-" + clNodeId + "-asset-" + inv.getAssetId(),
                            clNodeId, "asset-" + inv.getAssetId(),
                            "ROOT_CAUSE_FOR", "Recurrence pattern on asset",
                            "PostgreSQL: recurrence_investigations.asset_id", inv.getUpdatedAt(), Map.of());
                } else {
                    addEdgeIfValid(edges, edgeIds, nodeIds,
                            "edge-" + clNodeId + "-" + towerNodeId(inv.getTower()),
                            clNodeId, towerNodeId(inv.getTower()),
                            "LOCATED_IN", "Detected in " + inv.getTower(),
                            "PostgreSQL: recurrence_investigations.tower", inv.getUpdatedAt(), Map.of());
                }

                for (Complaint c : visibleComplaints) {
                    boolean matchesCluster = inv.getTower().equalsIgnoreCase(c.getTower())
                            && inv.getCategory().equalsIgnoreCase(c.getCategory().name());
                    if (matchesCluster) {
                        addEdgeIfValid(edges, edgeIds, nodeIds,
                                "edge-" + clNodeId + "-comp-" + c.getId(),
                                clNodeId, "comp-" + c.getId(),
                                "CLUSTER_INCLUDES", "Groups " + c.getTicketNumber(),
                                "PostgreSQL: recurrence correlation (tower + category)", inv.getUpdatedAt(), Map.of());
                    }
                }
            }

            // 7. Spare Part Nodes (Management, Maintenance, Admin only)
            for (SparePart sp : allSpareParts) {
                String spNodeId = "part-" + sp.getId();
                if (nodeIds.add(spNodeId)) {
                    Map<String, Object> meta = new LinkedHashMap<>();
                    meta.put("sku", sp.getSku());
                    meta.put("currentStock", sp.getCurrentStock());
                    meta.put("minThreshold", sp.getMinThreshold());
                    if (isPrivileged && sp.getSupplier() != null) {
                        meta.put("supplier", sp.getSupplier());
                    }

                    nodes.add(applyLayout(GraphNode.builder()
                            .id(spNodeId)
                            .sourceId(sp.getId())
                            .sourceType("SPARE_PART")
                            .label(sp.getSku() + ": " + sp.getName())
                            .type("SPARE_PART")
                            .category(sp.getCategory())
                            .status(sp.getCurrentStock() <= sp.getMinThreshold() ? "LOW_STOCK" : "IN_STOCK")
                            .tower("All Towers")
                            .details("Stock: " + sp.getCurrentStock() + " / Min: " + sp.getMinThreshold())
                            .provenance("PostgreSQL: spare_parts (" + sp.getSku() + ")")
                            .createdAt(sp.getCreatedAt())
                            .metadata(meta)
                            .build(), savedPositions));
                }

                for (WorkOrder wo : visibleWorkOrders) {
                    boolean usedInWo = wo.getSparesAllocated() != null
                            && wo.getSparesAllocated().stream().anyMatch(s -> sp.getId().equals(s.getPartId()));
                    if (usedInWo) {
                        addEdgeIfValid(edges, edgeIds, nodeIds,
                                "edge-wo-" + wo.getId() + "-" + spNodeId,
                                "wo-" + wo.getId(), spNodeId,
                                "CONSUMES_SPARE", "Allocates " + sp.getName(),
                                "PostgreSQL: work_orders.spares_allocated", wo.getCreatedAt(), Map.of());
                    }
                }

                List<String> compat = sp.getCompatibleAssets();
                if (compat != null) {
                    for (Asset a : visibleAssets) {
                        boolean isCompat = compat.stream().anyMatch(tag ->
                                tag.equalsIgnoreCase(a.getId())
                                        || tag.equalsIgnoreCase(a.getAssetCode())
                                        || a.getName().toLowerCase().contains(tag.toLowerCase()));
                        if (isCompat) {
                            addEdgeIfValid(edges, edgeIds, nodeIds,
                                    "edge-" + spNodeId + "-asset-" + a.getId(),
                                    spNodeId, "asset-" + a.getId(),
                                    "CONSUMES_SPARE", "Compatible spare for " + a.getAssetCode(),
                                    "PostgreSQL: spare_parts.compatible_assets", sp.getCreatedAt(), Map.of());
                        }
                    }
                }
            }
        }

        List<String> availableTypes = nodes.stream().map(GraphNode::getType).distinct().collect(Collectors.toList());
        List<String> availableRels = edges.stream().map(GraphEdge::getRelationship).distinct().collect(Collectors.toList());

        return MemoryGraphResponse.builder()
                .nodes(nodes)
                .edges(edges)
                .totalNodes(nodes.size())
                .totalEdges(edges.size())
                .scopeRole(role.name())
                .availableNodeTypes(availableTypes)
                .availableRelationships(availableRels)
                .generatedAt(LocalDateTime.now())
                .build();
    }

    private Asset resolveComplaintAsset(Complaint c, List<Asset> assets) {
        if (c.getAssetId() != null) {
            Asset direct = assets.stream().filter(a -> a.getId().equals(c.getAssetId())).findFirst().orElse(null);
            if (direct != null) return direct;
        }
        return assets.stream()
                .filter(a -> a.getTower().equalsIgnoreCase(c.getTower())
                        && (a.getCategory().equalsIgnoreCase(c.getCategory().name())
                        || a.getCategory().toUpperCase().contains(c.getCategory().name().toUpperCase())))
                .findFirst()
                .or(() -> assets.stream().filter(a -> a.getTower().equalsIgnoreCase(c.getTower())).findFirst())
                .orElse(null);
    }

    private GraphNode applyLayout(GraphNode node, Map<String, MemoryGraphNodeState> savedPositions) {
        MemoryGraphNodeState state = savedPositions.get(node.getId());
        if (state != null) {
            node.setPosX(state.getPosX());
            node.setPosY(state.getPosY());
            node.setPinned(Boolean.TRUE.equals(state.getPinned()));
        }
        return node;
    }

    private void addEdgeIfValid(
            List<GraphEdge> edges,
            Set<String> edgeIds,
            Set<String> nodeIds,
            String edgeId,
            String source,
            String target,
            String relationship,
            String label,
            String provenance,
            LocalDateTime createdAt,
            Map<String, Object> metadata
    ) {
        if (source == null || target == null) return;
        if (!nodeIds.contains(source) || !nodeIds.contains(target)) return;
        if (edgeIds.add(edgeId)) {
            edges.add(GraphEdge.builder()
                    .id(edgeId)
                    .source(source)
                    .target(target)
                    .relationship(relationship)
                    .label(label)
                    .provenance(provenance)
                    .createdAt(createdAt)
                    .metadata(metadata != null ? metadata : Map.of())
                    .build());
        }
    }

    private boolean matchesQuery(GraphNode node, String q) {
        if (containsIgnoreCase(node.getLabel(), q)) return true;
        if (containsIgnoreCase(node.getSourceId(), q)) return true;
        if (containsIgnoreCase(node.getType(), q)) return true;
        if (containsIgnoreCase(node.getCategory(), q)) return true;
        if (containsIgnoreCase(node.getStatus(), q)) return true;
        if (containsIgnoreCase(node.getTower(), q)) return true;
        if (containsIgnoreCase(node.getDetails(), q)) return true;
        if (node.getMetadata() != null) {
            for (Object val : node.getMetadata().values()) {
                if (val != null && val.toString().toLowerCase().contains(q)) {
                    return true;
                }
            }
        }
        return false;
    }

    private boolean containsIgnoreCase(String value, String q) {
        return value != null && value.toLowerCase().contains(q);
    }

    private String towerNodeId(String tower) {
        return "tower-" + (tower != null ? tower.toLowerCase().replaceAll("[^a-z0-9]+", "-") : "unknown");
    }

    private static class PathLink {
        final String neighborId;
        final GraphEdge edge;
        final boolean forward;

        PathLink(String neighborId, GraphEdge edge, boolean forward) {
            this.neighborId = neighborId;
            this.edge = edge;
            this.forward = forward;
        }
    }

    private static class ParentStep {
        final String prevNodeId;
        final GraphEdge edge;
        final boolean forward;

        ParentStep(String prevNodeId, GraphEdge edge, boolean forward) {
            this.prevNodeId = prevNodeId;
            this.edge = edge;
            this.forward = forward;
        }
    }

    @Data
    @Builder
    public static class MemoryGraphResponse {
        private List<GraphNode> nodes;
        private List<GraphEdge> edges;
        private int totalNodes;
        private int totalEdges;
        private String scopeRole;
        private List<String> availableNodeTypes;
        private List<String> availableRelationships;
        private LocalDateTime generatedAt;
    }

    @Data
    @Builder
    public static class GraphNode {
        private String id;
        private String sourceId;
        private String sourceType;
        private String label;
        private String type;
        private String category;
        private String status;
        private String tower;
        private String details;
        private String provenance;
        private LocalDateTime createdAt;
        private LocalDateTime updatedAt;
        private Map<String, Object> metadata;
        private Double posX;
        private Double posY;
        private Boolean pinned;
    }

    @Data
    @Builder
    public static class GraphEdge {
        private String id;
        private String source;
        private String target;
        private String relationship;
        private String label;
        private String provenance;
        private LocalDateTime createdAt;
        private Map<String, Object> metadata;
    }

    @Data
    @Builder
    public static class MemoryGraphNodeDetailResponse {
        private GraphNode node;
        private List<GraphEdge> incomingEdges;
        private List<GraphEdge> outgoingEdges;
        private List<GraphNode> connectedNodes;
        private LocalDateTime generatedAt;
    }

    @Data
    @Builder
    public static class MemoryGraphExpandResponse {
        private String rootNodeId;
        private List<GraphNode> nodes;
        private List<GraphEdge> edges;
        private LocalDateTime generatedAt;
    }

    @Data
    @Builder
    public static class PathStepDto {
        private String fromNodeId;
        private String fromLabel;
        private String toNodeId;
        private String toLabel;
        private String edgeId;
        private String relationship;
        private String direction;
        private String label;
    }

    @Data
    @Builder
    public static class MemoryGraphPathResponse {
        private boolean found;
        private String fromNodeId;
        private String toNodeId;
        private int hopCount;
        private List<String> pathNodeIds;
        private List<String> pathEdgeIds;
        private List<PathStepDto> steps;
    }

    @Data
    public static class NodeLayoutInput {
        private String nodeId;
        private Double posX;
        private Double posY;
        private Boolean pinned;
    }
}
