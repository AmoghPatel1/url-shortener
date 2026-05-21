# URL Shortener — Implementation Guide for Claude Code

> **Stack:** Java 21 + Spring Boot 3.3 · Next.js 14 (App Router) · PostgreSQL · Redis  
> **Reference:** https://roadmap.sh/projects/url-shortening-service  
> Work through each phase in order. Complete all tasks in a phase before moving to the next.
>
> **Legend:** ✅ done · ⚠️ done with deviation (see note) · [ ] not started

---

## Project Structure

```
url-shortener/
├── backend/          ← Spring Boot project (Maven)
├── frontend/         ← Next.js 14 project (TypeScript + Tailwind)
└── docker-compose.yml
```

---

## Phase 0 — Project Setup & Prerequisites ✅

### Environment
- [x] Verify Java 17 is installed (`java -version`) ⚠️ *Java 21 used instead*
- [x] Verify Maven is installed (`mvn -version`)
- [x] Verify Node.js 18+ is installed (`node -v`)
- [x] Verify Docker is installed (`docker --version`)

### Repository
- [x] Initialise git repository at project root
- [x] Create `.gitignore` covering Java, Node, and environment files
- [x] Create initial `README.md`

### Docker Compose
- [x] Create `docker-compose.yml` at project root ⚠️ *PostgreSQL runs on port **5433** (not 5432) to avoid local conflicts*

```yaml
services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: urlshortener
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: secret
    ports:
      - "5433:5432"   # ← actual; spec says 5432:5432

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
```

- [x] Run `docker-compose up -d` and confirm both services start

---

## Phase 1 — Backend: Project Scaffolding ✅

### Spring Boot Init
- [x] Generate Spring Boot 3.3 project in `backend/` with Maven ⚠️ *Java 21, not 17*
  - `spring-boot-starter-web`
  - `spring-boot-starter-data-jpa`
  - `postgresql`
  - `spring-boot-starter-validation`
  - `lombok`
  - `spring-boot-starter-cache` *(present; `@EnableCaching` not yet added — Phase 6)*
  - `spring-boot-starter-actuator`
  - `flyway-core`

### Folder Structure
- [x] Packages created under `src/main/java/com/urlshortener/`:
  - `controller`, `service`, `repository`, `entity`, `dto`, `exception`, `util`

### Configuration
- [x] `application.properties` configured ⚠️ *port 8081 (not 8080), DB on 5433*

```properties
spring.datasource.url=jdbc:postgresql://localhost:5433/urlshortener
spring.datasource.username=postgres
spring.datasource.password=secret
spring.jpa.hibernate.ddl-auto=validate
spring.jpa.show-sql=true
server.port=8081
management.endpoints.web.exposure.include=health,info
```

- [x] `src/main/resources/db/migration/` directory created

---

## Phase 2 — Backend: Database Schema & Entities ✅

### Flyway Migration
- [x] `V1__create_short_urls_table.sql` created ⚠️ *several intentional schema deviations:*
  - `BIGINT GENERATED ALWAYS AS IDENTITY` instead of `BIGSERIAL` (SQL-standard; prevents manual ID inserts)
  - Separate `CREATE UNIQUE INDEX idx_short_urls_short_code` instead of inline `UNIQUE` (explicit name, easier to manage)
  - `VARCHAR(20)` for `short_code` instead of `VARCHAR(10)` (headroom for longer codes)
  - `TIMESTAMP` (no timezone) instead of `TIMESTAMPTZ` (UTC enforced at JPA/Jackson layer)

### JPA Entity
- [x] `entity/ShortUrl.java` created ⚠️ *uses `LocalDateTime` not `OffsetDateTime` (matches TIMESTAMP column)*
  - `@PrePersist` sets both `createdAt` and `updatedAt`
  - `@PreUpdate` refreshes only `updatedAt`
  - `createdAt` marked `updatable = false`

### Repository
- [x] `repository/ShortUrlRepository.java` with `findByShortCode(String)`

### DTOs
- [x] `dto/ShortenRequest.java` with `@NotBlank` + `@URL`
- [x] `dto/ShortenResponse.java`

### Verify
- [x] Flyway creates table on startup with no errors

---

## Phase 3 — Backend: Service & Business Logic ✅

### Short Code Generator
- [x] `util/ShortCodeGenerator.java`
  - Base62, 6-char, `SecureRandom`
  - Collision check via `existsByShortCode`, up to 10 retries
  - `@Component` with `ShortUrlRepository` injected (mock it in service tests)

