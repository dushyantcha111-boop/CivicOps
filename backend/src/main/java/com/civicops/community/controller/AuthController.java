package com.civicops.community.controller;

import com.civicops.community.model.*;
import com.civicops.community.repository.InvitationRepository;
import com.civicops.community.repository.RevokedTokenRepository;
import com.civicops.community.repository.UserRepository;
import com.civicops.community.security.JwtAuthenticationFilter;
import com.civicops.community.security.JwtTokenProvider;
import com.civicops.community.service.AuditService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.*;

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class AuthController {

    private final UserRepository userRepository;
    private final InvitationRepository invitationRepository;
    private final RevokedTokenRepository revokedTokenRepository;
    private final JwtTokenProvider tokenProvider;
    private final PasswordEncoder passwordEncoder;
    private final AuditService auditService;

    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequest request) {
        User user = userRepository.findByEmail(request.getEmail().trim().toLowerCase())
                .orElse(null);

        if (user == null || !passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Invalid email or password. Please verify your credentials."));
        }

        String approvalStatus = user.getApprovalStatus() != null ? user.getApprovalStatus().toUpperCase() : "APPROVED";
        if ("PENDING_VERIFICATION".equals(approvalStatus) || "PENDING_APPROVAL".equals(approvalStatus)) {
            Map<String, Object> body = new LinkedHashMap<>();
            body.put("error", "PENDING_VERIFICATION".equals(approvalStatus)
                    ? "Your resident account and apartment claim are awaiting Management verification before sign-in unlocks."
                    : "Your " + (user.getRequestedRole() != null ? user.getRequestedRole().name() : user.getRole().name())
                    + " registration is awaiting approval by an authorized administrator.");
            body.put("approvalStatus", approvalStatus);
            body.put("requestedRole", user.getRequestedRole() != null ? user.getRequestedRole().name() : user.getRole().name());
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(body);
        }

        if ("REJECTED".equals(approvalStatus)) {
            Map<String, Object> body = new LinkedHashMap<>();
            body.put("error", "Your registration request was declined."
                    + (user.getReviewDecisionNotes() != null && !user.getReviewDecisionNotes().isBlank()
                    ? " Reason: " + user.getReviewDecisionNotes()
                    : ""));
            body.put("approvalStatus", "REJECTED");
            if (user.getReviewDecisionNotes() != null) {
                body.put("reviewDecisionNotes", user.getReviewDecisionNotes());
            }
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(body);
        }

        if (Boolean.FALSE.equals(user.getActive())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of(
                            "error", "This account has been deactivated by an administrator.",
                            "approvalStatus", "DEACTIVATED"
                    ));
        }

        List<Role> authorizedRoles = user.getAuthorizedRoleList();
        if (!authorizedRoles.contains(user.getRole()) && !authorizedRoles.isEmpty()) {
            user.setRole(authorizedRoles.get(0));
            userRepository.save(user);
        }

        String token = tokenProvider.generateTokenForUser(user.getEmail(), user.getRole().name());
        boolean requiresRoleSelection = authorizedRoles.size() > 1;

        auditService.logAction(user, "LOGIN", "USER", user.getId(), "Signed in with active role " + user.getRole());

        LoginResponseDto response = LoginResponseDto.builder()
                .token(token)
                .refreshToken("refresh-" + token)
                .user(UserResponseDto.fromEntity(user))
                .authorizedRoles(authorizedRoles)
                .requiresRoleSelection(requiresRoleSelection)
                .pendingApproval(false)
                .approvalStatus("APPROVED")
                .build();

        return ResponseEntity.ok(response);
    }

    @PostMapping("/register")
    @Transactional
    public ResponseEntity<?> register(@Valid @RequestBody RegisterRequest request) {
        String cleanEmail = request.getEmail().trim().toLowerCase();
        if (userRepository.findByEmail(cleanEmail).isPresent()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", "An account with this email address already exists."));
        }

        Role requestedRole = parsePublicRegistrationRole(request.getRequestedRole());
        if (requestedRole == Role.ADMIN) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Administrator accounts cannot be created via public registration. An existing Administrator must issue an invitation."));
        }
        if (requestedRole == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", "Unsupported registration role. Choose RESIDENT, MANAGEMENT, SECURITY, or MAINTENANCE."));
        }

        String validationError = validateRoleFields(requestedRole, request);
        if (validationError != null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", validationError));
        }

        // Optional staff/management invitation check during signup
        Invitation redeemedInvitation = null;
        if (request.getInvitationCode() != null && !request.getInvitationCode().isBlank()) {
            if (requestedRole == Role.RESIDENT) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(Map.of("error", "Staff invitation codes do not apply to Resident registration."));
            }
            redeemedInvitation = invitationRepository.findByInviteCodeIgnoreCase(request.getInvitationCode().trim())
                    .orElse(null);
            if (redeemedInvitation == null || !redeemedInvitation.isRedeemable(cleanEmail)) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(Map.of("error", "Invitation code is invalid, expired, already used, or locked to another email."));
            }
            if (redeemedInvitation.getTargetRole() != requestedRole) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(Map.of("error", "Invitation code is issued for role " + redeemedInvitation.getTargetRole() + ", not " + requestedRole + "."));
            }
        }

        String claimedTower = request.getTower() != null && !request.getTower().isBlank()
                ? request.getTower().trim()
                : "Tower A";
        String claimedUnit = request.getUnitNumber() != null && !request.getUnitNumber().isBlank()
                ? request.getUnitNumber().trim().toUpperCase()
                : null;
        String societyName = request.getSocietyName() != null && !request.getSocietyName().isBlank()
                ? request.getSocietyName().trim()
                : "Green Valley Residency";

        boolean immediateApprove = redeemedInvitation != null;
        String approvalStatus = immediateApprove
                ? "APPROVED"
                : (requestedRole == Role.RESIDENT ? "PENDING_VERIFICATION" : "PENDING_APPROVAL");
        String unitStatus = requestedRole == Role.RESIDENT ? "PENDING_VERIFICATION" : "VERIFIED";

        String userId = "usr-" + UUID.randomUUID().toString().substring(0, 8);
        User newUser = User.builder()
                .id(userId)
                .name(request.getName().trim())
                .email(cleanEmail)
                .phone(request.getPhone().trim())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .role(requestedRole)
                .requestedRole(requestedRole)
                .authorizedRoles(requestedRole.name())
                .approvalStatus(approvalStatus)
                .societyName(societyName)
                .societyAddress(request.getSocietyAddress() != null ? request.getSocietyAddress().trim() : null)
                .designation(request.getDesignation() != null ? request.getDesignation().trim() : defaultDesignation(requestedRole))
                .staffBadgeId(request.getStaffBadgeId() != null ? request.getStaffBadgeId().trim().toUpperCase() : null)
                .maintenanceSpecialization(request.getMaintenanceSpecialization() != null ? request.getMaintenanceSpecialization().trim() : null)
                .verificationReference(request.getVerificationReference() != null ? request.getVerificationReference().trim() : null)
                .tower(requestedRole == Role.RESIDENT ? null : claimedTower)
                .unitId(null)
                .unitNumber(null)
                .requestedTower(requestedRole == Role.RESIDENT ? claimedTower : null)
                .requestedUnitNumber(requestedRole == Role.RESIDENT ? claimedUnit : null)
                .unitVerificationStatus(unitStatus)
                .invitationId(redeemedInvitation != null ? redeemedInvitation.getId() : null)
                .avatarUrl(defaultAvatarForRole(requestedRole))
                .active(immediateApprove)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        userRepository.save(newUser);

        if (redeemedInvitation != null) {
            markInvitationUsed(redeemedInvitation, newUser);
            auditService.logAction(newUser, "INVITATION_REGISTERED", "USER", newUser.getId(),
                    "Registered " + requestedRole + " via validated invitation " + redeemedInvitation.getInviteCode());
            String token = tokenProvider.generateTokenForUser(newUser.getEmail(), requestedRole.name());
            return ResponseEntity.status(HttpStatus.CREATED).body(LoginResponseDto.builder()
                    .token(token)
                    .refreshToken("refresh-" + token)
                    .user(UserResponseDto.fromEntity(newUser))
                    .authorizedRoles(newUser.getAuthorizedRoleList())
                    .requiresRoleSelection(false)
                    .pendingApproval(false)
                    .approvalStatus("APPROVED")
                    .message("Invitation verified. Your " + requestedRole.name() + " workspace is ready.")
                    .build());
        }

        // Pending approval path — do NOT issue an active session token
        auditService.logAction(newUser, "REGISTER_" + approvalStatus, "USER", newUser.getId(),
                "Submitted " + requestedRole + " registration for " + societyName + " (" + approvalStatus + ")");

        if (requestedRole == Role.MANAGEMENT) {
            auditService.notify(null, "ADMIN", "Management Account Approval Required",
                    newUser.getName() + " (" + cleanEmail + ") requested Society Management access for " + societyName + ".",
                    "USER", newUser.getId());
        } else {
            auditService.notify(null, "MANAGEMENT", "New " + requestedRole.name() + " Registration Pending",
                    newUser.getName() + " requested " + requestedRole.name() + " verification"
                            + (claimedUnit != null ? " (Unit " + claimedUnit + ", " + claimedTower + ")" : "") + ".",
                    "USER", newUser.getId());
            auditService.notify(null, "ADMIN", "New " + requestedRole.name() + " Registration Pending",
                    newUser.getName() + " (" + cleanEmail + ") is awaiting approval for " + requestedRole.name() + ".",
                    "USER", newUser.getId());
        }

        String statusMessage = requestedRole == Role.RESIDENT
                ? "Resident registration submitted. Management must verify your claimed apartment unit ("
                + (claimedUnit != null ? claimedUnit : "Unspecified") + ", " + claimedTower + ") before you can sign in."
                : requestedRole == Role.MANAGEMENT
                ? "Society Management onboarding request submitted. An active Administrator must approve your organization credentials before sign-in."
                : requestedRole.name() + " staff registration submitted. Management or Admin approval is required before sign-in.";

        return ResponseEntity.status(HttpStatus.CREATED).body(LoginResponseDto.builder()
                .token(null)
                .refreshToken(null)
                .user(UserResponseDto.fromEntity(newUser))
                .authorizedRoles(List.of(requestedRole))
                .requiresRoleSelection(false)
                .pendingApproval(true)
                .approvalStatus(approvalStatus)
                .message(statusMessage)
                .build());
    }

    @GetMapping("/invitations/validate")
    public ResponseEntity<?> validateInvitation(@RequestParam("code") String code) {
        if (code == null || code.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Invitation code is required."));
        }
        Invitation inv = invitationRepository.findByInviteCodeIgnoreCase(code.trim()).orElse(null);
        if (inv == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("valid", false, "error", "Invitation code was not found."));
        }
        if (!"ACTIVE".equalsIgnoreCase(inv.getStatus())) {
            return ResponseEntity.badRequest()
                    .body(Map.of("valid", false, "error", "This invitation has already been " + inv.getStatus().toLowerCase() + "."));
        }
        if (inv.getExpiresAt() != null && inv.getExpiresAt().isBefore(LocalDateTime.now())) {
            return ResponseEntity.badRequest()
                    .body(Map.of("valid", false, "error", "This invitation code has expired."));
        }
        int used = inv.getUsedCount() != null ? inv.getUsedCount() : 0;
        int max = inv.getMaxUses() != null ? inv.getMaxUses() : 1;
        if (used >= max) {
            return ResponseEntity.badRequest()
                    .body(Map.of("valid", false, "error", "This invitation has reached its maximum redemptions."));
        }

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("valid", true);
        payload.put("targetRole", inv.getTargetRole().name());
        payload.put("societyName", inv.getSocietyName());
        payload.put("designation", inv.getDesignation());
        payload.put("emailLocked", inv.getInvitedEmail() != null && !inv.getInvitedEmail().isBlank());
        payload.put("invitedEmailHint", maskEmail(inv.getInvitedEmail()));
        payload.put("expiresAt", inv.getExpiresAt());
        return ResponseEntity.ok(payload);
    }

    @PostMapping("/accept-invitation")
    @Transactional
    public ResponseEntity<?> acceptInvitation(@Valid @RequestBody AcceptInvitationRequest request) {
        String cleanEmail = request.getEmail().trim().toLowerCase();
        if (userRepository.findByEmail(cleanEmail).isPresent()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", "An account with this email address already exists."));
        }

        Invitation inv = invitationRepository.findByInviteCodeIgnoreCase(request.getInviteCode().trim())
                .orElse(null);
        if (inv == null || !inv.isRedeemable(cleanEmail)) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", "Invitation code is invalid, expired, already used, or locked to another email address."));
        }

        Role assignedRole = inv.getTargetRole();
        String authorizedRoles = assignedRole == Role.ADMIN ? "ADMIN,MANAGEMENT" : assignedRole.name();

        User newUser = User.builder()
                .id("usr-" + UUID.randomUUID().toString().substring(0, 8))
                .name(request.getName().trim())
                .email(cleanEmail)
                .phone(request.getPhone().trim())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .role(assignedRole)
                .requestedRole(assignedRole)
                .authorizedRoles(authorizedRoles)
                .approvalStatus("APPROVED")
                .societyName(inv.getSocietyName() != null ? inv.getSocietyName() : "Green Valley Residency")
                .designation(inv.getDesignation() != null && !inv.getDesignation().isBlank()
                        ? inv.getDesignation()
                        : defaultDesignation(assignedRole))
                .staffBadgeId(request.getStaffBadgeId() != null ? request.getStaffBadgeId().trim().toUpperCase() : null)
                .maintenanceSpecialization(request.getMaintenanceSpecialization() != null ? request.getMaintenanceSpecialization().trim() : null)
                .tower(request.getTower() != null && !request.getTower().isBlank() ? request.getTower().trim() : "All Towers")
                .unitVerificationStatus("VERIFIED")
                .invitationId(inv.getId())
                .reviewedBy(inv.getCreatedByName())
                .reviewedAt(LocalDateTime.now())
                .reviewDecisionNotes("Provisioned via invitation " + inv.getInviteCode())
                .avatarUrl(defaultAvatarForRole(assignedRole))
                .active(true)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        userRepository.save(newUser);
        markInvitationUsed(inv, newUser);

        auditService.logAction(newUser, "INVITATION_ACCEPTED", "USER", newUser.getId(),
                "Provisioned " + assignedRole + " account via invitation " + inv.getInviteCode() + " (issued by " + inv.getCreatedByName() + ")");

        String token = tokenProvider.generateTokenForUser(newUser.getEmail(), newUser.getRole().name());
        List<Role> roles = newUser.getAuthorizedRoleList();

        return ResponseEntity.status(HttpStatus.CREATED).body(LoginResponseDto.builder()
                .token(token)
                .refreshToken("refresh-" + token)
                .user(UserResponseDto.fromEntity(newUser))
                .authorizedRoles(roles)
                .requiresRoleSelection(roles.size() > 1)
                .pendingApproval(false)
                .approvalStatus("APPROVED")
                .message("Invitation accepted. Authenticated as " + assignedRole.name() + ".")
                .build());
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<?> forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
        userRepository.findByEmail(request.getEmail().trim().toLowerCase()).ifPresent(user ->
                auditService.logAction(user, "PASSWORD_RESET_REQUESTED", "USER", user.getId(),
                        "Password reset request logged for estate administrator review.")
        );
        return ResponseEntity.ok(Map.of(
                "message", "If an active account matches that email, estate administration has queued a password reset verification."
        ));
    }

    @GetMapping("/me")
    public ResponseEntity<?> getCurrentUser(Authentication authentication) {
        String email = authentication != null ? authentication.getName() : null;
        if (email == null) {
            Authentication ctxAuth = SecurityContextHolder.getContext().getAuthentication();
            if (ctxAuth != null) email = ctxAuth.getName();
        }

        if (email == null || "anonymousUser".equalsIgnoreCase(email)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Session expired or unauthenticated."));
        }

        User user = userRepository.findByEmail(email).orElse(null);
        if (user == null || Boolean.FALSE.equals(user.getActive()) || !user.isAccountApproved()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "User account unavailable."));
        }

        return ResponseEntity.ok(UserResponseDto.fromEntity(user));
    }

    @PostMapping("/switch-role")
    public ResponseEntity<?> switchRole(Authentication authentication, @RequestBody Map<String, String> body) {
        String roleStr = body.get("role");
        if (roleStr == null || roleStr.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Role is required"));
        }

        String email = authentication != null ? authentication.getName() : null;
        if (email == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Unauthenticated"));
        }

        User user = userRepository.findByEmail(email).orElse(null);
        if (user == null || Boolean.FALSE.equals(user.getActive()) || !user.isAccountApproved()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "User not found or inactive"));
        }

        Role requestedRole;
        try {
            requestedRole = Role.valueOf(roleStr.toUpperCase().trim());
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", "Invalid role: " + roleStr));
        }

        List<Role> authorizedRoles = user.getAuthorizedRoleList();
        if (!authorizedRoles.contains(requestedRole)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of(
                    "error", "User is not authorized for role " + requestedRole + ". Allowed roles: " + authorizedRoles
            ));
        }

        user.setRole(requestedRole);
        user.setUpdatedAt(LocalDateTime.now());
        userRepository.save(user);

        String freshToken = tokenProvider.generateTokenForUser(user.getEmail(), requestedRole.name());
        auditService.logAction(user, "SWITCH_ROLE", "USER", user.getId(), "Switched active role to " + requestedRole);

        return ResponseEntity.ok(LoginResponseDto.builder()
                .token(freshToken)
                .refreshToken("refresh-" + freshToken)
                .user(UserResponseDto.fromEntity(user))
                .authorizedRoles(authorizedRoles)
                .requiresRoleSelection(authorizedRoles.size() > 1)
                .pendingApproval(false)
                .approvalStatus("APPROVED")
                .build());
    }

    @PostMapping("/logout")
    public ResponseEntity<?> logout(HttpServletRequest request) {
        String jwt = JwtAuthenticationFilter.extractBearerToken(request);
        if (jwt != null && tokenProvider.validateToken(jwt)) {
            String jti = tokenProvider.getTokenId(jwt);
            if (jti != null && !revokedTokenRepository.existsById(jti)) {
                revokedTokenRepository.save(RevokedToken.builder()
                        .tokenId(jti)
                        .expiresAt(tokenProvider.getExpiration(jwt))
                        .revokedAt(LocalDateTime.now())
                        .build());
            }
            String email = tokenProvider.getEmailFromJWT(jwt);
            userRepository.findByEmail(email).ifPresent(user ->
                    auditService.logAction(user, "LOGOUT", "USER", user.getId(), "Token revoked and session logged out")
            );
        }
        SecurityContextHolder.clearContext();
        return ResponseEntity.ok(Map.of("message", "Session invalidated and logged out successfully."));
    }

    private Role parsePublicRegistrationRole(String raw) {
        if (raw == null || raw.isBlank()) {
            return Role.RESIDENT;
        }
        try {
            return Role.valueOf(raw.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            return null;
        }
    }

    private String validateRoleFields(Role role, RegisterRequest req) {
        if (role == Role.RESIDENT) {
            if (req.getUnitNumber() == null || req.getUnitNumber().isBlank()) {
                return "Apartment / flat unit number is required for Resident registration.";
            }
        } else if (role == Role.MANAGEMENT) {
            if (req.getSocietyName() == null || req.getSocietyName().isBlank()) {
                return "Society / Estate name is required for Society Management onboarding.";
            }
            if (req.getDesignation() == null || req.getDesignation().isBlank()) {
                return "Committee / Management designation is required.";
            }
        } else if (role == Role.SECURITY) {
            if ((req.getStaffBadgeId() == null || req.getStaffBadgeId().isBlank())
                    && (req.getInvitationCode() == null || req.getInvitationCode().isBlank())) {
                return "Guard badge / agency ID or an invitation code is required for Security onboarding.";
            }
        } else if (role == Role.MAINTENANCE) {
            if (req.getMaintenanceSpecialization() == null || req.getMaintenanceSpecialization().isBlank()) {
                return "Technical specialization (e.g. Plumbing, Electrical, HVAC) is required for Maintenance onboarding.";
            }
        }
        return null;
    }

    private void markInvitationUsed(Invitation inv, User newUser) {
        int nextUsed = (inv.getUsedCount() != null ? inv.getUsedCount() : 0) + 1;
        int maxUses = inv.getMaxUses() != null ? inv.getMaxUses() : 1;
        inv.setUsedCount(nextUsed);
        inv.setUsedByUserId(newUser.getId());
        inv.setUsedAt(LocalDateTime.now());
        if (nextUsed >= maxUses) {
            inv.setStatus("USED");
        }
        invitationRepository.save(inv);
    }

    private String maskEmail(String email) {
        if (email == null || email.isBlank() || !email.contains("@")) return null;
        String[] parts = email.split("@", 2);
        String local = parts[0];
        String prefix = local.length() <= 2 ? local.substring(0, 1) : local.substring(0, 2);
        return prefix + "***@" + parts[1];
    }

    private String defaultDesignation(Role role) {
        return switch (role) {
            case RESIDENT -> "Resident Member";
            case MANAGEMENT -> "Society Manager";
            case SECURITY -> "Security Personnel";
            case MAINTENANCE -> "Maintenance Technician";
            case ADMIN -> "System Administrator";
        };
    }

    private String defaultAvatarForRole(Role role) {
        return switch (role) {
            case ADMIN -> "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150";
            case MANAGEMENT -> "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150";
            case MAINTENANCE -> "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150";
            case SECURITY -> "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150";
            case RESIDENT -> "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150";
        };
    }

    @Data
    public static class LoginRequest {
        @NotBlank(message = "Email is required")
        @Email(message = "Valid email is required")
        private String email;

        @NotBlank(message = "Password is required")
        private String password;
    }

    @Data
    public static class RegisterRequest {
        @NotBlank(message = "Full name is required")
        private String name;

        @NotBlank(message = "Email is required")
        @Email(message = "Valid email is required")
        private String email;

        @NotBlank(message = "Phone number is required")
        private String phone;

        @NotBlank(message = "Password is required")
        @Size(min = 6, message = "Password must be at least 6 characters long.")
        private String password;

        private String requestedRole;
        private String tower;
        private String unitNumber;
        private String societyName;
        private String societyAddress;
        private String designation;
        private String staffBadgeId;
        private String maintenanceSpecialization;
        private String verificationReference;
        private String invitationCode;
    }

    @Data
    public static class AcceptInvitationRequest {
        @NotBlank(message = "Invitation code is required")
        private String inviteCode;

        @NotBlank(message = "Full name is required")
        private String name;

        @NotBlank(message = "Email is required")
        @Email(message = "Valid email is required")
        private String email;

        @NotBlank(message = "Phone number is required")
        private String phone;

        @NotBlank(message = "Password is required")
        @Size(min = 6, message = "Password must be at least 6 characters long.")
        private String password;

        private String tower;
        private String staffBadgeId;
        private String maintenanceSpecialization;
    }

    @Data
    public static class ForgotPasswordRequest {
        @NotBlank(message = "Email is required")
        @Email(message = "Valid email is required")
        private String email;
    }
}
