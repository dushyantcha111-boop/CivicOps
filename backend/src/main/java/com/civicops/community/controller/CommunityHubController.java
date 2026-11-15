package com.civicops.community.controller;

import com.civicops.community.model.*;
import com.civicops.community.repository.*;
import com.civicops.community.service.AuditService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequiredArgsConstructor
public class CommunityHubController {

    private final AnnouncementRepository announcementRepository;
    private final CommunityEventRepository eventRepository;
    private final CommunityDocumentRepository documentRepository;
    private final NotificationRepository notificationRepository;
    private final AuditLogRepository auditLogRepository;
    private final AuditService auditService;

    // ==================== ANNOUNCEMENTS ====================

    @GetMapping("/announcements")
    public ResponseEntity<List<Announcement>> getAnnouncements() {
        return ResponseEntity.ok(announcementRepository.findAllByOrderByPinnedDescPublishedAtDesc());
    }

    @PostMapping("/announcements")
    @PreAuthorize("hasAnyRole('MANAGEMENT', 'ADMIN', 'SECURITY')")
    public ResponseEntity<Announcement> createAnnouncement(@Valid @RequestBody CreateAnnouncementRequest request) {
        User actor = auditService.requireCurrentUser();
        Announcement ann = Announcement.builder()
                .id("ann-" + UUID.randomUUID().toString().substring(0, 8))
                .title(request.getTitle().trim())
                .content(request.getContent().trim())
                .category(request.getCategory() != null ? request.getCategory().trim().toUpperCase() : "GENERAL")
                .tower(request.getTower() != null && !request.getTower().isBlank() ? request.getTower().trim() : "All Towers")
                .pinned(Boolean.TRUE.equals(request.getPinned()))
                .authorName(actor.getName())
                .authorRole(actor.getRole().name())
                .publishedAt(LocalDateTime.now())
                .build();

        Announcement saved = announcementRepository.save(ann);
        auditService.notify(null, "ALL", "New Community Notice: " + saved.getTitle(),
                saved.getContent(), "ANNOUNCEMENT", saved.getId());
        auditService.logAction(actor, "PUBLISH_ANNOUNCEMENT", "ANNOUNCEMENT", saved.getId(), saved.getTitle());
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    @DeleteMapping("/announcements/{id}")
    @PreAuthorize("hasAnyRole('MANAGEMENT', 'ADMIN')")
    public ResponseEntity<?> deleteAnnouncement(@PathVariable String id) {
        User actor = auditService.requireCurrentUser();
        if (!announcementRepository.existsById(id)) {
            throw new NoSuchElementException("Announcement not found: " + id);
        }
        announcementRepository.deleteById(id);
        auditService.logAction(actor, "DELETE_ANNOUNCEMENT", "ANNOUNCEMENT", id, "Removed announcement");
        return ResponseEntity.ok(Map.of("message", "Announcement deleted"));
    }

    // ==================== EVENTS ====================

    @GetMapping("/events")
    public ResponseEntity<List<CommunityEvent>> getEvents() {
        return ResponseEntity.ok(eventRepository.findAllByOrderByEventDateAsc());
    }

    @PostMapping("/events")
    @PreAuthorize("hasAnyRole('MANAGEMENT', 'ADMIN')")
    public ResponseEntity<CommunityEvent> createEvent(@Valid @RequestBody CreateEventRequest request) {
        User actor = auditService.requireCurrentUser();
        CommunityEvent evt = CommunityEvent.builder()
                .id("evt-" + UUID.randomUUID().toString().substring(0, 8))
                .title(request.getTitle().trim())
                .description(request.getDescription().trim())
                .location(request.getLocation().trim())
                .tower(request.getTower() != null && !request.getTower().isBlank() ? request.getTower().trim() : "All Towers")
                .eventDate(request.getEventDate() != null ? request.getEventDate() : LocalDateTime.now().plusDays(3))
                .organizer(actor.getName())
                .rsvpCount(1)
                .status("UPCOMING")
                .build();
        CommunityEvent saved = eventRepository.save(evt);
        auditService.logAction(actor, "CREATE_EVENT", "COMMUNITY_EVENT", saved.getId(), saved.getTitle());
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    @PostMapping("/events/{id}/rsvp")
    public ResponseEntity<CommunityEvent> rsvpEvent(@PathVariable String id) {
        User actor = auditService.requireCurrentUser();
        CommunityEvent evt = eventRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Event not found: " + id));
        evt.setRsvpCount((evt.getRsvpCount() == null ? 0 : evt.getRsvpCount()) + 1);
        CommunityEvent saved = eventRepository.save(evt);
        auditService.logAction(actor, "RSVP_EVENT", "COMMUNITY_EVENT", saved.getId(), "RSVP confirmed by " + actor.getName());
        return ResponseEntity.ok(saved);
    }

    // ==================== DOCUMENTS ====================

    @GetMapping("/documents")
    public ResponseEntity<List<CommunityDocument>> getDocuments() {
        User actor = auditService.requireCurrentUser();
        List<CommunityDocument> all = documentRepository.findAllByOrderByUploadedAtDesc();
        if (actor.getRole() == Role.ADMIN || actor.getRole() == Role.MANAGEMENT) {
            return ResponseEntity.ok(all);
        }
        return ResponseEntity.ok(all.stream()
                .filter(d -> "ALL".equalsIgnoreCase(d.getVisibilityRole())
                        || actor.getRole().name().equalsIgnoreCase(d.getVisibilityRole()))
                .collect(Collectors.toList()));
    }

    @PostMapping("/documents")
    @PreAuthorize("hasAnyRole('MANAGEMENT', 'ADMIN')")
    public ResponseEntity<CommunityDocument> createDocument(@Valid @RequestBody CreateDocumentRequest request) {
        User actor = auditService.requireCurrentUser();
        CommunityDocument doc = CommunityDocument.builder()
                .id("doc-" + UUID.randomUUID().toString().substring(0, 8))
                .title(request.getTitle().trim())
                .category(request.getCategory().trim().toUpperCase())
                .description(request.getDescription())
                .fileUrl(request.getFileUrl().trim())
                .fileSize(request.getFileSize() != null ? request.getFileSize() : "1.0 MB")
                .uploadedBy(actor.getName())
                .visibilityRole(request.getVisibilityRole() != null ? request.getVisibilityRole().toUpperCase() : "ALL")
                .uploadedAt(LocalDateTime.now())
                .build();
        CommunityDocument saved = documentRepository.save(doc);
        auditService.logAction(actor, "UPLOAD_DOCUMENT", "COMMUNITY_DOCUMENT", saved.getId(), saved.getTitle());
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    @DeleteMapping("/documents/{id}")
    @PreAuthorize("hasAnyRole('MANAGEMENT', 'ADMIN')")
    public ResponseEntity<?> deleteDocument(@PathVariable String id) {
        User actor = auditService.requireCurrentUser();
        if (!documentRepository.existsById(id)) {
            throw new NoSuchElementException("Document not found: " + id);
        }
        documentRepository.deleteById(id);
        auditService.logAction(actor, "DELETE_DOCUMENT", "COMMUNITY_DOCUMENT", id, "Removed document");
        return ResponseEntity.ok(Map.of("message", "Document deleted"));
    }

    // ==================== NOTIFICATIONS ====================

    @GetMapping("/notifications")
    public ResponseEntity<List<Notification>> getMyNotifications() {
        User actor = auditService.requireCurrentUser();
        return ResponseEntity.ok(notificationRepository.findForUserAndRole(actor.getId(), actor.getRole().name()));
    }

    @PostMapping("/notifications/{id}/read")
    public ResponseEntity<Notification> markNotificationRead(@PathVariable String id) {
        User actor = auditService.requireCurrentUser();
        Notification n = notificationRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Notification not found: " + id));
        if (n.getUserId() != null && !n.getUserId().equals(actor.getId()) && actor.getRole() != Role.ADMIN) {
            throw new AccessDeniedException("Cannot update another user's notification.");
        }
        n.setIsRead(true);
        return ResponseEntity.ok(notificationRepository.save(n));
    }

    @PostMapping("/notifications/read-all")
    public ResponseEntity<?> markAllRead() {
        User actor = auditService.requireCurrentUser();
        List<Notification> list = notificationRepository.findForUserAndRole(actor.getId(), actor.getRole().name());
        list.forEach(n -> n.setIsRead(true));
        notificationRepository.saveAll(list);
        return ResponseEntity.ok(Map.of("updated", list.size()));
    }

    // ==================== AUDIT LOGS ====================

    @GetMapping("/audit-logs")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGEMENT')")
    public ResponseEntity<List<AuditLog>> getAuditLogs() {
        return ResponseEntity.ok(auditLogRepository.findTop200ByOrderByCreatedAtDesc());
    }

    @Data
    public static class CreateAnnouncementRequest {
        @NotBlank(message = "Title is required")
        private String title;
        @NotBlank(message = "Content is required")
        private String content;
        private String category;
        private String tower;
        private Boolean pinned;
    }

    @Data
    public static class CreateEventRequest {
        @NotBlank(message = "Event title is required")
        private String title;
        @NotBlank(message = "Description is required")
        private String description;
        @NotBlank(message = "Location is required")
        private String location;
        private String tower;
        private LocalDateTime eventDate;
    }

    @Data
    public static class CreateDocumentRequest {
        @NotBlank(message = "Document title is required")
        private String title;
        @NotBlank(message = "Category is required")
        private String category;
        private String description;
        @NotBlank(message = "Document URL is required")
        private String fileUrl;
        private String fileSize;
        private String visibilityRole;
    }
}
