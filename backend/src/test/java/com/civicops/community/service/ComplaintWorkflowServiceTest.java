package com.civicops.community.service;

import com.civicops.community.model.Complaint;
import com.civicops.community.model.Role;
import com.civicops.community.model.User;
import com.civicops.community.model.WorkOrder;
import com.civicops.community.repository.AssetRepository;
import com.civicops.community.repository.ComplaintRepository;
import com.civicops.community.repository.UserRepository;
import com.civicops.community.repository.WorkOrderRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;

import java.util.ArrayList;
import java.util.Collections;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ComplaintWorkflowServiceTest {

    @Mock
    private ComplaintRepository complaintRepository;

    @Mock
    private WorkOrderRepository workOrderRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private AssetRepository assetRepository;

    @Mock
    private AuditService auditService;

    @InjectMocks
    private ComplaintWorkflowService workflowService;

    private Complaint testComplaint;
    private User residentOwner;
    private User otherResident;

    @BeforeEach
    void setUp() {
        testComplaint = new Complaint();
        testComplaint.setId("cmp-test-01");
        testComplaint.setTicketNumber("TKT-2024-091");
        testComplaint.setTitle("Water leakage in master washroom");
        testComplaint.setCategory(Complaint.ComplaintCategory.PLUMBING);
        testComplaint.setSeverity(Complaint.ComplaintSeverity.HIGH);
        testComplaint.setTower("Tower B");
        testComplaint.setUnitNumber("B-402");
        testComplaint.setResidentId("usr-res-1");
        testComplaint.setResidentName("Rahul Sharma");
        testComplaint.setStatus(Complaint.ComplaintStatus.SUBMITTED);
        testComplaint.setTimeline(new ArrayList<>());

        residentOwner = User.builder()
                .id("usr-res-1")
                .name("Rahul Sharma")
                .email("rahul@greenvalley.in")
                .role(Role.RESIDENT)
                .authorizedRoles("RESIDENT")
                .build();

        otherResident = User.builder()
                .id("usr-res-2")
                .name("Other Resident")
                .email("other@greenvalley.in")
                .role(Role.RESIDENT)
                .authorizedRoles("RESIDENT")
                .build();
    }

    @Test
    void testSubmitComplaintGeneratesTicketAndSla() {
        when(complaintRepository.count()).thenReturn(5L);
        when(complaintRepository.findSimilarActiveComplaints(any(), any())).thenReturn(Collections.emptyList());
        when(complaintRepository.save(any(Complaint.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Complaint result = workflowService.submitComplaint(testComplaint);

        assertNotNull(result.getId());
        assertTrue(result.getId().startsWith("cmp-"));
        assertEquals("TKT-2024-095", result.getTicketNumber());
        assertEquals(Complaint.ComplaintStatus.SUBMITTED, result.getStatus());
        assertNotNull(result.getSlaDeadline());
        verify(complaintRepository, times(1)).save(any(Complaint.class));
    }

    @Test
    void testAssignComplaintTransitionsToAssignedAndCreatesWorkOrder() {
        User tech = User.builder()
                .id("usr-tech-01")
                .name("Ramesh Kumar")
                .role(Role.MAINTENANCE)
                .authorizedRoles("MAINTENANCE")
                .build();

        when(complaintRepository.findById("cmp-test-01")).thenReturn(Optional.of(testComplaint));
        when(userRepository.findById("usr-tech-01")).thenReturn(Optional.of(tech));
        when(workOrderRepository.findByComplaintId("cmp-test-01")).thenReturn(Optional.empty());
        when(complaintRepository.save(any(Complaint.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(workOrderRepository.save(any(WorkOrder.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Complaint result = workflowService.assignComplaint("cmp-test-01", "usr-tech-01", "Suresh Patel", "Immediate dispatch requested");

        assertEquals(Complaint.ComplaintStatus.ASSIGNED, result.getStatus());
        assertEquals("usr-tech-01", result.getAssignedTechnicianId());
        verify(workOrderRepository, times(1)).save(any(WorkOrder.class));
    }

    @Test
    void testResidentConfirmResolutionBlocksNonOwnerAndAcceptsOwner() {
        when(complaintRepository.findById("cmp-test-01")).thenReturn(Optional.of(testComplaint));

        assertThrows(AccessDeniedException.class, () ->
                workflowService.residentConfirmResolution("cmp-test-01", "Other", 5, "Good", "sig", otherResident)
        );

        when(complaintRepository.save(any(Complaint.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(workOrderRepository.findByComplaintId("cmp-test-01")).thenReturn(Optional.empty());

        Complaint result = workflowService.residentConfirmResolution("cmp-test-01", "Rahul Sharma", 5, "Leak completely fixed!", "sig-verified", residentOwner);

        assertEquals(Complaint.ComplaintStatus.RESIDENT_CONFIRMED, result.getStatus());
        assertEquals(5, result.getResidentRating());
        verify(complaintRepository, times(1)).save(any(Complaint.class));
    }

    @Test
    void testResidentDisputeResolutionTransitionsToDisputed() {
        when(complaintRepository.findById("cmp-test-01")).thenReturn(Optional.of(testComplaint));
        when(complaintRepository.save(any(Complaint.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(workOrderRepository.findByComplaintId("cmp-test-01")).thenReturn(Optional.empty());

        Complaint result = workflowService.residentDisputeResolution("cmp-test-01", "Rahul Sharma", "Water is still leaking", residentOwner);

        assertEquals(Complaint.ComplaintStatus.DISPUTED, result.getStatus());
        assertEquals("Water is still leaking", result.getDisputeReason());
        verify(complaintRepository, times(1)).save(any(Complaint.class));
    }

    @Test
    void testGetComplaintForUserRestrictsUnassignedMaintenanceTechnician() {
        testComplaint.setAssignedTechnicianId("usr-tech-01");
        when(complaintRepository.findById("cmp-test-01")).thenReturn(Optional.of(testComplaint));

        User assignedTech = User.builder()
                .id("usr-tech-01")
                .name("Assigned Tech")
                .role(Role.MAINTENANCE)
                .authorizedRoles("MAINTENANCE")
                .build();
        User otherTech = User.builder()
                .id("usr-tech-02")
                .name("Other Tech")
                .role(Role.MAINTENANCE)
                .authorizedRoles("MAINTENANCE")
                .build();

        assertEquals("cmp-test-01", workflowService.getComplaintForUser("cmp-test-01", assignedTech).getId());
        assertThrows(AccessDeniedException.class, () ->
                workflowService.getComplaintForUser("cmp-test-01", otherTech)
        );
    }

    @Test
    void testSubmitComplaintPreventsUnverifiedResidentSpoofingVerifiedUnit() {
        User unverifiedResident = User.builder()
                .id("usr-pending-01")
                .name("Pending Resident")
                .email("pending@greenvalley.in")
                .phone("9000000001")
                .role(Role.RESIDENT)
                .authorizedRoles("RESIDENT")
                .requestedTower("Tower B")
                .requestedUnitNumber("B-402")
                .unitVerificationStatus("PENDING_VERIFICATION")
                .build();

        Complaint spoofAttempt = new Complaint();
        spoofAttempt.setTitle("Water issue");
        spoofAttempt.setDescription("Spoof attempt on B-402");
        spoofAttempt.setCategory(Complaint.ComplaintCategory.PLUMBING);
        spoofAttempt.setSeverity(Complaint.ComplaintSeverity.MEDIUM);
        spoofAttempt.setTower("Tower B");
        spoofAttempt.setUnitNumber("B-402");

        when(complaintRepository.count()).thenReturn(10L);
        when(complaintRepository.findSimilarActiveComplaints(any(), any())).thenReturn(Collections.emptyList());
        when(complaintRepository.save(any(Complaint.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Complaint saved = workflowService.submitComplaint(spoofAttempt, unverifiedResident);

        assertEquals("UNVERIFIED-B-402", saved.getUnitNumber());
        assertEquals("usr-pending-01", saved.getResidentId());
    }
}
