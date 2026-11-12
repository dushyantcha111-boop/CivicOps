package com.civicops.community.service;

import com.civicops.community.model.Complaint;
import com.civicops.community.model.WorkOrder;
import com.civicops.community.repository.ComplaintRepository;
import com.civicops.community.repository.UserRepository;
import com.civicops.community.repository.WorkOrderRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

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

    @InjectMocks
    private ComplaintWorkflowService workflowService;

    private Complaint testComplaint;

    @BeforeEach
    void setUp() {
        testComplaint = new Complaint();
        testComplaint.setId("cmp-test-01");
        testComplaint.setTitle("Water leakage in master washroom");
        testComplaint.setCategory(Complaint.ComplaintCategory.PLUMBING);
        testComplaint.setSeverity(Complaint.ComplaintSeverity.HIGH);
        testComplaint.setTower("Tower B");
        testComplaint.setUnitNumber("B-402");
        testComplaint.setResidentName("Rahul Sharma");
        testComplaint.setStatus(Complaint.ComplaintStatus.SUBMITTED);
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
        com.civicops.community.model.User tech = new com.civicops.community.model.User();
        tech.setId("usr-tech-01");
        tech.setName("Ramesh Kumar");
        tech.setRole(com.civicops.community.model.Role.MAINTENANCE);

        when(complaintRepository.findById("cmp-test-01")).thenReturn(Optional.of(testComplaint));
        when(userRepository.findById("usr-tech-01")).thenReturn(Optional.of(tech));
        when(complaintRepository.save(any(Complaint.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(workOrderRepository.save(any(WorkOrder.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Complaint result = workflowService.assignComplaint("cmp-test-01", "usr-tech-01", "Suresh Patel", "Immediate dispatch requested");

        assertEquals(Complaint.ComplaintStatus.ASSIGNED, result.getStatus());
        assertEquals("usr-tech-01", result.getAssignedTechnicianId());
        verify(workOrderRepository, times(1)).save(any(WorkOrder.class));
    }

    @Test
    void testResidentConfirmResolutionTransitionsToResidentConfirmed() {
        when(complaintRepository.findById("cmp-test-01")).thenReturn(Optional.of(testComplaint));
        when(complaintRepository.save(any(Complaint.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(workOrderRepository.findByComplaintId("cmp-test-01")).thenReturn(Optional.empty());

        Complaint result = workflowService.residentConfirmResolution("cmp-test-01", "Rahul Sharma", 5, "Leak completely fixed, thank you!", "sig-verified");

        assertEquals(Complaint.ComplaintStatus.RESIDENT_CONFIRMED, result.getStatus());
        assertEquals(5, result.getResidentRating());
        assertEquals("Leak completely fixed, thank you!", result.getResidentFeedback());
        verify(complaintRepository, times(1)).save(any(Complaint.class));
    }

    @Test
    void testResidentDisputeResolutionTransitionsToDisputed() {
        when(complaintRepository.findById("cmp-test-01")).thenReturn(Optional.of(testComplaint));
        when(complaintRepository.save(any(Complaint.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(workOrderRepository.findByComplaintId("cmp-test-01")).thenReturn(Optional.empty());

        Complaint result = workflowService.residentDisputeResolution("cmp-test-01", "Rahul Sharma", "Water is still leaking around the fitting");

        assertEquals(Complaint.ComplaintStatus.DISPUTED, result.getStatus());
        assertEquals("Water is still leaking around the fitting", result.getDisputeReason());
        verify(complaintRepository, times(1)).save(any(Complaint.class));
    }
}
