package com.civicops.community.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserResponseDto {
    private String id;
    private String name;
    private String email;
    private String phone;
    private Role activeRole;
    private List<Role> authorizedRoles;
    private String unitId;
    private String unitNumber;
    private String tower;
    private String requestedUnitNumber;
    private String requestedTower;
    private String unitVerificationStatus;
    private String avatarUrl;
    private String designation;
    private Boolean active;
    private LocalDateTime createdAt;

    public static UserResponseDto fromEntity(User user) {
        if (user == null) return null;
        return UserResponseDto.builder()
                .id(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .phone(user.getPhone())
                .activeRole(user.getRole())
                .authorizedRoles(user.getAuthorizedRoleList())
                .unitId(user.getUnitId())
                .unitNumber(user.getUnitNumber())
                .tower(user.getTower())
                .requestedUnitNumber(user.getRequestedUnitNumber())
                .requestedTower(user.getRequestedTower())
                .unitVerificationStatus(user.getUnitVerificationStatus() != null ? user.getUnitVerificationStatus() : "VERIFIED")
                .avatarUrl(user.getAvatarUrl())
                .designation(user.getDesignation())
                .active(user.getActive() == null || user.getActive())
                .createdAt(user.getCreatedAt())
                .build();
    }
}
