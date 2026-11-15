package com.civicops.community.controller;

import com.civicops.community.model.*;
import com.civicops.community.repository.*;
import com.civicops.community.security.JwtAuthenticationFilter;
import com.civicops.community.security.JwtTokenProvider;
import com.civicops.community.security.SecurityConfig;
import com.civicops.community.service.AuditService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(controllers = {AuthController.class, AdminUserController.class})
@Import({SecurityConfig.class, JwtAuthenticationFilter.class, JwtTokenProvider.class})
@TestPropertySource(properties = {
        "app.jwt.secret=TestOnlyJwtSigningSecretKeyForCivicOpsWebMvcTests123456",
        "app.jwt.expiration-ms=3600000"
})
class MultiRoleAuthAndApprovalTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private PasswordEncoder passwordEncoder;

    @MockBean private UserRepository userRepository;
    @MockBean private UnitRepository unitRepository;
    @MockBean private InvitationRepository invitationRepository;
    @MockBean private RevokedTokenRepository revokedTokenRepository;
    @MockBean private AuditService auditService;

    @Test
    void testPublicAdminSelfSignupIsBlockedWith403() throws Exception {
        String payload = """
                {
                  "name": "Attacker",
                  "email": "attacker@example.com",
                  "phone": "+91 99999 88888",
                  "password": "Password123",
                  "requestedRole": "ADMIN"
                }
                """;
        mockMvc.perform(post("/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error").exists());
    }

    @Test
    void testManagementSignupCreatesPendingApprovalWithoutJwt() throws Exception {
        when(userRepository.findByEmail("new.mgr@greenvalley.in")).thenReturn(Optional.empty());
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        String payload = """
                {
                  "name": "Meera Nair",
                  "email": "new.mgr@greenvalley.in",
                  "phone": "+91 98111 22334",
                  "password": "Password123",
                  "requestedRole": "MANAGEMENT",
                  "societyName": "Green Valley Residency",
                  "societyAddress": "Sector 42, Bengaluru",
                  "designation": "Treasurer"
                }
                """;
        mockMvc.perform(post("/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.pendingApproval").value(true))
                .andExpect(jsonPath("$.approvalStatus").value("PENDING_APPROVAL"))
                .andExpect(jsonPath("$.token").doesNotExist());
    }

    @Test
    void testPendingUserLoginBlockedWith403AndStatus() throws Exception {
        User pendingMgmt = User.builder()
                .id("usr-p1").name("Meera Nair").email("pending@civicops.in")
                .phone("9811122334").passwordHash(passwordEncoder.encode("secret123"))
                .role(Role.MANAGEMENT).requestedRole(Role.MANAGEMENT)
                .approvalStatus("PENDING_APPROVAL").active(false)
                .build();
        when(userRepository.findByEmail("pending@civicops.in")).thenReturn(Optional.of(pendingMgmt));

        String payload = """
                {"email": "pending@civicops.in", "password": "secret123"}
                """;
        mockMvc.perform(post("/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.approvalStatus").value("PENDING_APPROVAL"));
    }

    @Test
    void testInvitationValidationAndAdminOnboardingSucceeds() throws Exception {
        Invitation adminInv = Invitation.builder()
                .id("inv-01").inviteCode("CIV-ADM-998877")
                .invitedEmail("chief.admin@civicops.in").targetRole(Role.ADMIN)
                .societyName("Green Valley Residency").designation("Platform Admin")
                .createdById("usr-admin-1").createdByName("Vikram Malhotra")
                .expiresAt(LocalDateTime.now().plusHours(24))
                .maxUses(1).usedCount(0).status("ACTIVE")
                .build();
        when(invitationRepository.findByInviteCodeIgnoreCase("CIV-ADM-998877")).thenReturn(Optional.of(adminInv));
        when(userRepository.findByEmail("chief.admin@civicops.in")).thenReturn(Optional.empty());
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));
        when(invitationRepository.save(any(Invitation.class))).thenAnswer(inv -> inv.getArgument(0));

        mockMvc.perform(get("/auth/invitations/validate").param("code", "CIV-ADM-998877"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.valid").value(true))
                .andExpect(jsonPath("$.targetRole").value("ADMIN"));

        String acceptPayload = """
                {
                  "inviteCode": "CIV-ADM-998877",
                  "name": "Ananya Iyer",
                  "email": "chief.admin@civicops.in",
                  "phone": "+91 98000 11223",
                  "password": "StrongPassword123"
                }
                """;
        mockMvc.perform(post("/auth/accept-invitation")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(acceptPayload))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.approvalStatus").value("APPROVED"))
                .andExpect(jsonPath("$.token").isNotEmpty())
                .andExpect(jsonPath("$.user.activeRole").value("ADMIN"));
    }

    @Test
    @WithMockUser(roles = "MANAGEMENT")
    void testManagementCannotIssueAdminInvitation() throws Exception {
        User mgmtActor = User.builder()
                .id("usr-mgmt-1").name("Suresh Patel").email("suresh@civicops.in")
                .role(Role.MANAGEMENT).active(true).approvalStatus("APPROVED").build();
        when(auditService.requireCurrentUser()).thenReturn(mgmtActor);

        String payload = """
                {"targetRole": "ADMIN", "invitedEmail": "escalate@civicops.in"}
                """;
        mockMvc.perform(post("/users/invitations")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isForbidden());
    }
}
