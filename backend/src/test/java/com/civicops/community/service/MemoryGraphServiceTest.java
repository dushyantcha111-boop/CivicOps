package com.civicops.community.service;

import com.civicops.community.model.*;
import com.civicops.community.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MemoryGraphServiceTest {

    @Mock private ComplaintRepository complaintRepository;
    @Mock private AssetRepository assetRepository;
    @Mock private WorkOrderRepository workOrderRepository;
    @Mock private PreventiveScheduleRepository preventiveScheduleRepository;
    @Mock private RecurrenceInvestigationRepository investigationRepository;
    @Mock private SparePartRepository sparePartRepository;
    @Mock private MemoryGraphNodeStateRepository nodeStateRepository;

    @InjectMocks
    private MemoryGraphService memoryGraphService;

    private User adminUser;
    private User residentUser;
    private User maintenanceUser;

    @BeforeEach
    void setUp() {
        adminUser = User.builder()
                .id("usr-admin-1").name("Vikram Admin").email("vikram.admin@civicops.in")
                .role(Role.ADMIN).authorizedRoles("ADMIN,MANAGEMENT").active(true).approvalStatus("APPROVED")
                .build();

        residentUser = User.builder()
                .id("usr-res-1").name("Rahul Sharma").email("rahul@greenvalley.in")
                .role(Role.RESIDENT).authorizedRoles("RESIDENT").tower("Tower B").unitNumber("B-402")
                .unitVerificationStatus("VERIFIED").active(true).approvalStatus("APPROVED")
                .build();

        maintenanceUser = User.builder()
                .id("usr-maint-1").name("Ramesh Kumar").email("ramesh@civicops.in")
                .role(Role.MAINTENANCE).authorizedRoles("MAINTENANCE").active(true).approvalStatus("APPROVED")
                .build();

        Asset assetB = Asset.builder()
                .id("ast-prv-b4").assetCode("AST-PRV-B4").name("Tower B PRV-B4").category("PLUMBING")
                .tower("Tower B").location("Shaft 4").healthScore(74).status("DEGRADING").mtbfHours(310)
                .build();
        Asset assetA = Asset.builder()
                .id("ast-elev-a1").assetCode("AST-ELEV-A1").name("Tower A Lift #1").category("ELEVATOR")
                .tower("Tower A").location("Core A").healthScore(92).status("OPERATIONAL").mtbfHours(900)
                .build();

        Complaint ownComplaint = Complaint.builder()
                .id("cmp-1").ticketNumber("TKT-001").title("Low water pressure")
                .description("Master bath trickle").category(Complaint.ComplaintCategory.PLUMBING)
                .severity(Complaint.ComplaintSeverity.HIGH).status(Complaint.ComplaintStatus.PROPOSED)
                .tower("Tower B").unitNumber("B-402").residentId("usr-res-1").residentName("Rahul Sharma")
                .residentPhone("+91 9876543210").assetId("ast-prv-b4").assignedTechnicianId("usr-maint-1")
                .assignedTechnicianName("Ramesh Kumar").slaDeadline(LocalDateTime.now().plusHours(4))
                .recurringCount(3).build();

        Complaint otherResidentComplaint = Complaint.builder()
                .id("cmp-2").ticketNumber("TKT-002").title("Tower A lift vibration")
                .description("Private complaint").category(Complaint.ComplaintCategory.ELEVATOR)
                .severity(Complaint.ComplaintSeverity.CRITICAL).status(Complaint.ComplaintStatus.SUBMITTED)
                .tower("Tower A").unitNumber("A-101").residentId("usr-res-other").residentName("Deepak Chopra")
                .residentPhone("+91 9999900000").assetId("ast-elev-a1").slaDeadline(LocalDateTime.now().plusHours(2))
                .recurringCount(1).build();

        WorkOrder wo1 = WorkOrder.builder()
                .id("wo-1").woNumber("WO-001").title("Replace PRV kit").complaintId("cmp-1")
                .type(WorkOrder.WorkOrderType.CORRECTIVE).status(WorkOrder.WorkOrderStatus.IN_PROGRESS)
                .priority(WorkOrder.Priority.HIGH).assetId("ast-prv-b4").assetName("Tower B PRV-B4")
                .tower("Tower B").location("Shaft 4").technicianId("usr-maint-1").technicianName("Ramesh Kumar")
                .dueDate(LocalDateTime.now().plusHours(8)).estimatedHours(new BigDecimal("2.0"))
                .build();
        wo1.setSparesAllocated(List.of(new WorkOrder.AllocatedSpare("sp-1", "Watts Kit", 1, false)));

        PreventiveSchedule ps1 = PreventiveSchedule.builder()
                .id("ps-1").taskCode("PM-PRV-1").title("Weekly PRV flush").assetId("ast-prv-b4")
                .assetName("Tower B PRV-B4").tower("Tower B").frequency("WEEKLY")
                .nextDueDate(LocalDateTime.now().plusDays(1)).assignedTeam("Plumbing Team").status("SCHEDULED")
                .build();

        RecurrenceInvestigation inv1 = RecurrenceInvestigation.builder()
                .id("inv-1").clusterCode("CL-01").title("Tower B Plumbing Cluster").tower("Tower B")
                .category("PLUMBING").assetId("ast-prv-b4").severity("HIGH_RECURRENCE").incidentCount(3)
                .status("PENDING_DIRECTIVE").capexEstimate("₹45,000").build();

        SparePart sp1 = SparePart.builder()
                .id("sp-1").sku("WAT-01").name("Watts Kit").category("PLUMBING")
                .currentStock(4).minThreshold(3).maxCapacity(15).unitCost(new BigDecimal("1450"))
                .supplier("Apex Controls").build();

        when(assetRepository.findAll()).thenReturn(List.of(assetB, assetA));
        when(complaintRepository.findAll()).thenReturn(List.of(ownComplaint, otherResidentComplaint));
        when(workOrderRepository.findAll()).thenReturn(List.of(wo1));
        when(preventiveScheduleRepository.findAll()).thenReturn(List.of(ps1));
        when(investigationRepository.findAll()).thenReturn(List.of(inv1));
        when(sparePartRepository.findAll()).thenReturn(List.of(sp1));
        when(nodeStateRepository.findAll()).thenReturn(List.of());
    }

    @Test
    void testAdminGraphHasValidUniqueIdsAndNoDanglingEdges() {
        MemoryGraphService.MemoryGraphResponse graph = memoryGraphService.buildGraph(adminUser, null, null, null, null);

        Set<String> nodeIds = graph.getNodes().stream().map(MemoryGraphService.GraphNode::getId).collect(Collectors.toSet());
        Set<String> edgeIds = graph.getEdges().stream().map(MemoryGraphService.GraphEdge::getId).collect(Collectors.toSet());

        assertEquals(graph.getNodes().size(), nodeIds.size(), "Node IDs must be unique");
        assertEquals(graph.getEdges().size(), edgeIds.size(), "Edge IDs must be unique");
        assertTrue(nodeIds.contains("comp-cmp-1"));
        assertTrue(nodeIds.contains("comp-cmp-2"));
        assertTrue(nodeIds.contains("cluster-inv-1"));
        assertTrue(nodeIds.contains("part-sp-1"));

        for (MemoryGraphService.GraphEdge edge : graph.getEdges()) {
            assertTrue(nodeIds.contains(edge.getSource()), "Dangling edge source: " + edge.getSource());
            assertTrue(nodeIds.contains(edge.getTarget()), "Dangling edge target: " + edge.getTarget());
        }
    }

    @Test
    void testResidentGraphEnforcesOwnershipAndExcludesOtherResidentsAndInternalData() {
        MemoryGraphService.MemoryGraphResponse graph = memoryGraphService.buildGraph(residentUser, null, null, null, null);
        Set<String> nodeIds = graph.getNodes().stream().map(MemoryGraphService.GraphNode::getId).collect(Collectors.toSet());

        assertTrue(nodeIds.contains("comp-cmp-1"), "Resident should see own complaint");
        assertTrue(nodeIds.contains("asset-ast-prv-b4"), "Resident should see Tower B asset");
        assertFalse(nodeIds.contains("comp-cmp-2"), "Resident must NOT see another resident's complaint");
        assertFalse(nodeIds.contains("asset-ast-elev-a1"), "Resident must NOT see Tower A asset");
        assertFalse(nodeIds.contains("cluster-inv-1"), "Resident must NOT see internal recurrence CapEx investigation");
        assertFalse(nodeIds.contains("part-sp-1"), "Resident must NOT see spare supplier records");
    }

    @Test
    void testShortestPathFindsConnectedLineageAndExpansionWorks() {
        MemoryGraphService.MemoryGraphPathResponse path =
                memoryGraphService.findShortestPath(adminUser, "tech-usr-maint-1", "tower-tower-b");

        assertTrue(path.isFound());
        assertTrue(path.getHopCount() >= 2);
        assertEquals("tech-usr-maint-1", path.getPathNodeIds().get(0));
        assertEquals("tower-tower-b", path.getPathNodeIds().get(path.getPathNodeIds().size() - 1));

        MemoryGraphService.MemoryGraphExpandResponse expanded =
                memoryGraphService.expandNode(maintenanceUser, "wo-wo-1");
        assertEquals("wo-wo-1", expanded.getRootNodeId());
        assertTrue(expanded.getEdges().stream().anyMatch(e -> "RESOLVES_ISSUE".equals(e.getRelationship())));
    }
}
