package com.civicops.community.repository;

import com.civicops.community.model.Notification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, String> {
    @Query("SELECT n FROM Notification n WHERE n.userId = :userId OR (n.userId IS NULL AND (n.targetRole = :role OR n.targetRole = 'ALL')) ORDER BY n.createdAt DESC")
    List<Notification> findForUserAndRole(@Param("userId") String userId, @Param("role") String role);
}
