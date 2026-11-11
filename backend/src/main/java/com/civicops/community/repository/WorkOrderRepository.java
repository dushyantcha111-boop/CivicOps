package com.civicops.community.repository;

import com.civicops.community.model.WorkOrder;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface WorkOrderRepository extends JpaRepository<WorkOrder, String> {
    Optional<WorkOrder> findByWoNumber(String woNumber);
    List<WorkOrder> findByTechnicianId(String technicianId);
    List<WorkOrder> findByStatus(WorkOrder.WorkOrderStatus status);
    Optional<WorkOrder> findByComplaintId(String complaintId);
}
