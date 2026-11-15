package com.civicops.community.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "users")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {

    @Id
    private String id;

    @Column(nullable = false, length = 120)
    private String name;

    @Column(nullable = false, unique = true, length = 150)
    private String email;

    @Column(nullable = false, length = 30)
    private String phone;

    @JsonIgnore
    @Column(name = "password_hash", nullable = false)
    private String passwordHash;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Role role;

    @Column(name = "unit_id")
    private String unitId;

    @Column(name = "unit_number")
    private String unitNumber;

    private String tower;

    @Column(name = "requested_unit_number", length = 30)
    private String requestedUnitNumber;

    @Column(name = "requested_tower", length = 50)
    private String requestedTower;

    @Builder.Default
    @Column(name = "unit_verification_status", length = 30)
    private String unitVerificationStatus = "VERIFIED";

    @Column(name = "avatar_url", length = 500)
    private String avatarUrl;

    @Column(name = "authorized_roles")
    private String authorizedRoles;

    private String designation;

    @Enumerated(EnumType.STRING)
    @Column(name = "requested_role", length = 30)
    private Role requestedRole;

    @Builder.Default
    @Column(name = "approval_status", length = 30)
    private String approvalStatus = "APPROVED";

    @Builder.Default
    @Column(name = "society_name", length = 150)
    private String societyName = "Green Valley Residency";

    @Column(name = "society_address", length = 255)
    private String societyAddress;

    @Column(name = "staff_badge_id", length = 60)
    private String staffBadgeId;

    @Column(name = "maintenance_specialization", length = 120)
    private String maintenanceSpecialization;

    @Column(name = "verification_reference", length = 255)
    private String verificationReference;

    @Column(name = "reviewed_by", length = 120)
    private String reviewedBy;

    @Column(name = "reviewed_at")
    private LocalDateTime reviewedAt;

    @Column(name = "review_decision_notes", columnDefinition = "TEXT")
    private String reviewDecisionNotes;

    @Column(name = "invitation_id", length = 64)
    private String invitationId;

    @Builder.Default
    @Column(name = "active")
    private Boolean active = true;

    public boolean isAccountApproved() {
        return approvalStatus == null || "APPROVED".equalsIgnoreCase(approvalStatus);
    }

    public boolean hasVerifiedUnit() {
        return unitNumber != null
                && !unitNumber.isBlank()
                && (unitVerificationStatus == null || "VERIFIED".equalsIgnoreCase(unitVerificationStatus));
    }

    public java.util.List<Role> getAuthorizedRoleList() {
        if (authorizedRoles == null || authorizedRoles.isBlank()) {
            return role != null ? java.util.List.of(role) : java.util.List.of(Role.RESIDENT);
        }
        return java.util.Arrays.stream(authorizedRoles.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .map(s -> {
                    try {
                        return Role.valueOf(s.toUpperCase());
                    } catch (Exception e) {
                        return null;
                    }
                })
                .filter(java.util.Objects::nonNull)
                .distinct()
                .collect(java.util.stream.Collectors.toList());
    }

    @Builder.Default
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @Builder.Default
    @Column(name = "updated_at")
    private LocalDateTime updatedAt = LocalDateTime.now();
}
