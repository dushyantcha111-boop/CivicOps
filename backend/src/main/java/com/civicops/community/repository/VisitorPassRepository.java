package com.civicops.community.repository;

import com.civicops.community.model.VisitorPass;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface VisitorPassRepository extends JpaRepository<VisitorPass, String> {
    Optional<VisitorPass> findByPassCode(String passCode);
    Optional<VisitorPass> findBySixDigitPin(String sixDigitPin);
    List<VisitorPass> findByTower(String tower);
    List<VisitorPass> findByStatus(String status);
}
