package com.civicops.community.service;

import com.civicops.community.model.AuditLog;
import com.civicops.community.model.Notification;
import com.civicops.community.model.User;
import com.civicops.community.repository.AuditLogRepository;
import com.civicops.community.repository.NotificationRepository;
import com.civicops.community.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AuditService {

    private final AuditLogRepository auditLogRepository;
    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;

    public User requireCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || auth.getName() == null || "anonymousUser".equalsIgnoreCase(auth.getName())) {
            throw new AccessDeniedException("Authentication required.");
        }
        return userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new AccessDeniedException("Authenticated user not found."));
    }

    public void logAction(User actor, String action, String entityType, String entityId, String details) {
        if (actor == null) return;
        AuditLog entry = AuditLog.builder()
                .id("aud-" + UUID.randomUUID().toString().substring(0, 8))
                .actorId(actor.getId())
                .actorEmail(actor.getEmail())
                .actorName(actor.getName())
                .actorRole(actor.getRole() != null ? actor.getRole().name() : "UNKNOWN")
                .action(action)
                .entityType(entityType)
                .entityId(entityId)
                .details(details)
                .createdAt(LocalDateTime.now())
                .build();
        auditLogRepository.save(entry);
    }

    public void notify(String userId, String targetRole, String title, String message, String type, String referenceId) {
        Notification notification = Notification.builder()
                .id("notif-" + UUID.randomUUID().toString().substring(0, 8))
                .userId(userId)
                .targetRole(targetRole)
                .title(title)
                .message(message)
                .type(type)
                .referenceId(referenceId)
                .isRead(false)
                .createdAt(LocalDateTime.now())
                .build();
        notificationRepository.save(notification);
    }
}
