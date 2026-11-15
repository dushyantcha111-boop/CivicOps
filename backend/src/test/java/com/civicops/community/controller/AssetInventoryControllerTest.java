package com.civicops.community.controller;

import com.civicops.community.model.*;
import com.civicops.community.repository.*;
import com.civicops.community.service.AuditService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AssetInventoryControllerTest {

    @Mock private AssetRepository assetRepository;
    @Mock private SparePartRepository sparePartRepository;
    @Mock private SpareRequisitionRepository requisitionRepository;
    @Mock private InventoryMovementRepository movementRepository;
    @Mock private WorkOrderRepository workOrderRepository;
    @Mock private AuditService auditService;

    @InjectMocks
    private AssetInventoryController controller;

    private User manager;
    private SparePart part;
    private SpareRequisition pendingReq;

    @BeforeEach
    void setUp() {
        manager = User.builder()
                .id("usr-mgmt-1")
                .name("Suresh Patel")
                .email("suresh.mgmt@civicops.in")
                .role(Role.MANAGEMENT)
                .build();

        part = SparePart.builder()
                .id("sp-01")
                .sku("SKU-PRV-01")
                .name("Watts PRV Repair Kit")
                .category("PLUMBING")
                .currentStock(2)
                .minThreshold(3)
                .maxCapacity(20)
                .unitCost(new BigDecimal("1450.00"))
                .build();

        pendingReq = SpareRequisition.builder()
                .id("req-01")
                .reqNumber("REQ-2024-101")
                .technicianId("usr-maint-1")
                .technicianName("Ramesh Kumar")
                .partId("sp-01")
                .partName("Watts PRV Repair Kit")
                .quantity(2)
                .status("PENDING_APPROVAL")
                .build();
    }

    @Test
    void testApproveRequisitionDeductsStockAndRecordsMovement() {
        when(auditService.requireCurrentUser()).thenReturn(manager);
        when(requisitionRepository.findById("req-01")).thenReturn(Optional.of(pendingReq));
        when(sparePartRepository.findById("sp-01")).thenReturn(Optional.of(part));
        when(requisitionRepository.save(any(SpareRequisition.class))).thenAnswer(i -> i.getArgument(0));
        when(sparePartRepository.save(any(SparePart.class))).thenAnswer(i -> i.getArgument(0));

        controller.approveRequisition("req-01", Map.of("notes", "Approved for PRV repair"));

        assertEquals(0, part.getCurrentStock());
        assertEquals("APPROVED", pendingReq.getStatus());
        verify(movementRepository, times(1)).save(any(InventoryMovement.class));
    }

    @Test
    void testApproveRequisitionRejectsDoubleApproval() {
        pendingReq.setStatus("APPROVED");
        when(auditService.requireCurrentUser()).thenReturn(manager);
        when(requisitionRepository.findById("req-01")).thenReturn(Optional.of(pendingReq));

        assertThrows(IllegalStateException.class, () ->
                controller.approveRequisition("req-01", Map.of())
        );
        verify(sparePartRepository, never()).save(any());
    }

    @Test
    void testApproveRequisitionRejectsInsufficientStock() {
        pendingReq.setQuantity(5);
        when(auditService.requireCurrentUser()).thenReturn(manager);
        when(requisitionRepository.findById("req-01")).thenReturn(Optional.of(pendingReq));
        when(sparePartRepository.findById("sp-01")).thenReturn(Optional.of(part));

        assertThrows(IllegalArgumentException.class, () ->
                controller.approveRequisition("req-01", Map.of())
        );
        assertEquals(2, part.getCurrentStock());
        verify(sparePartRepository, never()).save(any());
    }
}
