package com.civicops.community.repository;

import com.civicops.community.model.RecurrenceInvestigation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface RecurrenceInvestigationRepository extends JpaRepository<RecurrenceInvestigation, String> {
    Optional<RecurrenceInvestigation> findByClusterCode(String clusterCode);
    Optional<RecurrenceInvestigation> findByTowerAndCategory(String tower, String category);
}
