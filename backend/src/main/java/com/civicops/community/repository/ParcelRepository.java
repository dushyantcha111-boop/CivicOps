package com.civicops.community.repository;

import com.civicops.community.model.Parcel;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ParcelRepository extends JpaRepository<Parcel, String> {
    Optional<Parcel> findByTrackingNumber(String trackingNumber);
    Optional<Parcel> findByPickupOtp(String pickupOtp);
    List<Parcel> findByTowerAndUnitNumber(String tower, String unitNumber);
    List<Parcel> findByStatus(String status);
}
