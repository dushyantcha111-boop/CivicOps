package com.civicops.community.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "invitations")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Invitation {

    @Id
    private String id;

    @Column(name = "invite_code", nullable = false, unique = true, length = 80)
    private String inviteCode;

    @Column(name = "invited_email", length = 150)
    private String invitedEmail;

    @Enumerated(EnumType.STRING)
    @Column(name = "target_role", nullable = false, length = 30)
    private Role targetRole;

    @Builder.Default
    @Column(name = "society_name", length = 150)
    private String societyName = "Green Valley Residency";

    @Column(length = 120)
    private String designation;

    @Column(length = 255)
    private String notes;

    @Column(name = "created_by_id", nullable = false, length = 64)
    private String createdById;

    @Column(name = "created_by_name", nullable = false, length = 120)
    private String createdByName;

    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;

    @Builder.Default
    @Column(name = "max_uses", nullable = false)
    private Integer maxUses = 1;

    @Builder.Default
    @Column(name = "used_count", nullable = false)
    private Integer usedCount = 0;

    @Builder.Default
    @Column(nullable = false, length = 30)
    private String status = "ACTIVE";

    @Column(name = "used_by_user_id", length = 64)
    private String usedByUserId;

    @Column(name = "used_at")
    private LocalDateTime usedAt;

    @Builder.Default
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    public boolean isRedeemable(String email) {
        if (!"ACTIVE".equalsIgnoreCase(status)) {
            return false;
        }
        if (expiresAt != null && expiresAt.isBefore(LocalDateTime.now())) {
            return false;
        }
        int max = maxUses != null ? maxUses : 1;
        int used = usedCount != null ? usedCount : 0;
        if (used >= max) {
            return false;
        }
        if (invitedEmail != null && !invitedEmail.isBlank()) {
            return email != null && invitedEmail.trim().equalsIgnoreCase(email.trim());
        }
        return true;
    }
}
