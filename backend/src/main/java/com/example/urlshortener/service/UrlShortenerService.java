package com.example.urlshortener.service;

import com.example.urlshortener.dto.ShortenRequest;
import com.example.urlshortener.dto.ShortenResponse;
import com.example.urlshortener.entity.ShortUrl;
import com.example.urlshortener.exception.UrlNotFoundException;
import com.example.urlshortener.repository.ShortUrlRepository;
import com.example.urlshortener.util.ShortCodeGenerator;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class UrlShortenerService {

    private final ShortUrlRepository shortUrlRepository;
    private final ShortCodeGenerator shortCodeGenerator;

    // ── Create Short URL ──────────────────────────────
    /**
     * Accepts a long URL, generates a unique short code,
     * persists to DB, and returns the mapped response DTO.
     */
    @Transactional // Write transaction — full Hibernate session
    public ShortenResponse createShortUrl(ShortenRequest shortenRequest) {
        String originalUrl = shortenRequest.getUrl();

        log.info("Creating short URL for: {}", originalUrl);

        // Generate unique short code (collision-safe)
        String shortCode = shortCodeGenerator.generate();

        // Build and persist entity
        ShortUrl shortUrl = ShortUrl.builder()
                .shortCode(shortCode)
                .originalUrl(originalUrl)
                .build();

        ShortUrl saved = shortUrlRepository.save(shortUrl);

        log.info("Short URL created — code: '{}', id: {}", saved.getShortCode(), saved.getId());

        return ShortenResponse.from(saved);
    }

//    Why @Transactional(readOnly = true) on Reads
//    Read-only transaction — tells Hibernate:
//    ✅ Skip dirty checking (no need to track entity changes)
//    ✅ No flush before query (faster)
//    ✅ DB can route to read replica if configured

    // ── Get by Short Code ─────────────────────────────
    /**
     * Looks up a ShortUrl entity by its short code.
     * Throws UrlNotFoundException if not found.
     */
    @Cacheable(value = "urls", key = "#code")
    @Transactional(readOnly = true)
    public ShortenResponse getByShortCode(String code) {
        log.info("Looking up short code: '{}'", code);

        ShortUrl shortUrl = findOrThrow(code);

        return ShortenResponse.from(shortUrl);
    }

    // ── Update ────────────────────────────────────────
    /**
     * Finds entity by shortCode, updates the originalUrl,
     * persists and returns updated ShortenResponse.
     * @PreUpdate on entity automatically refreshes updatedAt.
     */
    @CacheEvict(value = "urls", key = "#code")
    @Transactional
    public ShortenResponse updateShortUrl(String code,  ShortenRequest shortenRequest) {
        log.info("Updating short code '{}' → new URL: {}", code, shortenRequest.getUrl());

        ShortUrl shortUrl = findOrThrow(code);

        shortUrl.setOriginalUrl(shortenRequest.getUrl());

        ShortUrl updated =  shortUrlRepository.save(shortUrl);

        log.info("Short URL updated — code: '{}', id: {}", updated.getShortCode(), updated.getId());

        return ShortenResponse.from(updated);
    }

    // ── Delete ────────────────────────────────────────
    /**
     * Finds entity by shortCode and deletes it from DB.
     * Throws UrlNotFoundException if code doesn't exist.
     */
    @CacheEvict(value = "urls", key = "#code")
    @Transactional
    public void deleteShortUrl(String code) {
        log.info("Deleting short code '{}'", code);

        ShortUrl shortUrl = findOrThrow(code);

        shortUrlRepository.delete(shortUrl);

        log.info("Short URL deleted - code: {}, id - {}", code,  shortUrl.getId());
    }

    // ── Stats ─────────────────────────────────────────
    /**
     * Returns full ShortenResponse including accessCount
     * for analytics/stats endpoint.
     */
    @Transactional(readOnly = true)
    public ShortenResponse getStats(String code) {
        log.info("Getting stats for short code '{}'", code);

        ShortUrl shortUrl = findOrThrow(code);

        log.info("Stats for code '{}' - accessCount: {}", shortUrl.getShortCode(), shortUrl.getAccessCount());

        return ShortenResponse.from(shortUrl);
    }

//    repository.incrementAccessCount()     ← JPQL direct UPDATE
//    ✅ No SELECT before UPDATE
//    ✅ Best for high-traffic redirects
//    ✅ Used in resolveUrl()
//    entity accessCount++ → repository.save()   ← Hibernate managed
//    ✅ Returns updated entity immediately
//    ✅ Best when you need the updated DTO back
//    ✅ Used in incrementAccessCount()

    // ── Increment Access Count ────────────────────────
    /**
     * Increments accessCount by 1 on the entity level.
     * Used when you need Hibernate-managed increment
     * (entity loaded → count++ → saved).
     * Note: For high-traffic redirects, prefer
     * repository.incrementAccessCount() (direct JPQL UPDATE).
     */
    // No @CacheEvict here by design — accessCount in the "urls" cache is intentionally allowed
    // to be slightly stale. getStats() always queries the DB directly for the live count.
    @Transactional
    public ShortenResponse incrementAccessCount(String code) {
        log.info("Incrementing access count for short code '{}'", code);

        ShortUrl shortUrl =  findOrThrow(code);

        shortUrl.setAccessCount(shortUrl.getAccessCount() + 1);

        ShortUrl updated =  shortUrlRepository.save(shortUrl);

        log.info("Access count for '{}' is now: {}", code, updated.getAccessCount());

        return ShortenResponse.from(updated);
    }

    // ── Private Helper ────────────────────────────────
    /**
     * Shared lookup — throws UrlNotFoundException if not found.
     * Keeps all methods DRY.
     */
    private ShortUrl findOrThrow(String shortCode) {
        return shortUrlRepository.findByShortCode(shortCode)
                .orElseThrow(() -> {
                    log.warn("Short code not found: {}", shortCode);
                    return new UrlNotFoundException(shortCode);
                });
    }

}
