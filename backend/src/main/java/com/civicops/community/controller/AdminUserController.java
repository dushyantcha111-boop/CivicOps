package com.civicops.community.controller;

import com.civicops.community.model.*;
import com.civicops.community.repository.InvitationRepository;
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
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/users")
@RequiredArgsConstructor
public class AdminUserController {

    private static final String INVITE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private final UserRepository userRepository;
    private final UnitRepository unitRepository;
    private final InvitationRepository invitationRepository;
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
                .filter(u -> !Boolean.FALSE.equals(u.getActive()) && u.isAccountApproved())
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

    @GetMapping("/pending-registrations")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGEMENT')")
    public ResponseEntity<List<UserResponseDto>> getPendingRegistrations() {
        User actor = auditService.requireCurrentUser();
        boolean isAdmin = actor.getRole() == Role.ADMIN;

        List<UserResponseDto> pending = userRepository
                .findByApprovalStatusIn(List.of("PENDING_APPROVAL", "PENDING_VERIFICATION"))
                .stream()
                .filter(u -> {
                    Role targetRole = u.getRequestedRole() != null ? u.getRequestedRole() : u.getRole();
                    if (isAdmin) {
                        return targetRole != Role.ADMIN;
                    }
                    // Management can review Resident, Security, and Maintenance requests (never Management or Admin)
                    return targetRole == Role.RESIDENT || targetRole == Role.SECURITY || targetRole == Role.MAINTENANCE;
                })
                .sorted(Comparator.comparing(User::getCreatedAt, Comparator.nullsLast(Comparator.reverseOrder())))
                .map(UserResponseDto::fromEntity)
                .collect(Collectors.toList());
        return ResponseEntity.ok(pending);
    }

    @PostMapping("/{id}/review-registration")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGEMENT')")
    @Transactional
    public ResponseEntity<UserResponseDto> reviewRegistration(
            @PathVariable String id,
            @RequestBody ReviewRegistrationRequest request
    ) {
        User actor = auditService.requireCurrentUser();
        User target = userRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("User not found: " + id));

        Role targetRole = target.getRequestedRole() != null ? target.getRequestedRole() : target.getRole();
        if (targetRole == Role.ADMIN && actor.getRole() != Role.ADMIN) {
            throw new AccessDeniedException("Only Administrators can review Administrator accounts.");
        }
        if (targetRole == Role.MANAGEMENT && actor.getRole() != Role.ADMIN) {
            throw new AccessDeniedException("Only an Administrator can approve or decline Society Management registrations.");
        }

        if (request.isApprove()) {
            if (targetRole == Role.RESIDENT) {
                String unitNo = (request.getUnitNumber() != null && !request.getUnitNumber().isBlank())
                        ? request.getUnitNumber().trim().toUpperCase()
                        : (target.getRequestedUnitNumber() != null ? target.getRequestedUnitNumber().trim().toUpperCase() : null);

                if (unitNo != null && !unitNo.isBlank()) {
                    Unit unit = unitRepository.findByUnitNumber(unitNo).orElse(null);
                    if (unit != null) {
                        String resolvedTower = (request.getTower() != null && !request.getTower().isBlank())
                                ? request.getTower().trim()
                                : unit.getTower();
                        target.setUnitId(unit.getId());
                        target.setUnitNumber(unit.getUnitNumber());
                        target.setTower(resolvedTower);
                        target.setUnitVerificationStatus("VERIFIED");
                        if (unit.getResidentUserId() == null || unit.getResidentUserId().isBlank()) {
                            unit.setResidentUserId(target.getId());
                            unitRepository.save(unit);
                        }
                    } else if (request.getUnitNumber() != null && !request.getUnitNumber().isBlank()) {
                        throw new NoSuchElementException("Apartment unit not found in directory: " + unitNo);
                    }
                }
            }

            target.setRole(targetRole);
            target.setAuthorizedRoles(targetRole.name());
            target.setApprovalStatus("APPROVED");
            target.setActive(true);
            target.setReviewedBy(actor.getName());
            target.setReviewedAt(LocalDateTime.now());
            target.setReviewDecisionNotes(request.getNotes() != null && !request.getNotes().isBlank()
                    ? request.getNotes().trim()
                    : "Approved by " + actor.getName() + " (" + actor.getRole().name() + ")");
            target.setUpdatedAt(LocalDateTime.now());

            User saved = userRepository.save(target);
            auditService.logAction(actor, "APPROVE_REGISTRATION", "USER", saved.getId(),
                    "Approved " + targetRole + " account for " + saved.getEmail());
            auditService.notify(saved.getId(), targetRole.name(), "Registration Approved",
                    "Your " + targetRole.name() + " account has been approved by " + actor.getName() + ". You may now sign in.",
                    "USER", saved.getId());
            return ResponseEntity.ok(UserResponseDto.fromEntity(saved));
        } else {
            String reason = request.getNotes() != null && !request.getNotes().isBlank()
                    ? request.getNotes().trim()
                    : "Registration details could not be verified by administration.";

            target.setApprovalStatus("REJECTED");
            target.setActive(false);
            if (targetRole == Role.RESIDENT) {
                target.setUnitVerificationStatus("REJECTED");
            }
            target.setReviewedBy(actor.getName());
            target.setReviewedAt(LocalDateTime.now());
            target.setReviewDecisionNotes(reason);
            target.setUpdatedAt(LocalDateTime.now());

            User saved = userRepository.save(target);
            auditService.logAction(actor, "REJECT_REGISTRATION", "USER", saved.getId(),
                    "Declined " + targetRole + " registration for " + saved.getEmail() + ": " + reason);
            return ResponseEntity.ok(UserResponseDto.fromEntity(saved));
        }
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
            if (!"APPROVED".equalsIgnoreCase(target.getApprovalStatus())) {
                target.setApprovalStatus("APPROVED");
                target.setActive(true);
                target.setReviewedBy(actor.getName());
                target.setReviewedAt(LocalDateTime.now());
            }
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

