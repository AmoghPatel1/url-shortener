# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Infrastructure
```bash
# Start PostgreSQL (port 5434) and Redis (port 6379) — run from repo root
docker-compose up -d

# Stop infrastructure
docker-compose down
```

### Build & Run
```bash
cd backend
./mvnw spring-boot:run          # Start app on port 8081
./mvnw clean package            # Build JAR
./mvnw clean package -DskipTests
```

### Testing
```bash
cd backend
./mvnw test                                          # Run all tests
./mvnw test -Dtest=ShortCodeGeneratorTest            # Run a single unit test class
./mvnw test -Dtest=UrlShortenerControllerIT          # Run integration tests (requires Docker)
./mvnw test -Dtest=UrlShortenerServiceTest           # Run service unit tests
```

Integration tests use Testcontainers to spin up a real PostgreSQL instance — Docker must be running.

## Architecture

Spring Boot 3.3 / Java 21 REST API. No redirect endpoint exists yet — the service manages CRUD on short URL records only.

### Request flow
```
HTTP → UrlShortenerController (/api/*)
          → UrlShortenerService
               → ShortCodeGenerator (Base62, 6-char, collision-retried)
               → ShortUrlRepository (Spring Data JPA)
                    → PostgreSQL (Flyway-managed schema)
```

### Key design decisions

**Short code generation** (`ShortCodeGenerator`): Generates a random 6-char Base62 string using `SecureRandom`. Checks DB for collisions and retries up to 10 times. 62^6 ≈ 56 billion combinations makes collisions extremely rare.

**Transaction strategy**: Write operations use `@Transactional`, reads use `@Transactional(readOnly = true)` to skip Hibernate dirty-checking and allow DB read-replica routing.

**Entity timestamps**: `@PrePersist` sets both `createdAt`/`updatedAt`; `@PreUpdate` refreshes only `updatedAt`. The `createdAt` column is marked `updatable = false` in the JPA mapping.

**Schema management**: Flyway handles all DDL. `spring.jpa.hibernate.ddl-auto=validate` means Hibernate only validates against the existing schema — never modifies it. Migrations live in `backend/src/main/resources/db/migration/`.

**Error handling**: `GlobalExceptionHandler` (`@RestControllerAdvice`) centralizes all error responses into `ErrorResponse` DTOs. `UrlNotFoundException` → 404, `MethodArgumentNotValidException` → 400 with field-level error map.

**Redis**: Declared as a dependency in `docker-compose.yml` and configured in `application.properties`, but caching is not yet wired up in the service layer.

### Infrastructure
- PostgreSQL runs on **port 5434** (not default 5432) to avoid conflicts
- App runs on **port 8081**
- CORS is configured for `localhost:3000` and `localhost:5173`
