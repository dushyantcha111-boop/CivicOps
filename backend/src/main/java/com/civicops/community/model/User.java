package com.civicops.community.model;

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

    @Column(name = "avatar_url", length = 500)
    private String avatarUrl;

    @Column(name = "authorized_roles")
    private String authorizedRoles;

    private String designation;

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
                .collect(java.util.stream.Collectors.toList());
    }

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();
}
