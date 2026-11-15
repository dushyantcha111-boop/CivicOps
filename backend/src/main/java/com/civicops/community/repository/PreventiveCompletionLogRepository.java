package com.civicops.community.repository;

import com.civicops.community.model.PreventiveCompletionLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PreventiveCompletionLogRepository extends JpaRepository<PreventiveCompletionLog, String> {
    List<PreventiveCompletionLog> findByScheduleIdOrderByCompletedAtDesc(String scheduleId);
    List<PreventiveCompletionLog> findAllByOrderByCompletedAtDesc();
}
