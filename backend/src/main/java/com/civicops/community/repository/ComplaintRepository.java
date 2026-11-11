package com.civicops.community.repository;

import com.civicops.community.model.Complaint;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ComplaintRepository extends JpaRepository<Complaint, String> {
    Optional<Complaint> findByTicketNumber(String ticketNumber);
    List<Complaint> findByTower(String tower);
    List<Complaint> findByResidentId(String residentId);
    List<Complaint> findByStatus(Complaint.ComplaintStatus status);

    @Query("SELECT c FROM Complaint c WHERE c.tower = :tower AND c.category = :category AND c.status <> 'CLOSED'")
    List<Complaint> findSimilarActiveComplaints(
            @Param("tower") String tower,
            @Param("category") Complaint.ComplaintCategory category
    );
}
