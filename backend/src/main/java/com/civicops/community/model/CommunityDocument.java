package com.civicops.community.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "community_documents")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CommunityDocument {

    @Id
    private String id;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(nullable = false, length = 60)
    private String category;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "file_url", nullable = false, length = 500)
    private String fileUrl;

    @Builder.Default
    @Column(name = "file_size", length = 40)
    private String fileSize = "1.2 MB";

    @Column(name = "uploaded_by", nullable = false, length = 120)
    private String uploadedBy;

    @Builder.Default
    @Column(name = "visibility_role", length = 40)
    private String visibilityRole = "ALL";

    @Builder.Default
    @Column(name = "uploaded_at")
    private LocalDateTime uploadedAt = LocalDateTime.now();
}
