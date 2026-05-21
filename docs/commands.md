# Commands

## Start / Stop Everything

```powershell
# Start Docker infra (Postgres + Redis), backend (port 8081), and frontend (port 3000).
# Waits for each service before starting the next.
.\start.ps1

# Stop backend and frontend jobs, then tear down Docker infra.
.\stop.ps1
```

## PowerShell Prompt (short directory name only)

```powershell
function prompt { "PS $((Get-Item $PWD).Name)> " }
```

## Infrastructure

```bash
# Start PostgreSQL (port 5434) + Redis (port 6379)
docker-compose up -d

# Stop infrastructure
docker-compose down

# View logs
docker-compose logs -f

# Check container status
docker-compose ps
```

## Build & Run

```bash
cd backend

# Start app (port 8081)
./mvnw spring-boot:run

# Build JAR
./mvnw clean package

# Build JAR (skip tests)
./mvnw clean package -DskipTests
```

## Testing

```bash
cd backend

# All tests
./mvnw test

# Single unit test class
./mvnw test -Dtest=ShortCodeGeneratorTest

# Integration tests (requires Docker)
./mvnw test -Dtest=UrlShortenerControllerIT

# Service unit tests
./mvnw test -Dtest=UrlShortenerServiceTest
```

> Integration tests use Testcontainers — Docker must be running.

## API (app on port 8081)

```bash
# Create short URL
curl -s -X POST http://localhost:8081/api/urls \
  -H "Content-Type: application/json" \
  -d '{"originalUrl": "https://example.com"}' | jq

# Get all URLs
curl -s http://localhost:8081/api/urls | jq

# Get by short code
curl -s http://localhost:8081/api/urls/{shortCode} | jq

# Update URL
curl -s -X PUT http://localhost:8081/api/urls/{shortCode} \
  -H "Content-Type: application/json" \
  -d '{"originalUrl": "https://new-url.com"}' | jq

# Delete URL
curl -s -X DELETE http://localhost:8081/api/urls/{shortCode}
```

## Database (PostgreSQL on port 5434)

```bash
# Connect via psql
psql -h localhost -p 5434 -U postgres -d urlshortener

# Connect via Docker
docker exec -it url-shortener-postgres-1 psql -U postgres -d urlshortener
```

## Cache (Redis on port 6379)

```bash
# Connect via redis-cli
redis-cli -p 6379

# Connect via Docker
docker exec -it url-shortener-redis-1 redis-cli

# List all cached keys
redis-cli -p 6379 KEYS "*"

# Flush all cache
redis-cli -p 6379 FLUSHALL
```
