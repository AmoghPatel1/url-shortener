# Learnings — URL Shortener Project

Decisions made, problems hit, and things worth knowing for the next session or a future project.

---

## Deviations from the spec (intentional)

| Spec said | We did | Why |
|-----------|--------|-----|
| Java 17 | **Java 21** | Latest LTS; virtual threads available if needed |
| PostgreSQL port 5432 | **Port 5433** | Local Postgres install occupied 5432 |
| App port 8080 | **Port 8081** | Avoids clash with anything already on 8080 |
| `BIGSERIAL PRIMARY KEY` | `BIGINT GENERATED ALWAYS AS IDENTITY` | SQL-standard; prevents accidental manual ID inserts |
| Inline `UNIQUE` on `short_code` | Separate `CREATE UNIQUE INDEX` | Explicit index name (`idx_short_urls_short_code`) — easier to reference in future migrations or DROP |
| `VARCHAR(10)` for short_code | `VARCHAR(20)` | Headroom if code length ever increases without a migration |
| `TIMESTAMPTZ` columns | `TIMESTAMP` (no tz) | Simpler; UTC enforced at the JPA layer via `spring.jpa.properties.hibernate.jdbc.time_zone=UTC` and Jackson's `spring.jackson.time-zone=UTC` |
| `OffsetDateTime` in entity | `LocalDateTime` | Consistent with the TIMESTAMP column; no offset information is stored |
| CORS for `localhost:3000` only | Also allows `localhost:5173` | Vite defaults to 5173; adding both now avoids friction when the Next.js frontend starts |

---

## Architecture decisions

### Short code generation
- 6-char Base62 via `SecureRandom` → 62^6 ≈ 56 billion combinations; collision probability is negligible
- `ShortCodeGenerator` is a `@Component` that queries the DB (`existsByShortCode`) and retries up to 10 times
- Because it takes a repository dependency, mock it separately in service unit tests — don't let it go to DB

### Transaction strategy
- **Writes** (`create`, `update`, `delete`, `incrementAccessCount`): `@Transactional`
- **Reads** (`getByShortCode`, `getStats`): `@Transactional(readOnly = true)` — skips Hibernate dirty-checking and permits read-replica routing in the future

### Timestamps
- `@PrePersist` sets both `createdAt` and `updatedAt` on insert
- `@PreUpdate` refreshes only `updatedAt`
- `createdAt` is `updatable = false` — Hibernate never touches it after insert
- UTC enforced via JPA and Jackson config, not the column type

### Error handling
- All exceptions handled centrally in `GlobalExceptionHandler` (`@RestControllerAdvice`)
- `UrlNotFoundException` → 404, `MethodArgumentNotValidException` → 400 with field map, generic `Exception` → 500
- **Watch out:** Spring 6.1+ throws `NoResourceFoundException` for unmatched routes. This hits the generic handler and returns 500, not 404. Add explicit handling for it if a clean 404 for unknown routes matters.

---

## Testing strategy

### Four layers
| Layer | Class | Tools |
|-------|-------|-------|
| Unit — generator | `ShortCodeGeneratorTest` | Pure JUnit; no mocks needed |
| Unit — service | `UrlShortenerServiceTest` | Mockito; mocks `ShortUrlRepository` + `ShortCodeGenerator` |
| Integration — API | `UrlShortenerControllerIT` | `@SpringBootTest(RANDOM_PORT)` + Testcontainers PostgreSQL + `TestRestTemplate` + `@ActiveProfiles("test")` |
| Integration — cache | `RedisCacheIT` | `@SpringBootTest(RANDOM_PORT)` + Testcontainers PostgreSQL + Redis + `@SpyBean ShortUrlRepository` — no test profile |

### Test profile trick
`application-test.properties` disables Redis entirely so the test suite doesn't need a running Redis instance:
```properties
spring.cache.type=none
spring.autoconfigure.exclude=\
  org.springframework.boot.autoconfigure.data.redis.RedisAutoConfiguration,\
  org.springframework.boot.autoconfigure.data.redis.RedisReactiveAutoConfiguration
```
Cache annotations become no-ops. `RedisCacheIT` intentionally does NOT use `@ActiveProfiles("test")` — it needs real caching and overrides all coordinates via `@DynamicPropertySource`.

### Testcontainers pattern — dual containers (Postgres + Redis)
```java
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
    registry.add("spring.datasource.url",  () -> jdbcUrl);
    registry.add("spring.datasource.username", postgres::getUsername);
    registry.add("spring.datasource.password", postgres::getPassword);
    registry.add("spring.flyway.url",      () -> jdbcUrl);
    registry.add("spring.flyway.user",     postgres::getUsername);
    registry.add("spring.flyway.password", postgres::getPassword);
    registry.add("spring.data.redis.host", redis::getHost);
    registry.add("spring.data.redis.port", () -> redis.getMappedPort(6379).toString());
}
```

