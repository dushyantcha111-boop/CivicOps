package com.civicops.community.security;

import com.civicops.community.model.Role;
import com.civicops.community.repository.RevokedTokenRepository;
import com.civicops.community.repository.UserRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;
import java.util.Set;

@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtTokenProvider tokenProvider;
    private final UserRepository userRepository;
    private final RevokedTokenRepository revokedTokenRepository;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        try {
            String jwt = getJwtFromRequest(request);

            if (StringUtils.hasText(jwt) && tokenProvider.validateToken(jwt)) {
                String tokenId = tokenProvider.getTokenId(jwt);
                if (tokenId != null && revokedTokenRepository.existsById(tokenId)) {
                    filterChain.doFilter(request, response);
                    return;
                }

                String email = tokenProvider.getEmailFromJWT(jwt);
                com.civicops.community.model.User appUser = userRepository.findByEmail(email).orElse(null);

                if (appUser != null && !Boolean.FALSE.equals(appUser.getActive()) && appUser.isAccountApproved()) {
                    List<Role> authorizedRoles = appUser.getAuthorizedRoleList();
                    Role effectiveRole = appUser.getRole();
                    if (effectiveRole == null || !authorizedRoles.contains(effectiveRole)) {
                        effectiveRole = authorizedRoles.isEmpty() ? Role.RESIDENT : authorizedRoles.get(0);
                    }

                    Set<SimpleGrantedAuthority> authorities = Set.of(
                            new SimpleGrantedAuthority("ROLE_" + effectiveRole.name())
                    );

                    UserDetails userDetails = new User(appUser.getEmail(), appUser.getPasswordHash(), authorities);
                    UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
                            userDetails, null, userDetails.getAuthorities());
                    authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));

                    SecurityContextHolder.getContext().setAuthentication(authentication);
                }
            }
        } catch (Exception ex) {
            logger.error("Could not set user authentication in security context", ex);
        }

        filterChain.doFilter(request, response);
    }

    public static String extractBearerToken(HttpServletRequest request) {
        String bearerToken = request.getHeader("Authorization");
        if (StringUtils.hasText(bearerToken) && bearerToken.startsWith("Bearer ")) {
            return bearerToken.substring(7);
        }
        return null;
    }

    private String getJwtFromRequest(HttpServletRequest request) {
        return extractBearerToken(request);
    }
}
