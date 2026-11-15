package com.civicops.community.controller;

import com.civicops.community.model.Role;
import com.civicops.community.model.User;
import com.civicops.community.repository.*;
import com.civicops.community.security.JwtAuthenticationFilter;
import com.civicops.community.security.JwtTokenProvider;
import com.civicops.community.security.SecurityConfig;
import com.civicops.community.service.AuditService;
import com.civicops.community.service.MemoryGraphService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = IntelligenceController.class)
@Import({SecurityConfig.class, JwtAuthenticationFilter.class, JwtTokenProvider.class})
@TestPropertySource(properties = {
        "app.jwt.secret=TestOnlyJwtSigningSecretKeyForCivicOpsWebMvcTests123456",
        "app.jwt.expiration-ms=3600000"
})
class MemoryGraphControllerTest {

    @Autowired private MockMvc mockMvc;

    @MockBean private ComplaintRepository complaintRepository;
    @MockBean private AssetRepository assetRepository;
    @MockBean private WorkOrderRepository workOrderRepository;
    @MockBean private PreventiveScheduleRepository preventiveScheduleRepository;
    @MockBean private RecurrenceInvestigationRepository investigationRepository;
    @MockBean private UnitRepository unitRepository;
    @MockBean private UserRepository userRepository;
    @MockBean private RevokedTokenRepository revokedTokenRepository;
    @MockBean private AuditService auditService;
    @MockBean private MemoryGraphService memoryGraphService;

    @Test
    @WithMockUser(roles = "RESIDENT")
    void testResidentCanReadScopedMemoryGraphButCannotMutateLayout() throws Exception {
        User resident = User.builder()
                .id("usr-res-1").name("Rahul Sharma").email("rahul@greenvalley.in")
                .role(Role.RESIDENT).active(true).approvalStatus("APPROVED").build();
        when(auditService.requireCurrentUser()).thenReturn(resident);
        when(memoryGraphService.buildGraph(any(), any(), any(), any(), any())).thenReturn(
                MemoryGraphService.MemoryGraphResponse.builder()
                        .nodes(List.of())
                        .edges(List.of())
                        .totalNodes(0)
                        .totalEdges(0)
                        .scopeRole("RESIDENT")
                        .generatedAt(LocalDateTime.now())
                        .build()
        );

        mockMvc.perform(get("/analytics/memory-graph"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.scopeRole").value("RESIDENT"));

        mockMvc.perform(put("/analytics/memory-graph/layout")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("[]"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(roles = "SECURITY")
    void testSecurityRoleIsBlockedFromMemoryGraph() throws Exception {
        mockMvc.perform(get("/analytics/memory-graph"))
                .andExpect(status().isForbidden());
    }
}
