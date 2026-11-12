package com.civicops.community.repository;

import com.civicops.community.model.SpareRequisition;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SpareRequisitionRepository extends JpaRepository<SpareRequisition, String> {
    Optional<SpareRequisition> findByReqNumber(String reqNumber);
    List<SpareRequisition> findByStatus(String status);
    List<SpareRequisition> findByWorkOrderId(String workOrderId);
}
