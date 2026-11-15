package com.civicops.community.security;

import com.civicops.community.controller.AdminUserController;
import com.civicops.community.controller.AssetInventoryController;
import com.civicops.community.repository.*;
import com.civicops.community.service.AuditService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = {AdminUserController.class, AssetInventoryController.class})
@Import({SecurityConfig.class, JwtAuthenticationFilter.class, JwtTokenProvider.class})
@TestPropertySource(properties = {
        "app.jwt.secret=TestOnlyJwtSigningSecretKeyForCivicOpsWebMvcTests123456",
        "app.jwt.expiration-ms=3600000"
})
class SecurityRbacTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean private UserRepository userRepository;
    @MockBean private RevokedTokenRepository revokedTokenRepository;
    @MockBean private AuditService auditService;
    @MockBean private AssetRepository assetRepository;
    @MockBean private SparePartRepository sparePartRepository;
    @MockBean private SpareRequisitionRepository requisitionRepository;
    @MockBean private InventoryMovementRepository movementRepository;
    @MockBean private WorkOrderRepository workOrderRepository;

    @Test
    void testUnauthenticatedRequestReturns401() throws Exception {
        mockMvc.perform(get("/users"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(roles = "RESIDENT")
    void testResidentBlockedFromAdminAndInventoryEndpoints() throws Exception {
        mockMvc.perform(get("/users"))
                .andExpect(status().isForbidden());

        mockMvc.perform(get("/spares"))
                .andExpect(status().isForbidden());

        mockMvc.perform(post("/requisitions/req-01/approve"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void testAdminAllowedOnUsersEndpoint() throws Exception {
        when(userRepository.findAll()).thenReturn(List.of());
        mockMvc.perform(get("/users"))
                .andExpect(status().isOk());
    }
}
