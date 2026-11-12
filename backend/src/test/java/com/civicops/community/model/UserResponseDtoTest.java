package com.civicops.community.model;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class UserResponseDtoTest {

    @Test
    void testUserResponseDtoSanitizesAndParsesRoles() {
        User user = new User();
        user.setId("usr-101");
        user.setName("Vikram Malhotra");
        user.setEmail("vikram.admin@civicops.in");
        user.setPasswordHash("$2a$10$superSecretHashThatMustNeverBeExposed");
        user.setRole(Role.ADMIN);
        user.setAuthorizedRoles("ADMIN,MANAGEMENT");
        user.setTower("All Towers");
        user.setDesignation("Chief Estate Administrator");

        UserResponseDto dto = UserResponseDto.fromEntity(user);

        assertEquals("usr-101", dto.getId());
        assertEquals("Vikram Malhotra", dto.getName());
        assertEquals("vikram.admin@civicops.in", dto.getEmail());
        assertEquals(Role.ADMIN, dto.getActiveRole());
        assertEquals(List.of(Role.ADMIN, Role.MANAGEMENT), dto.getAuthorizedRoles());
        assertEquals("Chief Estate Administrator", dto.getDesignation());
    }

    @Test
    void testSingleRoleUserDefaultsAuthorizedRoles() {
        User user = new User();
        user.setId("usr-202");
        user.setName("Rahul Sharma");
        user.setEmail("rahul.sharma@greenvalley.in");
        user.setRole(Role.RESIDENT);
        user.setAuthorizedRoles(null);

        UserResponseDto dto = UserResponseDto.fromEntity(user);

        assertEquals(Role.RESIDENT, dto.getActiveRole());
        assertEquals(List.of(Role.RESIDENT), dto.getAuthorizedRoles());
    }
}
