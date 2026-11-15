package com.civicops.community.repository;

import com.civicops.community.model.CommunityDocument;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CommunityDocumentRepository extends JpaRepository<CommunityDocument, String> {
    List<CommunityDocument> findAllByOrderByUploadedAtDesc();
}
