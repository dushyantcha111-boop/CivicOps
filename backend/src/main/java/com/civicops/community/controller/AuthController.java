package com.civicops.community.controller;

import com.civicops.community.model.Role;
import com.civicops.community.model.User;
import com.civicops.community.repository.UserRepository;
import com.civicops.community.security.JwtTokenProvider;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
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
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new RuntimeException("User not found with email: " + request.getEmail()));

        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            return ResponseEntity.status(401).body(Map.of("error", "Invalid email or password"));
        }

        String token = tokenProvider.generateTokenFromEmail(user.getEmail());
        return ResponseEntity.ok(Map.of(
                "token", token,
                "refreshToken", "refresh-" + token,
                "user", user
        ));
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@Valid @RequestBody RegisterRequest request) {
        if (userRepository.findByEmail(request.getEmail()).isPresent()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Email is already registered"));
        }

        // SECURITY RULE: Public signup only allows RESIDENT role
        Role assignedRole = Role.RESIDENT;

        User newUser = User.builder()
                .id("usr-" + UUID.randomUUID().toString().substring(0, 8))
                .name(request.getName())
                .email(request.getEmail())
                .phone(request.getPhone())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .role(assignedRole)
                .tower(request.getTower())
                .unitNumber(request.getUnitNumber())
                .avatarUrl("https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=250")
                .createdAt(LocalDateTime.now())
                .build();

        userRepository.save(newUser);

        String token = tokenProvider.generateTokenFromEmail(newUser.getEmail());
        return ResponseEntity.ok(Map.of(
                "token", token,
                "refreshToken", "refresh-" + token,
                "user", newUser
        ));
    }

    @GetMapping("/me")
    public ResponseEntity<?> getCurrentUser(@RequestParam String userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        return ResponseEntity.ok(user);
    }

    @PostMapping("/logout")
    public ResponseEntity<?> logout() {
        return ResponseEntity.ok(Map.of("message", "Logged out successfully"));
    }

    @Data
    public static class LoginRequest {
        @NotBlank
        @Email
        private String email;
        @NotBlank
        private String password;
    }

    @Data
    public static class RegisterRequest {
        @NotBlank
        private String name;
        @NotBlank
        @Email
        private String email;
        @NotBlank
        private String phone;
        @NotBlank
        private String password;
        private String tower;
        private String unitNumber;
    }
}
