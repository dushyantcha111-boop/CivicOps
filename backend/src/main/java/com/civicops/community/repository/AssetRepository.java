package com.civicops.community.repository;

import com.civicops.community.model.Asset;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AssetRepository extends JpaRepository<Asset, String> {
    Optional<Asset> findByAssetCode(String assetCode);
    List<Asset> findByTower(String tower);
    List<Asset> findByCategory(String category);
}
