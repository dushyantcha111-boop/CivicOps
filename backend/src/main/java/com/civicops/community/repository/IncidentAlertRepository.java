package com.civicops.community.repository;

import com.civicops.community.model.IncidentAlert;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface IncidentAlertRepository extends JpaRepository<IncidentAlert, String> {
    Optional<IncidentAlert> findByAlertCode(String alertCode);
    List<IncidentAlert> findByStatus(String status);
}
