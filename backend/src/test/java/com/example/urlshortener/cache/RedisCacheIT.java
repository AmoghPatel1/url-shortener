package com.example.urlshortener.cache;

import com.example.urlshortener.dto.ShortenRequest;
import com.example.urlshortener.dto.ShortenResponse;
import com.example.urlshortener.repository.ShortUrlRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.SpyBean;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.http.*;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;

// Note: intentionally does NOT use @ActiveProfiles("test").
// The test profile excludes Redis and disables caching (spring.cache.type=none).
// This class needs real Redis caching, so it loads the main application.properties
// and overrides datasource + redis coordinates via @DynamicPropertySource.
@Testcontainers
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class RedisCacheIT {

    static {
        java.util.TimeZone.setDefault(java.util.TimeZone.getTimeZone("UTC"));
    }


    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:15")
            .withDatabaseName("urlshortener_test")
            .withUsername("postgres")
            .withPassword("postgres");

    @Container
    @SuppressWarnings("resource")
    static GenericContainer<?> redis = new GenericContainer<>("redis:7-alpine")
            .withExposedPorts(6379);

    @DynamicPropertySource
    static void overrideProperties(DynamicPropertyRegistry registry) {
        String jdbcUrl = postgres.getJdbcUrl() + "&TimeZone=UTC";
        registry.add("spring.datasource.url",      () -> jdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
        registry.add("spring.flyway.url",          () -> jdbcUrl);
        registry.add("spring.flyway.user",         postgres::getUsername);
        registry.add("spring.flyway.password",     postgres::getPassword);
        registry.add("spring.jpa.properties.hibernate.jdbc.time_zone", () -> "UTC");
        registry.add("spring.data.redis.host",     redis::getHost);
        registry.add("spring.data.redis.port",     () -> redis.getMappedPort(6379).toString());
    }

    @LocalServerPort
    private int port;

    @Autowired
    private TestRestTemplate restTemplate;

    @SpyBean
    private ShortUrlRepository shortUrlRepository;

    @BeforeEach
    void cleanUp() {
        shortUrlRepository.deleteAll();
    }

    // ── Cache hit ─────────────────────────────────────────────────────────────
    @Test
    @DisplayName("Second GET for same code should be served from Redis cache")
    void getByShortCode_secondCallServedFromCache() {
        String code = createUrl("https://www.example.com");

        // First GET — populates cache, calls service
        ResponseEntity<ShortenResponse> first = restTemplate.getForEntity(
                url("/api/shorten/" + code), ShortenResponse.class);
        // Second GET — must be served from cache, repository must NOT be called again
        ResponseEntity<ShortenResponse> second = restTemplate.getForEntity(
                url("/api/shorten/" + code), ShortenResponse.class);

        assertThat(first.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(second.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(second.getBody()).isNotNull();
        assertThat(second.getBody().getUrl()).isEqualTo("https://www.example.com");
        verify(shortUrlRepository, times(1)).findByShortCode(code);
    }

    // ── Eviction on update ────────────────────────────────────────────────────
    @Test
    @DisplayName("PUT should evict cache entry and return updated URL on next GET")
    void updateShortUrl_evictsCacheAndReturnsUpdatedUrl() {
        String code = createUrl("https://www.example.com");

        // Populate cache
        restTemplate.getForEntity(url("/api/shorten/" + code), ShortenResponse.class);

        // Update — must evict cache entry
        restTemplate.exchange(
                url("/api/shorten/" + code),
                HttpMethod.PUT,
                requestEntity("https://www.updated.com"),
                ShortenResponse.class);

        // GET after update — must return new URL, not stale cached value
        ResponseEntity<ShortenResponse> response = restTemplate.getForEntity(
                url("/api/shorten/" + code), ShortenResponse.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getUrl()).isEqualTo("https://www.updated.com");
    }

    // ── Eviction on delete ────────────────────────────────────────────────────
    @Test
    @DisplayName("DELETE should evict cache entry so next GET returns 404")
    void deleteShortUrl_evictsCacheAndReturns404() {
        String code = createUrl("https://www.example.com");

        // Populate cache
        restTemplate.getForEntity(url("/api/shorten/" + code), ShortenResponse.class);

        // Delete — must evict cache entry
        restTemplate.exchange(
                url("/api/shorten/" + code),
                HttpMethod.DELETE, null, Void.class);

        // GET after delete — must return 404, not stale 200 from cache
        ResponseEntity<String> response = restTemplate.getForEntity(
                url("/api/shorten/" + code), String.class);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────
    private String createUrl(String longUrl) {
        ShortenResponse body = restTemplate.postForEntity(
                url("/api/shorten"),
                requestEntity(longUrl),
                ShortenResponse.class).getBody();
        assertThat(body).isNotNull();
        return body.getShortCode();
    }

    private String url(String path) {
        return "http://localhost:" + port + path;
    }

    private HttpEntity<ShortenRequest> requestEntity(String longUrl) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        return new HttpEntity<>(new ShortenRequest(longUrl), headers);
    }
}