### Service
- [x] `service/UrlShortenerService.java`
- [x] `createShortUrl` — generates unique code, saves entity, returns DTO
- [x] `getByShortCode` — finds or throws `UrlNotFoundException`; `@Transactional(readOnly=true)`
- [x] `updateShortUrl` — finds, updates URL + updatedAt, saves
- [x] `deleteShortUrl` — finds, deletes
- [x] `getStats` — returns full DTO including `accessCount`; `@Transactional(readOnly=true)`
- [x] `incrementAccessCount` — `@Transactional`, increments and saves

---

## Phase 4 — Backend: Controller & Exception Handling ✅

### Exception Classes
- [x] `exception/UrlNotFoundException.java`

### Global Exception Handler
- [x] `exception/GlobalExceptionHandler.java` (`@RestControllerAdvice`)
  - `UrlNotFoundException` → 404
  - `MethodArgumentNotValidException` → 400 with field error map
  - Generic `Exception` → 500
  - ⚠️ *Known: Spring 6.1+ `NoResourceFoundException` for unmatched routes hits the generic handler and returns 500 — add explicit handling if a clean 404 is needed for unknown routes*

### REST Controller
- [x] `controller/UrlShortenerController.java` — `@RequestMapping("/api")`

| Method | Path | Status | Action |
|--------|------|--------|--------|
| POST | `/shorten` | 201 | `createShortUrl` |
| GET | `/shorten/{code}` | 200 | `getByShortCode` |
| PUT | `/shorten/{code}` | 200 | `updateShortUrl` |
| DELETE | `/shorten/{code}` | 204 | `deleteShortUrl` |
| GET | `/shorten/{code}/stats` | 200 | `getStats` |

### CORS
- [x] `WebMvcConfigurer` bean configured ⚠️ *allows both `localhost:3000` and `localhost:5173` (Vite dev server)*

---

## Phase 5 — Backend: Tests ✅

### Unit Tests
- [x] `ShortCodeGeneratorTest` — length, charset, 1000-code uniqueness
- [x] `UrlShortenerServiceTest` — Mockito; mocks `ShortUrlRepository` + `ShortCodeGenerator`
  - `createShortUrl` returns correct DTO
  - `getByShortCode` throws `UrlNotFoundException` for missing code
  - `incrementAccessCount` calls `save` after incrementing

### Integration Tests
- [x] Testcontainers `postgresql` dependency (test scope)
- [x] `UrlShortenerControllerIT` — `@SpringBootTest(RANDOM_PORT)` + `PostgreSQLContainer`
  - POST → 201; GET → 200; GET unknown → 404; PUT → 200; DELETE → 204 + GET → 404; stats `accessCount`

### Test Profile (`application-test.properties`)
- `spring.cache.type=none` — caching no-op so Phase 6 annotations don't break tests
- `RedisAutoConfiguration` excluded — no Redis connection in tests
- `@DynamicPropertySource` overrides Postgres URL with Testcontainers container

### Manual Verification Checklist
- [ ] POST with valid URL → 201 with `shortCode` field
- [ ] POST with invalid URL → 400 with error message
- [ ] GET with valid code → 200 with full record
- [ ] GET with non-existent code → 404
- [ ] PUT updates `originalUrl` and `updatedAt`
- [ ] DELETE → 204; subsequent GET → 404
- [ ] Stats `accessCount` increments on each GET

---

## Phase 6 — Backend: Redis Caching ✅

### Dependencies
- [x] Add `spring-boot-starter-data-redis` to `pom.xml` (`spring-boot-starter-cache` already present)

### Configuration
- [x] Add to `application.properties`:

```properties
spring.data.redis.host=localhost
spring.data.redis.port=6379
spring.cache.type=redis
spring.cache.redis.time-to-live=3600000
```

### Enable Caching
- [x] Add `@EnableCaching` to the main `@SpringBootApplication` class

### Cache Annotations
- [x] Add `@Cacheable(value = "urls", key = "#code")` to `getByShortCode()`
- [x] Add `@CacheEvict(value = "urls", key = "#code")` to `updateShortUrl()` and `deleteShortUrl()`

### Tests
- [x] `CacheConfig` with Jackson serializer, 1h TTL; test profile excludes Redis (`spring.cache.type=none`, `RedisAutoConfiguration` excluded)

