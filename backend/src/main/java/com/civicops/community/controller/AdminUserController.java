package com.civicops.community.controller;

import com.civicops.community.model.Role;
import com.civicops.community.model.Unit;
import com.civicops.community.model.User;
import com.civicops.community.model.UserResponseDto;
import com.civicops.community.repository.UnitRepository;
import com.civicops.community.repository.UserRepository;
import com.civicops.community.service.AuditService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/users")
@RequiredArgsConstructor
public class AdminUserController {

    private final UserRepository userRepository;
    private final UnitRepository unitRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuditService auditService;

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGEMENT')")
    public ResponseEntity<List<UserResponseDto>> getAllUsers() {
        List<UserResponseDto> list = userRepository.findAll().stream()
                .map(UserResponseDto::fromEntity)
                .collect(Collectors.toList());
        return ResponseEntity.ok(list);
    }

    @GetMapping("/technicians")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGEMENT', 'MAINTENANCE')")
    public ResponseEntity<List<UserResponseDto>> getTechnicians() {
        List<UserResponseDto> techs = userRepository.findAll().stream()
                .filter(u -> !Boolean.FALSE.equals(u.getActive()))
                .filter(u -> u.getRole() == Role.MAINTENANCE || u.getAuthorizedRoleList().contains(Role.MAINTENANCE))
                .map(UserResponseDto::fromEntity)
                .collect(Collectors.toList());
        return ResponseEntity.ok(techs);
    }

    @GetMapping("/pending-verifications")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGEMENT')")
    public ResponseEntity<List<UserResponseDto>> getPendingUnitVerifications() {
        List<UserResponseDto> pending = userRepository.findByUnitVerificationStatus("PENDING_VERIFICATION").stream()
                .map(UserResponseDto::fromEntity)
                .collect(Collectors.toList());
        return ResponseEntity.ok(pending);
    }

    @PostMapping("/{id}/verify-unit")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGEMENT')")
    @Transactional
    public ResponseEntity<UserResponseDto> verifyUnitClaim(
            @PathVariable String id,
            @RequestBody VerifyUnitRequest request
    ) {
        User actor = auditService.requireCurrentUser();
        User target = userRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("User not found: " + id));

        if (request.isApprove()) {
            String unitNo = (request.getUnitNumber() != null && !request.getUnitNumber().isBlank())
                    ? request.getUnitNumber().trim().toUpperCase()
                    : (target.getRequestedUnitNumber() != null ? target.getRequestedUnitNumber().trim().toUpperCase() : null);

            if (unitNo == null || unitNo.isBlank()) {
                throw new IllegalArgumentException("A valid unit number is required to approve unit verification.");
            }

            Unit unit = unitRepository.findByUnitNumber(unitNo)
                    .orElseThrow(() -> new NoSuchElementException("Apartment unit not found in directory: " + unitNo));

            String resolvedTower = (request.getTower() != null && !request.getTower().isBlank())
                    ? request.getTower().trim()
                    : unit.getTower();

            target.setUnitId(unit.getId());
            target.setUnitNumber(unit.getUnitNumber());
            target.setTower(resolvedTower);
            target.setUnitVerificationStatus("VERIFIED");
            target.setUpdatedAt(LocalDateTime.now());

            if (unit.getResidentUserId() == null || unit.getResidentUserId().isBlank()) {
                unit.setResidentUserId(target.getId());
                unitRepository.save(unit);
            }

            User saved = userRepository.save(target);
            auditService.logAction(actor, "VERIFY_UNIT_CLAIM", "USER", saved.getId(),
                    "Verified apartment unit " + unit.getUnitNumber() + " (" + resolvedTower + ") for " + saved.getEmail());
            auditService.notify(saved.getId(), "RESIDENT", "Unit Verified: " + unit.getUnitNumber(),
                    "Your apartment unit " + unit.getUnitNumber() + " (" + resolvedTower + ") has been verified by Management.",
                    "USER", saved.getId());
            return ResponseEntity.ok(UserResponseDto.fromEntity(saved));
        } else {
            target.setUnitId(null);
            target.setUnitNumber(null);
            target.setTower(null);
            target.setUnitVerificationStatus("REJECTED");
            target.setUpdatedAt(LocalDateTime.now());
            User saved = userRepository.save(target);

            String reason = request.getNotes() != null && !request.getNotes().isBlank()
                    ? request.getNotes().trim()
                    : "Claimed unit could not be matched with society ownership/tenancy records.";
            auditService.logAction(actor, "REJECT_UNIT_CLAIM", "USER", saved.getId(),
                    "Declined unit claim for " + saved.getEmail() + ": " + reason);
            auditService.notify(saved.getId(), "RESIDENT", "Unit Verification Declined",
                    reason, "USER", saved.getId());
            return ResponseEntity.ok(UserResponseDto.fromEntity(saved));
        }
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<UserResponseDto> createUser(@Valid @RequestBody CreateUserRequest request) {
        User actor = auditService.requireCurrentUser();
        String cleanEmail = request.getEmail().trim().toLowerCase();
        if (userRepository.findByEmail(cleanEmail).isPresent()) {
            throw new IllegalStateException("An account with email " + cleanEmail + " already exists.");
        }

        List<Role> parsedRoles = request.getAuthorizedRoles().stream()
                .map(r -> Role.valueOf(r.trim().toUpperCase()))
                .distinct()
                .collect(Collectors.toList());
        Role primary = parsedRoles.get(0);

        User newUser = User.builder()
                .id("usr-" + UUID.randomUUID().toString().substring(0, 8))
                .name(request.getName().trim())
                .email(cleanEmail)
                .phone(request.getPhone().trim())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .role(primary)
                .authorizedRoles(parsedRoles.stream().map(Role::name).collect(Collectors.joining(",")))
                .tower(request.getTower() != null ? request.getTower().trim() : "All Towers")
                .unitNumber(request.getUnitNumber())
                .unitVerificationStatus("VERIFIED")
                .designation(request.getDesignation())
                .avatarUrl("https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=250")
                .active(true)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        User saved = userRepository.save(newUser);
        auditService.logAction(actor, "ADMIN_CREATE_USER", "USER", saved.getId(),
                "Created user " + saved.getEmail() + " with roles " + saved.getAuthorizedRoles());
        return ResponseEntity.status(HttpStatus.CREATED).body(UserResponseDto.fromEntity(saved));
    }

