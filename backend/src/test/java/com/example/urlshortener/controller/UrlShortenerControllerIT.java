package com.example.urlshortener.controller;

import com.example.urlshortener.dto.ShortenRequest;
import com.example.urlshortener.dto.ShortenResponse;
import com.example.urlshortener.entity.ShortUrl;
import com.example.urlshortener.repository.ShortUrlRepository;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.http.*;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.util.Objects;

import static org.assertj.core.api.Assertions.assertThat;

@Testcontainers
@ActiveProfiles("test")
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@DisplayName("UrlShortenerController Integration Tests")
class UrlShortenerControllerIT {

    static {
        java.util.TimeZone.setDefault(java.util.TimeZone.getTimeZone("UTC"));
    }

    // ── Inject the random port Spring Boot chose ──────
    @LocalServerPort
    private int port;

    // ── Build full URL — required in Spring Boot 3.3.x ─
    private String url(String path) {
        return "http://localhost:" + port + path;
    }

    private static final String BASE         = "/api/shorten";
    private static final String ORIGINAL_URL = "https://www.google.com";
    private static final String UPDATED_URL  = "https://www.github.com";

    @Container
    static PostgreSQLContainer<?> postgres =
            new PostgreSQLContainer<>("postgres:15")
                    .withDatabaseName("urlshortener_test")
                    .withUsername("postgres")
                    .withPassword("postgres");

    @DynamicPropertySource
    static void overrideProperties(DynamicPropertyRegistry registry) {
        // ✅ getJdbcUrl() already has ?loggerLevel=OFF so we append with &
        String jdbcUrl = postgres.getJdbcUrl() + "&TimeZone=UTC";
        System.out.println(">>> JDBC URL: " + jdbcUrl);

        registry.add("spring.datasource.url",      () -> jdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
        registry.add("spring.flyway.url",          () -> jdbcUrl);
        registry.add("spring.flyway.user",         postgres::getUsername);
        registry.add("spring.flyway.password",     postgres::getPassword);
        registry.add("spring.jpa.properties.hibernate.jdbc.time_zone", () -> "UTC");
    }

    @Autowired
    private TestRestTemplate restTemplate;

    @Autowired
    private ShortUrlRepository repository;

    @BeforeEach
    void cleanUp() {
        repository.deleteAll();
    }

    // ════════════════════════════════════════════════
    // POST /api/shorten
    // ════════════════════════════════════════════════
    @Nested
    @DisplayName("POST /api/shorten")
    class PostShorten {

        @Test
        @DisplayName("Should return 201 Created with valid ShortenResponse")
        void shouldReturn201OnCreate() {
            ResponseEntity<ShortenResponse> response = post();

            assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);

            ShortenResponse body = response.getBody();
            assertThat(body).isNotNull();
            assertThat(body.getId()).isNotNull();
            assertThat(body.getUrl()).isEqualTo(ORIGINAL_URL);
            assertThat(body.getShortCode()).isNotBlank().hasSize(6);
            assertThat(body.getAccessCount()).isEqualTo(0L);
            assertThat(body.getCreatedAt()).isNotNull();
            assertThat(body.getUpdatedAt()).isNotNull();
        }

        @Test
        @DisplayName("Should return 400 for blank URL")
        void shouldReturn400ForBlankUrl() {
            ResponseEntity<String> response = restTemplate.postForEntity(
                    url(BASE), requestEntity(""), String.class);

            assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        }

        @Test
        @DisplayName("Should return 400 for invalid URL format")
        void shouldReturn400ForInvalidUrl() {
            ResponseEntity<String> response = restTemplate.postForEntity(
                    url(BASE), requestEntity("not-a-valid-url"), String.class);

            assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        }

        @Test
        @DisplayName("Should persist entity to database after creation")
        void shouldPersistToDatabase() {
            String shortCode = Objects.requireNonNull(post().getBody()).getShortCode();

            assertThat(repository.existsByShortCode(shortCode)).isTrue();
        }

    }

    // ════════════════════════════════════════════════
    // GET /api/shorten/{code}
    // ════════════════════════════════════════════════
    @Nested
    @DisplayName("GET /api/shorten/{code}")
    class GetShorten {

