# Phase 6 — Redis Caching Design

**Date:** 2026-04-18  
**Scope:** Backend only — wire up Spring Cache with Redis for `getByShortCode`

---

## Context

Phases 0–5 are complete. The Spring Boot backend has `spring-boot-starter-cache` on the classpath and Redis configured in `application.properties` (host/port), but `@EnableCaching` is absent and `spring-boot-starter-data-redis` is not yet a dependency. The test profile already excludes Redis auto-configuration, so tests will not break when the dependency is added.

---

## Decisions

| Decision | Choice | Reason |
|----------|--------|--------|
| Serialization | Jackson (`GenericJackson2JsonRedisSerializer`) | Human-readable JSON in Redis; no `Serializable` on DTOs; standard production approach |
| `getStats` caching | Uncached | Always returns live `accessCount` from DB |
| `incrementAccessCount` cache interaction | No annotation | Cache may serve slightly stale `accessCount` in `getByShortCode`; acceptable since `getStats` is the authoritative count source |
| TTL | 1 hour (3600000 ms) | Driven by `spring.cache.redis.time-to-live` property |
| Connection pooling | None (default Lettuce) | Premature until frontend load warrants it |

---

## Changes

### 1. `pom.xml`
Add one dependency (version managed by Spring Boot BOM):
```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-data-redis</artifactId>
</dependency>
```

### 2. `application.properties`
Add two lines:
```properties
spring.cache.type=redis
spring.cache.redis.time-to-live=3600000
```
Redis `host` and `port` already present. Test profile unchanged.

### 3. `UrlshortenerApplication.java`
Add `@EnableCaching`.

### 4. New file: `config/CacheConfig.java`
```java
@Configuration
public class CacheConfig {
    @Bean
    public RedisCacheConfiguration redisCacheConfiguration() {
        return RedisCacheConfiguration.defaultCacheConfig()
                .serializeValuesWith(RedisSerializationContext.SerializationPair
                        .fromSerializer(new GenericJackson2JsonRedisSerializer()));
    }
}
```
TTL flows in from properties — not hardcoded here.

### 5. `UrlShortenerService.java`

| Method | Annotation |
|--------|-----------|
| `getByShortCode` | `@Cacheable(value = "urls", key = "#code")` |
| `updateShortUrl` | `@CacheEvict(value = "urls", key = "#code")` |
| `deleteShortUrl` | `@CacheEvict(value = "urls", key = "#code")` |
| `incrementAccessCount` | none |
| `getStats` | none |

### 6. New test: `RedisCacheIT.java`

`@SpringBootTest(RANDOM_PORT)` + Testcontainers `GenericContainer("redis:7-alpine")`.  
`@DynamicPropertySource` wires `spring.data.redis.host` and `spring.data.redis.port` to the container.  
Uses `@SpyBean ShortUrlRepository` to assert DB call counts.

| Test | Verifies |
|------|---------|
| `getByShortCode_secondCallServedFromCache` | Repository `findByShortCode` called exactly once for two identical GETs |
| `updateShortUrl_evictsCache` | GET after PUT returns updated URL, not stale cached value |
| `deleteShortUrl_evictsCache` | GET after DELETE returns 404, not stale 200 |

---

## What is NOT changing

- `getStats` — no cache annotation, always queries DB
- `incrementAccessCount` — no cache annotation
- Test profile (`application-test.properties`) — unchanged; Redis excluded in all existing tests
- Schema, DTOs, controller, repository — no changes
