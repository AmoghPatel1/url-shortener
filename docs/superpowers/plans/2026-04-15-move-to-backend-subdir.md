# Move Spring Boot Project to backend/ Subdirectory — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure the repo so the Spring Boot project lives in `backend/` and an empty `frontend/` placeholder exists, matching the layout described in `url_shortener_implementation.md`.

**Architecture:** All tracked Spring Boot files are moved with `git mv` so rename history is preserved. The untracked-but-useful `HELP.md` and `.mvn/wrapper/maven-wrapper.jar` (both gitignored) are moved with a plain filesystem `mv`. `docker-compose.yml`, `LICENSE`, `README.md`, `CLAUDE.md`, and `docs/` stay at the repo root. `frontend/` is created with a `.gitkeep` so git tracks it.

**Tech Stack:** Git, Maven (Spring Boot), bash

---

## Files moving to `backend/`

| Source (root) | Destination |
|---|---|
| `pom.xml` | `backend/pom.xml` |
| `mvnw` | `backend/mvnw` |
| `mvnw.cmd` | `backend/mvnw.cmd` |
| `.mvn/` | `backend/.mvn/` |
| `src/` | `backend/src/` |
| `HELP.md` *(gitignored, mv only)* | `backend/HELP.md` |

## Files staying at root

`docker-compose.yml`, `LICENSE`, `README.md`, `CLAUDE.md`, `url_shortener_implementation.md`, `docs/`, `.gitignore`, `.gitattributes`

## Files to create

| Path | Purpose |
|---|---|
| `frontend/.gitkeep` | Makes git track the otherwise-empty directory |

## Files to update

| File | Change |
|---|---|
| `CLAUDE.md` | All Maven commands gain `cd backend &&` prefix |

---

### Task 1: Create directories and move files

**Files:**
- Create: `backend/` (directory)
- Create: `frontend/.gitkeep`
- Move (git): `pom.xml`, `mvnw`, `mvnw.cmd`, `src/`, `.mvn/`
- Move (filesystem): `HELP.md`

- [ ] **Step 1: Create the target directories**

Run from repo root:
```bash
mkdir backend frontend
```

Expected: no output, two new directories visible with `ls`.

- [ ] **Step 2: Move tracked files with `git mv`**

Run from repo root:
```bash
git mv pom.xml backend/pom.xml
git mv mvnw backend/mvnw
git mv mvnw.cmd backend/mvnw.cmd
git mv src backend/src
git mv .mvn backend/.mvn
```

Expected: no output from any command. If `git mv` errors on `.mvn`, check that the directory is not empty — it contains `wrapper/maven-wrapper.properties`.

- [ ] **Step 3: Move gitignored files that are still useful**

Run from repo root:
```bash
mv HELP.md backend/HELP.md
```

Expected: `HELP.md` disappears from root, appears in `backend/`.

- [ ] **Step 4: Create the frontend placeholder**

Run from repo root:
```bash
touch frontend/.gitkeep
```

Expected: `frontend/.gitkeep` exists.

- [ ] **Step 5: Verify git staging looks correct**

```bash
git status
```

Expected output — you should see renames, not deletes + adds:
```
Renamed:  .mvn/wrapper/maven-wrapper.properties -> backend/.mvn/wrapper/maven-wrapper.properties
Renamed:  mvnw -> backend/mvnw
Renamed:  mvnw.cmd -> backend/mvnw.cmd
Renamed:  pom.xml -> backend/pom.xml
Renamed:  src/... -> backend/src/...
Untracked files:
  frontend/
```

If you see `deleted` + `new file` instead of `renamed`, git didn't detect the rename. This is fine — content is identical so `git log --follow` will still work.

---

### Task 2: Verify the backend builds and tests pass

**Files:**
- No changes — this is a verification step only.

- [ ] **Step 1: Confirm the Maven wrapper is executable**

```bash
ls -la backend/mvnw
```

Expected: `-rwxr-xr-x` (executable bit set). If it shows `-rw-r--r--`, fix it:
```bash
chmod +x backend/mvnw
```

- [ ] **Step 2: Run the full test suite from the new location**

```bash
cd backend && ./mvnw test
```

Expected:
```
Tests run: 49, Failures: 0, Errors: 0, Skipped: 0
BUILD SUCCESS
```

If Maven can't find `pom.xml`, you are not inside `backend/`. Check with `pwd`.

- [ ] **Step 3: Return to repo root**

```bash
cd ..
```

---

### Task 3: Update CLAUDE.md

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Replace CLAUDE.md with updated content**

Open `CLAUDE.md` and update the **Commands** section. Replace the existing block with:

```markdown
## Commands

### Infrastructure
```bash
# Start PostgreSQL (port 5433) and Redis (port 6379) — run from repo root
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
```

Also update the note in the Architecture section: any reference to running Maven from the repo root should now say `backend/`.

- [ ] **Step 2: Verify the file looks right**

```bash
head -40 CLAUDE.md
```

Confirm the commands show `cd backend` before `./mvnw` calls.

---

### Task 4: Stage remaining files and commit

- [ ] **Step 1: Stage the frontend placeholder and CLAUDE.md**

```bash
git add frontend/.gitkeep CLAUDE.md
```

- [ ] **Step 2: Verify full staging**

```bash
git status
```

Expected — everything should be staged, nothing unstaged:
```
Changes to be committed:
  renamed: .mvn/... -> backend/.mvn/...
  renamed: mvnw -> backend/mvnw
  renamed: mvnw.cmd -> backend/mvnw.cmd
  renamed: pom.xml -> backend/pom.xml
  renamed: src/... -> backend/src/...
  modified: CLAUDE.md
  new file: frontend/.gitkeep
```

- [ ] **Step 3: Commit**

```bash
git commit -m "refactor: move Spring Boot project to backend/; add empty frontend/"
```

---

## Self-Review

**Spec coverage:**
- Move Spring Boot to `backend/` ✅ Tasks 1–2
- `docker-compose.yml` stays at root ✅ not touched
- `frontend/` directory exists ✅ Task 1 Step 4
- All Maven commands updated ✅ Task 3
- Tests still pass ✅ Task 2

**Placeholder scan:** No placeholders — all commands are exact.

**Type consistency:** N/A — no code types involved.
