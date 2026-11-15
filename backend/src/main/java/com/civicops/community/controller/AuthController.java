package com.civicops.community.controller;

import com.civicops.community.model.*;
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
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class AuthController {

    private final UserRepository userRepository;
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

        if (Boolean.FALSE.equals(user.getActive())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "This account has been deactivated by an administrator."));
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
                .build();

        return ResponseEntity.ok(response);
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@Valid @RequestBody RegisterRequest request) {
        String cleanEmail = request.getEmail().trim().toLowerCase();
        if (userRepository.findByEmail(cleanEmail).isPresent()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", "An account with this email address already exists."));
        }

        // Public registration strictly creates RESIDENT accounts with pending unit claim verification
        Role assignedRole = Role.RESIDENT;
        String claimedTower = request.getTower() != null && !request.getTower().isBlank()
                ? request.getTower().trim() : "Tower A";
        String claimedUnit = request.getUnitNumber() != null && !request.getUnitNumber().isBlank()
                ? request.getUnitNumber().trim().toUpperCase() : null;

        User newUser = User.builder()
                .id("usr-" + UUID.randomUUID().toString().substring(0, 8))
                .name(request.getName().trim())
                .email(cleanEmail)
                .phone(request.getPhone().trim())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .role(assignedRole)
                .authorizedRoles(assignedRole.name())
                .tower(null)
                .unitId(null)
                .unitNumber(null)
                .requestedTower(claimedTower)
                .requestedUnitNumber(claimedUnit)
                .unitVerificationStatus("PENDING_VERIFICATION")
                .avatarUrl("https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=250")
                .active(true)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        userRepository.save(newUser);
        auditService.logAction(newUser, "REGISTER_PENDING_UNIT", "USER", newUser.getId(),
                "Registered new resident account; unit claim (" + claimedTower + " / "
                        + (claimedUnit != null ? claimedUnit : "Unspecified") + ") awaiting verification");
        auditService.notify(null, "MANAGEMENT", "Unit Claim Verification Needed",
                newUser.getName() + " requested unit " + (claimedUnit != null ? claimedUnit : "Unspecified")
                        + " (" + claimedTower + ") during signup.", "USER", newUser.getId());

        String token = tokenProvider.generateTokenForUser(newUser.getEmail(), assignedRole.name());
        List<Role> authorizedRoles = newUser.getAuthorizedRoleList();

        LoginResponseDto response = LoginResponseDto.builder()
                .token(token)
                .refreshToken("refresh-" + token)
                .user(UserResponseDto.fromEntity(newUser))
                .authorizedRoles(authorizedRoles)
                .requiresRoleSelection(false)
                .build();

        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<?> forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
        // Respond uniformly without leaking account existence
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
        if (user == null || Boolean.FALSE.equals(user.getActive())) {
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
        if (user == null || Boolean.FALSE.equals(user.getActive())) {
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

        private String tower;
        private String unitNumber;
    }

    @Data
    public static class ForgotPasswordRequest {
        @NotBlank(message = "Email is required")
        @Email(message = "Valid email is required")
        private String email;
    }
}
