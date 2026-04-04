package com.example.urlshortener.controller;

import com.example.urlshortener.dto.ShortenRequest;
import com.example.urlshortener.dto.ShortenResponse;
import com.example.urlshortener.service.UrlShortenerService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@Slf4j
@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class UrlShortenerController {

    private final UrlShortenerService urlShortenerService;

    // ── POST /api/shorten ─────────────────────────────
    /**
     * Creates a new short URL.
     * Returns 201 Created with the ShortenResponse body.
     */
    @PostMapping("/sorten")
    public ResponseEntity<ShortenResponse> shorten(@Valid @RequestBody ShortenRequest shortenRequest) {
        log.info("POST /api/shorten - url: {}", shortenRequest.getUrl());

        ShortenResponse response = urlShortenerService.createShortUrl(shortenRequest);

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(response);
    }

    // ── GET /api/shorten/{code} ───────────────────────
    /**
     * Fetches a short URL by its short code.
     * Returns 200 OK with the ShortenResponse body.
     */
    @GetMapping("/shorten/{code}")
    public ResponseEntity<ShortenResponse> getByShortCode(@PathVariable String code) {
        log.info("GET /api/shorten/{}", code);

        ShortenResponse response = urlShortenerService.getByShortCode(code);

        return ResponseEntity.ok(response);
    }

    // ── PUT /api/shorten/{code} ───────────────────────
    /**
     * Updates the original URL for an existing short code.
     * Returns 200 OK with the updated ShortenResponse body.
     */
    @PutMapping("/shorten/{code}")
    public ResponseEntity<ShortenResponse> updateShortUrl(@PathVariable String code, @Valid @RequestBody ShortenRequest request) {
        log.info("PUT /api/shorten/{} — new url: {}", code, request.getUrl());

        ShortenResponse response = urlShortenerService.updateShortUrl(code, request);

        return ResponseEntity.ok(response);
    }

    // ── DELETE /api/shorten/{code} ────────────────────
    /**
     * Deletes a short URL by its short code.
     * Returns 204 No Content on success.
     */
    @DeleteMapping("/shorten/{code}")
    public ResponseEntity<Void> deleteShortUrl(@PathVariable String code) {
        log.info("DELETE /api/shorten/{}", code);

        urlShortenerService.deleteShortUrl(code);

        return ResponseEntity
                .noContent()
                .build();
    }

    @GetMapping("/shorten/{code}/stats")
    public ResponseEntity<ShortenResponse> getStats(@PathVariable String code) {
        log.info("GET /api/shorten/{}", code);

        ShortenResponse response = urlShortenerService.getStats(code);

        return ResponseEntity.ok(response);
    }
}