### UTC timezone in IT tests
All IT test classes must include:
```java
static {
    java.util.TimeZone.setDefault(java.util.TimeZone.getTimeZone("UTC"));
}
```
Without this, the JVM's system timezone (e.g. `Asia/Calcutta`) is passed to the PostgreSQL JDBC driver which rejects it, causing context load failure before any tests run.

### Surefire does not pick up `*IT.java` by default
Maven Surefire's default includes only match `*Test.java` and `*Tests.java`. Add an explicit `<includes>` block to `pom.xml`:
```xml
<plugin>
    <groupId>org.apache.maven.plugins</groupId>
    <artifactId>maven-surefire-plugin</artifactId>
    <configuration>
        <includes>
            <include>**/*Test.java</include>
            <include>**/*Tests.java</include>
            <include>**/*IT.java</include>
        </includes>
    </configuration>
</plugin>
```
Without this, `UrlShortenerControllerIT` and `RedisCacheIT` are silently skipped by `./mvnw test`.

---

## Known gaps to address

1. **`incrementAccessCount` has no REST endpoint** — the service method exists but nothing calls it from HTTP. `accessCount` will stay at 0 until the redirect endpoint (Phase 8) or a dedicated endpoint is added.

2. ~~**No Redis caching tests**~~ ✅ Done in Phase 6 — `RedisCacheIT` covers cache hit, eviction on update, eviction on delete.

3. **`NoResourceFoundException` returns 500** — Spring 6.1+ maps unmatched routes through the static resource handler; the generic `Exception` handler catches it. Add an explicit handler if this matters.

4. **Manual verification (Phase 5 checklist)** — the automated tests pass but the curl/browser smoke-test checklist has not been run against a live stack.

---

## Flyway notes

- `spring.jpa.hibernate.ddl-auto=validate` — Hibernate validates against the existing schema; it will **never** create or alter tables
- All DDL goes through Flyway migrations in `src/main/resources/db/migration/`
- Migration naming: `V{version}__{description}.sql` (double underscore)
- To add a column: create a new migration file, never edit an existing one

---

## Phase 6 — Redis caching (done)

### What was implemented

- `spring-boot-starter-data-redis` added to `pom.xml`
- `@EnableCaching` on `UrlshortenerApplication`
- `CacheConfig` bean with `GenericJackson2JsonRedisSerializer` (see details below)
- `@Cacheable(value = "urls", key = "#code")` on `getByShortCode`
- `@CacheEvict(value = "urls", key = "#code")` on `updateShortUrl` and `deleteShortUrl`
- `getStats` and `incrementAccessCount` intentionally uncached — `getStats` always returns live DB data; `accessCount` in the `getByShortCode` cache is allowed to be slightly stale

### Redis serialization — `GenericJackson2JsonRedisSerializer` with `LocalDateTime`

The no-arg `new GenericJackson2JsonRedisSerializer()` fails with `SerializationException` when the cached DTO contains `LocalDateTime` fields. Fix: construct it with a configured `ObjectMapper`:

```java
PolymorphicTypeValidator ptv = BasicPolymorphicTypeValidator
        .builder()
        .allowIfSubType("com.example.urlshortener.dto")  // whitelist own DTO package only
        .build();

ObjectMapper objectMapper = new ObjectMapper();
objectMapper.registerModule(new JavaTimeModule());
objectMapper.disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
objectMapper.activateDefaultTyping(ptv, ObjectMapper.DefaultTyping.NON_FINAL);

return RedisCacheConfiguration.defaultCacheConfig()
        .serializeValuesWith(RedisSerializationContext.SerializationPair
                .fromSerializer(new GenericJackson2JsonRedisSerializer(objectMapper)));
```

**Do NOT use `allowIfSubType(Object.class)`** — that makes the validator a no-op and opens gadget-chain attack vectors. Use a package prefix (`"com.example.urlshortener.dto"`) or `allowIfBaseType(SpecificClass.class)`.

**Note:** `allowIfBaseType(ShortenResponse.class)` does NOT work here — Jackson checks the declared type at deserialization time (which is `Object`, not `ShortenResponse`), causing `InvalidTypeIdException`. Package-prefix whitelist is the correct pattern.

**Note:** This `ObjectMapper` is isolated from Spring MVC's Jackson config. `spring.jackson.*` settings do not apply to it. Register `JavaTimeModule` explicitly and disable timestamp serialization manually.

### Cache-hit testing: spy on the repository, not the service

```java
// WRONG — spy sits outside the caching proxy boundary
@SpyBean
private UrlShortenerService urlShortenerService;
verify(urlShortenerService, times(1)).getByShortCode(code); // always observes 2 calls

// CORRECT — spy sits inside the caching proxy boundary
@SpyBean
private ShortUrlRepository shortUrlRepository;
verify(shortUrlRepository, times(1)).findByShortCode(code); // 1 on miss, 0 on hit
```

Spring's caching proxy wraps the service bean. A spy on the service intercepts calls before the cache can short-circuit them. A spy on the repository is inside the cache boundary — on a cache hit, the method never reaches the repository.
