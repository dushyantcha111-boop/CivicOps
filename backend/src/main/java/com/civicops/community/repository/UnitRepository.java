package com.civicops.community.repository;

import com.civicops.community.model.Unit;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UnitRepository extends JpaRepository<Unit, String> {
    Optional<Unit> findByUnitNumber(String unitNumber);
    List<Unit> findByTower(String tower);
}
