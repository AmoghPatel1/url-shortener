package com.example.urlshortener.repository;

import com.example.urlshortener.entity.ShortUrl;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface ShortUrlRepository extends JpaRepository<ShortUrl, Long> {

    Optional<ShortUrl> findByShortCode(String shortCode);

    Boolean existsByShortCode(String shortCode);

    @Modifying
    @Query("UPDATE ShortUrl s SET s.accessCount = s.accessCount + 1 WHERE s.shortCode = :shortCode")
    int incrementAccessCount(@Param("shortCode") String shortCode);
}
