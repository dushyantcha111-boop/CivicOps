package com.civicops.community.repository;

import com.civicops.community.model.DuesPayment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DuesPaymentRepository extends JpaRepository<DuesPayment, String> {
    List<DuesPayment> findByUnitIdOrderByPaidAtDesc(String unitId);
    List<DuesPayment> findByResidentIdOrderByPaidAtDesc(String residentId);
}
