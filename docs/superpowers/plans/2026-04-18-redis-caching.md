# Phase 6 — Redis Caching Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire up Spring Cache with Redis so `getByShortCode` is served from Redis after the first DB read, with correct eviction on update and delete.

**Architecture:** Add `spring-boot-starter-data-redis`, configure a `RedisCacheConfiguration` bean with Jackson JSON serialization, add `@EnableCaching` to the main class, and annotate three service methods. Tests use Testcontainers for both Postgres and Redis so no local services are needed.

**Tech Stack:** Spring Boot 3.3 · Spring Cache · Lettuce (default Redis client) · `GenericJackson2JsonRedisSerializer` · Testcontainers `GenericContainer("redis:7-alpine")`

---

## File Map

| Action | File |
|--------|------|
| Modify | `backend/pom.xml` |
| Modify | `backend/src/main/resources/application.properties` |
| Modify | `backend/src/main/java/com/example/urlshortener/UrlshortenerApplication.java` |
| Create | `backend/src/main/java/com/example/urlshortener/config/CacheConfig.java` |
| Modify | `backend/src/main/java/com/example/urlshortener/service/UrlShortenerService.java` |
| Create | `backend/src/test/java/com/example/urlshortener/cache/RedisCacheIT.java` |

---

## Task 1: Create feature branch

- [ ] **Step 1: Create and switch to feature branch**

```bash
cd backend/..
git checkout -b feature/phase-6-redis-caching
```

Expected: `Switched to a new branch 'feature/phase-6-redis-caching'`

---

## Task 2: Add `spring-boot-starter-data-redis` dependency

**Files:**
- Modify: `backend/pom.xml`

- [ ] **Step 1: Add the dependency**

In `backend/pom.xml`, add inside `<dependencies>` after the `spring-boot-starter-cache` block:

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-data-redis</artifactId>
</dependency>
```

- [ ] **Step 2: Verify dependency resolves**

```bash
cd backend && ./mvnw dependency:resolve -q
```

Expected: BUILD SUCCESS (no errors)

- [ ] **Step 3: Verify existing tests still pass**

```bash
cd backend && ./mvnw test
```

Expected: All tests GREEN. The test profile excludes Redis auto-configuration so no Redis connection is attempted.

---

## Task 3: Write failing Redis cache integration tests (TDD)

**Files:**
- Create: `backend/src/test/java/com/example/urlshortener/cache/RedisCacheIT.java`

- [ ] **Step 1: Create the test class**

```java
package com.example.urlshortener.cache;

import com.example.urlshortener.dto.ShortenRequest;
import com.example.urlshortener.dto.ShortenResponse;
import com.example.urlshortener.repository.ShortUrlRepository;
import com.example.urlshortener.service.UrlShortenerService;
import org.junit.jupiter.api.BeforeEach;
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

