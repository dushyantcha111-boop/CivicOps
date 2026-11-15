package com.civicops.community.repository;

import com.civicops.community.model.MemoryGraphNodeState;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface MemoryGraphNodeStateRepository extends JpaRepository<MemoryGraphNodeState, String> {
}
