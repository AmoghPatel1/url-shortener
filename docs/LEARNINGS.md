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

### Three layers
| Layer | Class | Tools |
|-------|-------|-------|
| Unit — generator | `ShortCodeGeneratorTest` | Pure JUnit; no mocks needed |
| Unit — service | `UrlShortenerServiceTest` | Mockito; mocks `ShortUrlRepository` + `ShortCodeGenerator` |
| Integration | `UrlShortenerControllerIT` | `@SpringBootTest(RANDOM_PORT)` + Testcontainers PostgreSQL + `TestRestTemplate` |

### Test profile trick
`application-test.properties` disables Redis entirely so the test suite doesn't need a running Redis instance — even after Phase 6 wires up caching:
```properties
spring.cache.type=none
spring.autoconfigure.exclude=\
  org.springframework.boot.autoconfigure.data.redis.RedisAutoConfiguration,\
  org.springframework.boot.autoconfigure.data.redis.RedisReactiveAutoConfiguration
```
This means cache annotations become no-ops in tests. To test caching behaviour specifically, add a dedicated IT class with a `GenericContainer("redis:7-alpine")`.

### Testcontainers pattern
```java
@Container
static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:15");

@DynamicPropertySource
static void overrideProps(DynamicPropertyRegistry r) {
    r.add("spring.datasource.url", postgres::getJdbcUrl);
    r.add("spring.datasource.username", postgres::getUsername);
    r.add("spring.datasource.password", postgres::getPassword);
}
```
The `@DynamicPropertySource` wires the Testcontainers URL in before the Spring context starts — no hardcoded test credentials.

---

## Known gaps to address

1. **`incrementAccessCount` has no REST endpoint** — the service method exists but nothing calls it from HTTP. `accessCount` will stay at 0 until the redirect endpoint (Phase 8) or a dedicated endpoint is added.

2. **No Redis caching tests** — Phase 6 will add `@Cacheable`/`@CacheEvict` but there are no tests proving cache hits or eviction. Add an IT class with a Testcontainers Redis container.

3. **`NoResourceFoundException` returns 500** — Spring 6.1+ maps unmatched routes through the static resource handler; the generic `Exception` handler catches it. Add an explicit handler if this matters.

4. **Manual verification (Phase 5 checklist)** — the automated tests pass but the curl/browser smoke-test checklist has not been run against a live stack.

---

## Flyway notes

- `spring.jpa.hibernate.ddl-auto=validate` — Hibernate validates against the existing schema; it will **never** create or alter tables
- All DDL goes through Flyway migrations in `src/main/resources/db/migration/`
- Migration naming: `V{version}__{description}.sql` (double underscore)
- To add a column: create a new migration file, never edit an existing one

---

## Phase 6 checklist (Redis caching) — what to do next

1. Add to `pom.xml`: `spring-boot-starter-data-redis`
2. Add to `application.properties`:
   ```properties
   spring.data.redis.host=localhost
   spring.data.redis.port=6379
   spring.cache.type=redis
   spring.cache.redis.time-to-live=3600000
   ```
3. Add `@EnableCaching` to `UrlshortenerApplication`
4. Annotate service methods:
   - `getByShortCode`: `@Cacheable(value = "urls", key = "#code")`
   - `updateShortUrl`: `@CacheEvict(value = "urls", key = "#code")`
   - `deleteShortUrl`: `@CacheEvict(value = "urls", key = "#code")`
5. Verify via SQL logs: second GET for same code should produce no SELECT
6. Write a Redis IT class to cover cache-hit and eviction scenarios