@Testcontainers
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class RedisCacheIT {

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

    @Autowired
    private ShortUrlRepository repository;

    @SpyBean
    private UrlShortenerService urlShortenerService;

    @BeforeEach
    void cleanUp() {
        repository.deleteAll();
    }

    // ── Cache hit ─────────────────────────────────────────────────────────────
    @Test
    void getByShortCode_secondCallServedFromCache() {
        String code = createUrl("https://www.example.com");

        // First GET — populates cache, calls service
        restTemplate.getForEntity(url("/api/shorten/" + code), ShortenResponse.class);
        // Second GET — must be served from cache, service must NOT be called again
        restTemplate.getForEntity(url("/api/shorten/" + code), ShortenResponse.class);

        verify(urlShortenerService, times(1)).getByShortCode(code);
    }

    // ── Eviction on update ────────────────────────────────────────────────────
    @Test
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
```

- [ ] **Step 2: Run the new test to verify it fails**

```bash
cd backend && ./mvnw test -Dtest=RedisCacheIT
```

Expected: `getByShortCode_secondCallServedFromCache` FAILS — the service is called twice because there is no caching yet. The eviction tests may pass or fail depending on context setup.

---

## Task 4: Wire up caching (make tests pass)

**Files:**
- Modify: `backend/src/main/resources/application.properties`
- Modify: `backend/src/main/java/com/example/urlshortener/UrlshortenerApplication.java`
- Create: `backend/src/main/java/com/example/urlshortener/config/CacheConfig.java`
- Modify: `backend/src/main/java/com/example/urlshortener/service/UrlShortenerService.java`

- [ ] **Step 1: Add cache properties to `application.properties`**

Append to `backend/src/main/resources/application.properties`:

```properties
# Cache Configuration
spring.cache.type=redis
spring.cache.redis.time-to-live=3600000
```

- [ ] **Step 2: Add `@EnableCaching` to the main application class**

Replace the content of `backend/src/main/java/com/example/urlshortener/UrlshortenerApplication.java`:

```java
package com.example.urlshortener;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cache.annotation.EnableCaching;

@EnableCaching
@SpringBootApplication
public class UrlshortenerApplication {

    public static void main(String[] args) {
        SpringApplication.run(UrlshortenerApplication.class, args);
    }
}
```

- [ ] **Step 3: Create `CacheConfig.java`**

Create `backend/src/main/java/com/example/urlshortener/config/CacheConfig.java`:

```java
package com.example.urlshortener.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.cache.RedisCacheConfiguration;
import org.springframework.data.redis.serializer.GenericJackson2JsonRedisSerializer;
import org.springframework.data.redis.serializer.RedisSerializationContext;

@Configuration
public class CacheConfig {

    @Bean
    public RedisCacheConfiguration redisCacheConfiguration() {
        return RedisCacheConfiguration.defaultCacheConfig()
                .serializeValuesWith(
                        RedisSerializationContext.SerializationPair
                                .fromSerializer(new GenericJackson2JsonRedisSerializer()));
    }
}
```

- [ ] **Step 4: Add cache annotations to `UrlShortenerService`**

In `backend/src/main/java/com/example/urlshortener/service/UrlShortenerService.java`, add three annotations and two imports:

Add imports after the existing import block:
```java
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
```

Add `@Cacheable` to `getByShortCode`:
```java
@Cacheable(value = "urls", key = "#code")
@Transactional(readOnly = true)
public ShortenResponse getByShortCode(String code) {
```

Add `@CacheEvict` to `updateShortUrl`:
```java
@CacheEvict(value = "urls", key = "#code")
@Transactional
public ShortenResponse updateShortUrl(String code, ShortenRequest shortenRequest) {
```

Add `@CacheEvict` to `deleteShortUrl`:
```java
@CacheEvict(value = "urls", key = "#code")
@Transactional
public void deleteShortUrl(String code) {
```

`incrementAccessCount` and `getStats` get no cache annotations (by design — see spec).

- [ ] **Step 5: Run the Redis IT tests to verify they pass**

```bash
cd backend && ./mvnw test -Dtest=RedisCacheIT
```

Expected: All 3 tests GREEN.

---

## Task 5: Verify full test suite and commit

- [ ] **Step 1: Run all tests**

```bash
cd backend && ./mvnw test
```

Expected: All tests GREEN. `RedisCacheIT` passes with real Redis. `UrlShortenerControllerIT` and unit tests pass with the `test` profile (Redis excluded).

- [ ] **Step 2: Commit**

```bash
cd ..
git add backend/pom.xml \
        backend/src/main/resources/application.properties \
        backend/src/main/java/com/example/urlshortener/UrlshortenerApplication.java \
        backend/src/main/java/com/example/urlshortener/config/CacheConfig.java \
        backend/src/main/java/com/example/urlshortener/service/UrlShortenerService.java \
        backend/src/test/java/com/example/urlshortener/cache/RedisCacheIT.java
git commit -m "feat: add Redis caching for getByShortCode with eviction on update/delete"
```
