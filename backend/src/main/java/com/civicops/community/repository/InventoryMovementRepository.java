package com.civicops.community.repository;

import com.civicops.community.model.InventoryMovement;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface InventoryMovementRepository extends JpaRepository<InventoryMovement, String> {
    List<InventoryMovement> findByPartIdOrderByCreatedAtDesc(String partId);
    List<InventoryMovement> findAllByOrderByCreatedAtDesc();
}