    @PutMapping("/{id}/roles")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<UserResponseDto> updateUserRoles(
            @PathVariable String id,
            @Valid @RequestBody UpdateRolesRequest request
    ) {
        User actor = auditService.requireCurrentUser();
        User target = userRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("User not found: " + id));

        List<Role> newRoles = request.getAuthorizedRoles().stream()
                .map(r -> Role.valueOf(r.trim().toUpperCase()))
                .distinct()
                .collect(Collectors.toList());

        if (target.getId().equals(actor.getId()) && !newRoles.contains(Role.ADMIN)) {
            throw new IllegalArgumentException("Administrators cannot remove their own ADMIN authorization.");
        }

        target.setAuthorizedRoles(newRoles.stream().map(Role::name).collect(Collectors.joining(",")));
        if (!newRoles.contains(target.getRole())) {
            target.setRole(newRoles.get(0));
        }
        target.setUpdatedAt(LocalDateTime.now());

        User saved = userRepository.save(target);
        auditService.logAction(actor, "ADMIN_UPDATE_ROLES", "USER", saved.getId(),
                "Updated roles for " + saved.getEmail() + " -> " + saved.getAuthorizedRoles());
        return ResponseEntity.ok(UserResponseDto.fromEntity(saved));
    }

    @PutMapping("/{id}/status")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<UserResponseDto> updateUserStatus(
            @PathVariable String id,
            @RequestBody Map<String, Boolean> body
    ) {
        User actor = auditService.requireCurrentUser();
        User target = userRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("User not found: " + id));

        boolean active = body != null && body.getOrDefault("active", true);
        if (target.getId().equals(actor.getId()) && !active) {
            throw new IllegalArgumentException("Administrators cannot deactivate their own account.");
        }

        target.setActive(active);
        target.setUpdatedAt(LocalDateTime.now());
        User saved = userRepository.save(target);
        auditService.logAction(actor, "ADMIN_UPDATE_USER_STATUS", "USER", saved.getId(),
                "Set active=" + active + " for " + saved.getEmail());
        return ResponseEntity.ok(UserResponseDto.fromEntity(saved));
    }

    @Data
    public static class CreateUserRequest {
        @NotBlank(message = "Name is required")
        private String name;
        @NotBlank(message = "Email is required")
        @Email(message = "Valid email is required")
        private String email;
        @NotBlank(message = "Phone is required")
        private String phone;
        @NotBlank(message = "Password is required")
        @Size(min = 6, message = "Password must be at least 6 characters")
        private String password;
        @NotEmpty(message = "At least one authorized role is required")
        private List<String> authorizedRoles;
        private String tower;
        private String unitNumber;
        private String designation;
    }

    @Data
    public static class UpdateRolesRequest {
        @NotEmpty(message = "At least one authorized role is required")
        private List<String> authorizedRoles;
    }

    @Data
    public static class VerifyUnitRequest {
        private boolean approve;
        private String tower;
        private String unitNumber;
        private String notes;
    }
}
