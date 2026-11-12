package com.civicops.community.controller;

import com.civicops.community.model.*;
import com.civicops.community.repository.UserRepository;
import com.civicops.community.security.JwtTokenProvider;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
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
@CrossOrigin(origins = "*")
public class AuthController {

    private final UserRepository userRepository;
    private final JwtTokenProvider tokenProvider;
    private final PasswordEncoder passwordEncoder;

    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequest request) {
        User user = userRepository.findByEmail(request.getEmail().trim().toLowerCase())
                .orElse(null);

        if (user == null || !passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Invalid email or password. Please verify your credentials."));
        }

        String token = tokenProvider.generateTokenFromEmail(user.getEmail());
        List<Role> authorizedRoles = user.getAuthorizedRoleList();
        boolean requiresRoleSelection = authorizedRoles.size() > 1;

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

        if (request.getPassword().length() < 6) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", "Password must be at least 6 characters long."));
        }

        // MANDATORY SECURITY RULE: Public registration strictly creates RESIDENT accounts only
        Role assignedRole = Role.RESIDENT;

        User newUser = User.builder()
                .id("usr-" + UUID.randomUUID().toString().substring(0, 8))
                .name(request.getName().trim())
                .email(cleanEmail)
                .phone(request.getPhone().trim())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .role(assignedRole)
                .authorizedRoles(assignedRole.name())
                .tower(request.getTower() != null ? request.getTower().trim() : "Tower A")
                .unitNumber(request.getUnitNumber() != null ? request.getUnitNumber().trim() : "101")
                .avatarUrl("https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=250")
                .createdAt(LocalDateTime.now())
                .build();

        userRepository.save(newUser);

        String token = tokenProvider.generateTokenFromEmail(newUser.getEmail());
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

    @GetMapping("/me")
    public ResponseEntity<?> getCurrentUser(Authentication authentication) {
        String email = null;
        if (authentication != null && authentication.getName() != null) {
            email = authentication.getName();
        } else {
            // Check SecurityContextHolder
            Authentication ctxAuth = SecurityContextHolder.getContext().getAuthentication();
            if (ctxAuth != null && ctxAuth.getName() != null) {
                email = ctxAuth.getName();
            }
        }

        if (email == null || "anonymousUser".equalsIgnoreCase(email)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Session expired or unauthenticated."));
        }

        User user = userRepository.findByEmail(email).orElse(null);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", "User profile not found."));
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
        if (user == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "User not found"));
        }

        Role requestedRole;
        try {
            requestedRole = Role.valueOf(roleStr.toUpperCase().trim());
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", "Invalid role: " + roleStr));
        }

        // BACKEND SECURITY: Validate that the requested role is within the user's actual database authorized roles!
        List<Role> authorizedRoles = user.getAuthorizedRoleList();
        if (!authorizedRoles.contains(requestedRole)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of(
                    "error", "User is not authorized for role " + requestedRole + ". Allowed roles: " + authorizedRoles
            ));
        }

        user.setRole(requestedRole);
        userRepository.save(user);

        return ResponseEntity.ok(UserResponseDto.fromEntity(user));
    }

    @PostMapping("/logout")
    public ResponseEntity<?> logout() {
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
        private String password;

        private String tower;
        private String unitNumber;
    }
}
