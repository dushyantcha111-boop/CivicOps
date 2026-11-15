package com.civicops.community.security;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class JwtTokenProviderTest {

    private JwtTokenProvider jwtTokenProvider;
    private final String secret = "TestOnlyJwtSigningSecretKeyForCivicOpsUnitTests123456";
    private final long expirationMs = 3600000;

    @BeforeEach
    void setUp() {
        jwtTokenProvider = new JwtTokenProvider(secret, expirationMs);
    }

    @Test
    void testRejectsMissingOrShortSecret() {
        assertThrows(IllegalStateException.class, () -> new JwtTokenProvider("", expirationMs));
        assertThrows(IllegalStateException.class, () -> new JwtTokenProvider("too-short", expirationMs));
    }

    @Test
    void testGenerateTokenFromEmailIncludesJtiAndActiveRole() {
        String email = "vikram.admin@civicops.in";

        String token = jwtTokenProvider.generateTokenForUser(email, "ADMIN");
        assertNotNull(token);
        assertFalse(token.isEmpty());

        assertTrue(jwtTokenProvider.validateToken(token));
        assertEquals(email, jwtTokenProvider.getEmailFromJWT(token));
        assertEquals("ADMIN", jwtTokenProvider.getActiveRole(token));
        assertNotNull(jwtTokenProvider.getTokenId(token));
        assertNotNull(jwtTokenProvider.getExpiration(token));
    }

    @Test
    void testInvalidTokenReturnsFalse() {
        assertFalse(jwtTokenProvider.validateToken("invalid.jwt.token"));
        assertFalse(jwtTokenProvider.validateToken(""));
        assertFalse(jwtTokenProvider.validateToken(null));
    }
}