        @Test
        @DisplayName("Should return 200 OK for existing code")
        void shouldReturn200ForExistingCode() {
            String shortCode = Objects.requireNonNull(post().getBody()).getShortCode();

            ResponseEntity<ShortenResponse> response = restTemplate.getForEntity(
                    url(BASE + "/" + shortCode), ShortenResponse.class);

            assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
            assertThat(response.getBody()).isNotNull();
            assertThat(response.getBody().getShortCode()).isEqualTo(shortCode);
            assertThat(response.getBody().getUrl()).isEqualTo(ORIGINAL_URL);
        }

        @Test
        @DisplayName("Should return 404 for non-existent short code")
        void shouldReturn404ForNonExistentCode() {
            ResponseEntity<String> response = restTemplate.getForEntity(
                    url(BASE + "/nonexistent"), String.class);

            assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        }

    }

    // ════════════════════════════════════════════════
    // PUT /api/shorten/{code}
    // ════════════════════════════════════════════════
    @Nested
    @DisplayName("PUT /api/shorten/{code}")
    class PutShorten {

        @Test
        @DisplayName("Should return 200 OK with updated URL")
        void shouldReturn200WithUpdatedUrl() {
            String shortCode = Objects.requireNonNull(post().getBody()).getShortCode();

            ResponseEntity<ShortenResponse> response = put(shortCode);

            assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
            assertThat(response.getBody()).isNotNull();
            assertThat(response.getBody().getUrl()).isEqualTo(UPDATED_URL);
            assertThat(response.getBody().getShortCode()).isEqualTo(shortCode);
        }

        @Test
        @DisplayName("Should persist updated URL to database")
        void shouldPersistUpdatedUrl() {
            String shortCode = Objects.requireNonNull(post().getBody()).getShortCode();
            put(shortCode);

            String storedUrl = repository.findByShortCode(shortCode)
                    .map(ShortUrl::getOriginalUrl)
                    .orElseThrow();

            assertThat(storedUrl).isEqualTo(UPDATED_URL);
        }

        @Test
        @DisplayName("Should return 404 when updating non-existent code")
        void shouldReturn404ForNonExistentCode() {
            ResponseEntity<String> response = restTemplate.exchange(
                    url(BASE + "/nonexistent"),
                    HttpMethod.PUT,
                    requestEntity("https://www.example.com"),
                    String.class
            );

            assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        }

        @Test
        @DisplayName("Should return 400 for invalid URL on update")
        void shouldReturn400ForInvalidUrlOnUpdate() {
            String shortCode = Objects.requireNonNull(post().getBody()).getShortCode();

            ResponseEntity<String> response = restTemplate.exchange(
                    url(BASE + "/" + shortCode),
                    HttpMethod.PUT,
                    requestEntity("not-a-url"),
                    String.class
            );

            assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        }

    }

    // ════════════════════════════════════════════════
    // DELETE /api/shorten/{code}
    // ════════════════════════════════════════════════
    @Nested
    @DisplayName("DELETE /api/shorten/{code}")
    class DeleteShorten {

        @Test
        @DisplayName("Should return 204 No Content on successful delete")
        void shouldReturn204OnDelete() {
            String shortCode = Objects.requireNonNull(post().getBody()).getShortCode();

            ResponseEntity<Void> response = restTemplate.exchange(
                    url(BASE + "/" + shortCode),
                    HttpMethod.DELETE, null, Void.class);

            assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
        }

        @Test
        @DisplayName("Should remove entity from DB after delete")
        void shouldRemoveFromDatabase() {
            String shortCode = Objects.requireNonNull(post().getBody()).getShortCode();

            restTemplate.exchange(
                    url(BASE + "/" + shortCode),
                    HttpMethod.DELETE, null, Void.class);

            assertThat(repository.existsByShortCode(shortCode)).isFalse();
        }

        @Test
        @DisplayName("Should return 404 when deleting non-existent code")
        void shouldReturn404ForNonExistentCode() {
            ResponseEntity<String> response = restTemplate.exchange(
                    url(BASE + "/nonexistent"),
                    HttpMethod.DELETE, null, String.class);

            assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        }

        @Test
        @DisplayName("Should return 404 on GET after delete")
        void shouldReturn404OnGetAfterDelete() {
            String shortCode = Objects.requireNonNull(post().getBody()).getShortCode();

            restTemplate.exchange(
                    url(BASE + "/" + shortCode),
                    HttpMethod.DELETE, null, Void.class);

            ResponseEntity<String> response = restTemplate.getForEntity(
                    url(BASE + "/" + shortCode), String.class);

            assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        }

    }