    @GetMapping("/invitations")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGEMENT')")
    public ResponseEntity<List<Invitation>> getInvitations() {
        User actor = auditService.requireCurrentUser();
        boolean isAdmin = actor.getRole() == Role.ADMIN;
        List<Invitation> list = invitationRepository.findAllByOrderByCreatedAtDesc().stream()
                .filter(inv -> isAdmin || inv.getTargetRole() == Role.SECURITY || inv.getTargetRole() == Role.MAINTENANCE)
                .collect(Collectors.toList());
        return ResponseEntity.ok(list);
    }

    @PostMapping("/invitations")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGEMENT')")
    @Transactional
    public ResponseEntity<Invitation> createInvitation(@Valid @RequestBody CreateInvitationRequest request) {
        User actor = auditService.requireCurrentUser();
        Role targetRole;
        try {
            targetRole = Role.valueOf(request.getTargetRole().trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Invalid target role: " + request.getTargetRole());
        }

        if (targetRole == Role.RESIDENT) {
            throw new IllegalArgumentException("Residents register directly via public signup; invitations are for Staff, Management, or Admin provisioning.");
        }
        if (actor.getRole() != Role.ADMIN && (targetRole == Role.ADMIN || targetRole == Role.MANAGEMENT)) {
            throw new AccessDeniedException("Only Administrators can issue invitations for ADMIN or MANAGEMENT roles.");
        }

        int expiryHours = request.getExpiresInHours() != null ? Math.max(1, Math.min(request.getExpiresInHours(), 720)) : 72;
        String code = generateInviteCode(targetRole);

        Invitation inv = Invitation.builder()
                .id("inv-" + UUID.randomUUID().toString().substring(0, 8))
                .inviteCode(code)
                .invitedEmail(request.getInvitedEmail() != null && !request.getInvitedEmail().isBlank()
                        ? request.getInvitedEmail().trim().toLowerCase()
                        : null)
                .targetRole(targetRole)
                .societyName(request.getSocietyName() != null && !request.getSocietyName().isBlank()
                        ? request.getSocietyName().trim()
                        : "Green Valley Residency")
                .designation(request.getDesignation() != null ? request.getDesignation().trim() : null)
                .notes(request.getNotes() != null ? request.getNotes().trim() : null)
                .createdById(actor.getId())
                .createdByName(actor.getName())
                .expiresAt(LocalDateTime.now().plusHours(expiryHours))
                .maxUses(1)
                .usedCount(0)
                .status("ACTIVE")
                .createdAt(LocalDateTime.now())
                .build();

        Invitation saved = invitationRepository.save(inv);
        auditService.logAction(actor, "CREATE_INVITATION", "INVITATION", saved.getId(),
                "Issued " + targetRole + " invitation " + saved.getInviteCode()
                        + (saved.getInvitedEmail() != null ? " for " + saved.getInvitedEmail() : " (role-locked)"));
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    @PostMapping("/invitations/{id}/revoke")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGEMENT')")
    @Transactional
    public ResponseEntity<Invitation> revokeInvitation(@PathVariable String id) {
        User actor = auditService.requireCurrentUser();
        Invitation inv = invitationRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Invitation not found: " + id));
        if (actor.getRole() != Role.ADMIN && (inv.getTargetRole() == Role.ADMIN || inv.getTargetRole() == Role.MANAGEMENT)) {
            throw new AccessDeniedException("Only Administrators can revoke ADMIN or MANAGEMENT invitations.");
        }
        inv.setStatus("REVOKED");
        Invitation saved = invitationRepository.save(inv);
        auditService.logAction(actor, "REVOKE_INVITATION", "INVITATION", saved.getId(),
                "Revoked invitation " + saved.getInviteCode());
        return ResponseEntity.ok(saved);
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
                .requestedRole(primary)
                .authorizedRoles(parsedRoles.stream().map(Role::name).collect(Collectors.joining(",")))
                .approvalStatus("APPROVED")
                .societyName("Green Valley Residency")
                .reviewedBy(actor.getName())
                .reviewedAt(LocalDateTime.now())
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
        if (active && !"APPROVED".equalsIgnoreCase(target.getApprovalStatus())) {
            target.setApprovalStatus("APPROVED");
        }
        target.setUpdatedAt(LocalDateTime.now());
        User saved = userRepository.save(target);
        auditService.logAction(actor, "ADMIN_UPDATE_USER_STATUS", "USER", saved.getId(),
                "Set active=" + active + " for " + saved.getEmail());
        return ResponseEntity.ok(UserResponseDto.fromEntity(saved));
    }

    private String generateInviteCode(Role targetRole) {
        String prefix = switch (targetRole) {
            case ADMIN -> "ADM";
            case MANAGEMENT -> "MGT";
            case SECURITY -> "SEC";
            case MAINTENANCE -> "MNT";
            case RESIDENT -> "RES";
        };
        StringBuilder sb = new StringBuilder("CIV-").append(prefix).append("-");
        for (int i = 0; i < 6; i++) {
            sb.append(INVITE_ALPHABET.charAt(SECURE_RANDOM.nextInt(INVITE_ALPHABET.length())));
        }
        return sb.toString();
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

    @Data
    public static class ReviewRegistrationRequest {
        private boolean approve;
        private String tower;
        private String unitNumber;
        private String notes;
    }

    @Data
    public static class CreateInvitationRequest {
        @NotBlank(message = "Target role is required")
        private String targetRole;
        private String invitedEmail;
        private String societyName;
        private String designation;
        private String notes;
        private Integer expiresInHours;
    }
}
