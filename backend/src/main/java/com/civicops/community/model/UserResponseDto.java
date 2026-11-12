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
    private String avatarUrl;
    private String designation;
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
                .avatarUrl(user.getAvatarUrl())
                .designation(user.getDesignation())
                .createdAt(user.getCreatedAt())
                .build();
    }
}
