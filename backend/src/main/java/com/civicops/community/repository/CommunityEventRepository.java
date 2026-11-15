package com.civicops.community.repository;

import com.civicops.community.model.CommunityEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CommunityEventRepository extends JpaRepository<CommunityEvent, String> {
    List<CommunityEvent> findAllByOrderByEventDateAsc();
}