### Verify
- [ ] Call GET `/api/shorten/{code}` twice — second call must not hit the database (verify via SQL logs)
- [ ] Call DELETE then GET — confirm eviction (GET should return 404, not stale cache)

---

## Phase 7 — Frontend: Next.js Scaffolding ✅

### Project Init
- [x] Next.js 14 (App Router) project in `frontend/` — TypeScript + Tailwind

### Dependencies
- [x] `@fontsource/jetbrains-mono`, `@fontsource/space-grotesk` ⚠️ *Used Space Grotesk + JetBrains Mono instead of spec's axios/react-hot-toast/clsx*

### Environment
- [x] `frontend/.env.local` with `NEXT_PUBLIC_API_URL=http://localhost:8081`

### API Client
- [x] `frontend/lib/api.ts` — typed `createShortUrl`, `listUrls`, `getUrl`, `getStats`, `updateUrl`, `deleteUrl` using `fetch`; throws on non-2xx

---

## Phase 8 — Frontend: Pages & Components ✅

⚠️ *Implemented with "Loop" sticker-card theme (Space Grotesk + JetBrains Mono, pastel palette, dark mode). Routes deviate from spec.*

### Shared Layout
- [x] `app/layout.tsx` — `TopBar` nav, `ThemeProvider` (dark mode), `Toast` component

### Pages built

| Route | File | Notes |
|-------|------|-------|
| `/` | `app/page.tsx` | Shorten form, recent links sidebar |
| `/dashboard` | `app/dashboard/page.tsx` | All links table ⚠️ *not in spec* |
| `/dashboard/[code]` | `app/dashboard/[code]/page.tsx` | Single link detail ⚠️ *not in spec* |
| `/edit/[code]` | `app/edit/[code]/page.tsx` | Edit URL ⚠️ *not in spec* |
| `/analytics/[code]` | `app/analytics/[code]/page.tsx` | Click stats ⚠️ *spec says `/stats/[code]`* |
| `*` | `app/not-found.tsx` | 404 page |

### Redirect Handler
- [x] ⚠️ *Handled by backend `RedirectController` at `GET /{code}` → 302. No frontend `/s/[code]` page built — not needed.*

### Components
- [x] `TopBar`, `StickerCard`, `ChunkyBtn`, `LoopSlug`, `Toast`, `ThemeProvider`

### Stats Page (`src/app/stats/[code]/page.tsx`)
- [ ] Implement as a server component
- [ ] Call `getStats(code)` server-side
- [ ] Display:
  - Original URL (truncated if long, full URL on hover)
  - Short code
  - Created date (formatted)
  - Access count (large, prominent number)
- [ ] "Back to home" button
- [ ] Handle 404 with `notFound()`

---

## Phase 9 — Integration & End-to-End Verification ⏳ *Next up*

### Run Everything Locally
- [ ] Start infrastructure: `docker-compose up -d`
- [ ] Start backend: `cd backend && ./mvnw spring-boot:run` *(starts on port 8081)*
- [ ] Start frontend: `cd frontend && npm run dev` *(starts on port 3000)*

### End-to-End Checklist
- [ ] Open `http://localhost:3000` — form renders
- [ ] Paste a long URL and click Shorten — result card appears
- [ ] Copy the short URL and open it in a new tab — browser redirects to original URL
- [ ] Open the stats page — access count shows at least 1
- [ ] Shorten the same URL again — a new unique short code is created
- [ ] Delete a short URL — card disappears; visiting the short URL shows 404 page
- [ ] Submit an invalid URL (no `https://`) — form shows validation error, no API call made
- [ ] Kill the backend and submit a form — frontend shows an error toast

### Common Issues to Fix
- [ ] CORS errors in browser console → check `WebMvcConfigurer` allows `http://localhost:3000`
- [ ] TypeScript type errors on API response fields → align `ShortUrl` interface with actual JSON
- [ ] Redirect loop on `/s/[code]` → ensure `redirect()` is called before rendering anything
- [ ] Redis connection refused → confirm `docker-compose up` includes the redis service

---

## Phase 10 — Deployment

### Backend — Dockerfile
- [ ] Create `backend/Dockerfile`:

```dockerfile
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY target/*.jar app.jar
EXPOSE 8081
ENTRYPOINT ["java", "-jar", "app.jar"]
```

> ⚠️ *Spec says `17-jre-alpine` and port 8080 — use `21-jre-alpine` and 8081*

- [ ] Add a `backend/.dockerignore` excluding `target/` build artifacts

