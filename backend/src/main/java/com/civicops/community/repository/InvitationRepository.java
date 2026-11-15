package com.civicops.community.repository;

import com.civicops.community.model.Invitation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface InvitationRepository extends JpaRepository<Invitation, String> {
    Optional<Invitation> findByInviteCodeIgnoreCase(String inviteCode);
    List<Invitation> findAllByOrderByCreatedAtDesc();
}
