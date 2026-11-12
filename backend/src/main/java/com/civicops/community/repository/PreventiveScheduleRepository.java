package com.civicops.community.repository;

import com.civicops.community.model.PreventiveSchedule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PreventiveScheduleRepository extends JpaRepository<PreventiveSchedule, String> {
    Optional<PreventiveSchedule> findByTaskCode(String taskCode);
    List<PreventiveSchedule> findByTower(String tower);
    List<PreventiveSchedule> findByStatus(String status);
}
