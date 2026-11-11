package com.civicops.community.controller;

import com.civicops.community.model.User;
import com.civicops.community.repository.UserRepository;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class AuthController {

    private final UserRepository userRepository;

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElse(userRepository.findAll().get(0));

        String mockJwt = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9." + user.getId() + "." + System.currentTimeMillis();
        return ResponseEntity.ok(Map.of(
                "token", mockJwt,
                "user", user
        ));
    }

    @GetMapping("/me")
    public ResponseEntity<?> getCurrentUser(@RequestParam String userId) {
        return ResponseEntity.ok(userRepository.findById(userId).orElse(userRepository.findAll().get(0)));
    }

    @Data
    public static class LoginRequest {
        private String email;
        private String password;
    }
}
