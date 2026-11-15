package com.civicops.community.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "announcements")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Announcement {

    @Id
    private String id;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String content;

    @Column(nullable = false, length = 50)
    private String category;

    @Builder.Default
    @Column(length = 50)
    private String tower = "All Towers";

    @Builder.Default
    private Boolean pinned = false;

    @Column(name = "author_name", nullable = false, length = 120)
    private String authorName;

    @Column(name = "author_role", nullable = false, length = 40)
    private String authorRole;

    @Builder.Default
    @Column(name = "published_at")
    private LocalDateTime publishedAt = LocalDateTime.now();
}