### Backend — Railway
- [ ] Create a new Railway project
- [ ] Connect the GitHub repository
- [ ] Add a PostgreSQL plugin — Railway will inject `DATABASE_URL`
- [ ] Add a Redis plugin — Railway will inject `REDIS_URL`
- [ ] Set environment variables:

```
SPRING_DATASOURCE_URL=<from Railway PostgreSQL plugin>
SPRING_DATASOURCE_USERNAME=<from Railway>
SPRING_DATASOURCE_PASSWORD=<from Railway>
SPRING_DATA_REDIS_URL=<from Railway Redis plugin>
BASE_URL=https://<your-railway-app>.up.railway.app
```

- [ ] Deploy and verify `https://<your-backend>/actuator/health` returns `{"status":"UP"}`

### Frontend — Vercel
- [ ] Import the repository into Vercel
- [ ] Set root directory to `frontend`
- [ ] Set framework preset to **Next.js**
- [ ] Add environment variable:

```
NEXT_PUBLIC_API_URL=https://<your-railway-backend>/api
```

- [ ] Deploy and test all pages on the production URL

### CI/CD — GitHub Actions
- [ ] Create `.github/workflows/backend-ci.yml`:

```yaml
name: Backend CI
on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with:
          java-version: '21'        # ← spec says 17; actual is 21
          distribution: 'temurin'
      - name: Run tests
        run: cd backend && ./mvnw test
```

- [ ] Verify Vercel auto-deploys on every push to `main`

---

## Phase 11 — Monitoring & Final Polish

### Sentry — Backend
- [ ] Add `sentry-spring-boot-starter` to `pom.xml`
- [ ] Add `SENTRY_DSN` environment variable (from sentry.io project settings)
- [ ] Verify unhandled exceptions appear in the Sentry dashboard

### Sentry — Frontend
- [ ] Run `npx @sentry/wizard@latest -i nextjs` inside `frontend/`
- [ ] Add `NEXT_PUBLIC_SENTRY_DSN` to Vercel environment variables
- [ ] Verify client-side errors appear in Sentry

### Rate Limiting
- [ ] Add `bucket4j-spring-boot-starter` to `pom.xml`
- [ ] Configure a rate limit of 10 requests/minute per IP on `POST /api/shorten`
- [ ] Return `429 Too Many Requests` when limit is exceeded

### Final UI Review
- [ ] Test all pages on a mobile viewport (375px wide)
- [ ] Confirm all error states render gracefully (invalid URL, 404 redirect, network failure)
- [ ] Confirm copy-to-clipboard works in Chrome, Firefox, and Safari
- [ ] Confirm page titles and meta tags are set appropriately

### README
- [ ] Write `README.md` at the project root with:
  - Project description and motivation
  - Architecture diagram or description
  - Local setup instructions (Docker, backend, frontend steps)
  - All API endpoints documented with example request/response
  - Environment variable reference
  - Link to live demo
  - Screenshots of the UI

---

## Quick Reference

### Key URLs (local dev)
| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:8081/api |
| Health check | http://localhost:8081/actuator/health |
| Short redirect | http://localhost:3000/s/{code} |
| Stats | http://localhost:3000/stats/{code} |

### Git Branch Strategy
```
main          ← production-ready only
develop       ← integration branch
feature/...   ← individual features  e.g. feature/shorten-endpoint
fix/...       ← bug fixes
```

### Commit Convention
```
feat: add short URL creation endpoint
fix: handle duplicate short code collision
test: add unit tests for ShortCodeGenerator
chore: add Flyway migration for short_urls table
docs: update README with API examples
```

### Environment Variable Reference
| Variable | Where | Description |
|----------|-------|-------------|
| `SPRING_DATASOURCE_URL` | Backend | PostgreSQL JDBC URL |
| `SPRING_DATASOURCE_USERNAME` | Backend | DB username |
| `SPRING_DATASOURCE_PASSWORD` | Backend | DB password |
| `SPRING_DATA_REDIS_HOST` | Backend | Redis host |
| `SPRING_DATA_REDIS_PORT` | Backend | Redis port (default 6379) |
| `SENTRY_DSN` | Backend | Sentry project DSN |
| `NEXT_PUBLIC_API_URL` | Frontend | Backend base URL |
| `NEXT_PUBLIC_SENTRY_DSN` | Frontend | Sentry project DSN |

---

*roadmap.sh/projects/url-shortening-service — Java 21 · Spring Boot 3.3 · Next.js 14 · PostgreSQL · Redis*