    // ════════════════════════════════════════════════
    // STATS /api/shorten/{code}/stats
    // ════════════════════════════════════════════════
    @Nested
    @DisplayName("GET /api/shorten/{code}/stats")
    class Stats {

        @Test
        @DisplayName("Should return 200 OK with accessCount of 0 on a freshly created URL")
        void shouldReturn200WithAccessCount() {
            String shortCode = Objects.requireNonNull(post().getBody()).getShortCode();

            ResponseEntity<ShortenResponse> response = restTemplate.getForEntity(
                    url(BASE + "/" + shortCode + "/stats"), ShortenResponse.class);

            assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
            assertThat(response.getBody()).isNotNull();
            assertThat(response.getBody().getAccessCount()).isEqualTo(0L);
        }

        @Test
        @DisplayName("Should return 404 for non-existent code on stats")
        void shouldReturn404ForNonExistentCode() {
            ResponseEntity<String> response = restTemplate.getForEntity(
                    url(BASE + "/nonexistent/stats"), String.class);

            assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        }

    }

    // ════════════════════════════════════════════════
    // FULL LIFECYCLE
    // ════════════════════════════════════════════════
    @Nested
    @DisplayName("Full POST → GET → PUT → DELETE lifecycle")
    class FullLifecycle {

        @Test
        @DisplayName("Should complete full CRUD lifecycle successfully")
        void shouldCompleteFullLifecycle() {

            // ── Step 1: POST ──────────────────────────
            ResponseEntity<ShortenResponse> createResponse = post();
            assertThat(createResponse.getStatusCode()).isEqualTo(HttpStatus.CREATED);
            assertThat(createResponse.getBody()).isNotNull();
            String shortCode = createResponse.getBody().getShortCode();
            assertThat(shortCode).isNotBlank().hasSize(6);

            // ── Step 2: GET ───────────────────────────
            ResponseEntity<ShortenResponse> getResponse = restTemplate.getForEntity(
                    url(BASE + "/" + shortCode), ShortenResponse.class);
            assertThat(getResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
            assertThat(getResponse.getBody()).isNotNull();
            assertThat(getResponse.getBody().getUrl()).isEqualTo(ORIGINAL_URL);

            // ── Step 3: PUT ───────────────────────────
            ResponseEntity<ShortenResponse> updateResponse = put(shortCode);
            assertThat(updateResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
            assertThat(updateResponse.getBody()).isNotNull();
            assertThat(updateResponse.getBody().getUrl()).isEqualTo(UPDATED_URL);
            assertThat(updateResponse.getBody().getShortCode()).isEqualTo(shortCode);

            // ── Step 4: GET — verify update ───────────
            ResponseEntity<ShortenResponse> verifyResponse = restTemplate.getForEntity(
                    url(BASE + "/" + shortCode), ShortenResponse.class);
            assertThat(verifyResponse.getBody()).isNotNull();
            assertThat(verifyResponse.getBody().getUrl()).isEqualTo(UPDATED_URL);

            // ── Step 5: DELETE ────────────────────────
            ResponseEntity<Void> deleteResponse = restTemplate.exchange(
                    url(BASE + "/" + shortCode),
                    HttpMethod.DELETE, null, Void.class);
            assertThat(deleteResponse.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);

            // ── Step 6: GET — verify 404 ──────────────
            ResponseEntity<String> notFoundResponse = restTemplate.getForEntity(
                    url(BASE + "/" + shortCode), String.class);
            assertThat(notFoundResponse.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);

            // ── Step 7: DB — verify gone ──────────────
            assertThat(repository.existsByShortCode(shortCode)).isFalse();
        }

    }

    // ════════════════════════════════════════════════
    // PRIVATE HELPERS
    // ════════════════════════════════════════════════

    private ResponseEntity<ShortenResponse> post() {
        return restTemplate.postForEntity(
                url(BASE), requestEntity(ORIGINAL_URL), ShortenResponse.class);
    }

    private ResponseEntity<ShortenResponse> put(String shortCode) {
        return restTemplate.exchange(
                url(BASE + "/" + shortCode),
                HttpMethod.PUT,
                requestEntity(UPDATED_URL),
                ShortenResponse.class
        );
    }

    private HttpEntity<ShortenRequest> requestEntity(String url) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        return new HttpEntity<>(new ShortenRequest(url), headers);
    }

}