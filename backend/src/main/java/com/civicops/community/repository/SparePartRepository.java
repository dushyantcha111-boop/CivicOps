package com.civicops.community.repository;

import com.civicops.community.model.SparePart;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface SparePartRepository extends JpaRepository<SparePart, String> {
    Optional<SparePart> findBySku(String sku);
}
