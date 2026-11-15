package com.civicops.community.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "community_events")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CommunityEvent {

    @Id
    private String id;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String description;

    @Column(nullable = false, length = 150)
    private String location;

    @Builder.Default
    @Column(length = 50)
    private String tower = "All Towers";

    @Column(name = "event_date", nullable = false)
    private LocalDateTime eventDate;

    @Column(nullable = false, length = 120)
    private String organizer;

    @Builder.Default
    @Column(name = "rsvp_count")
    private Integer rsvpCount = 0;

    @Builder.Default
    @Column(length = 30)
    private String status = "UPCOMING";
}
