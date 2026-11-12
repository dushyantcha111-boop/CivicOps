package com.civicops.community.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LoginResponseDto {
    private String token;
    private String refreshToken;
    private UserResponseDto user;
    private List<Role> authorizedRoles;
    private boolean requiresRoleSelection;
}
