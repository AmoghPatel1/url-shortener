# Fix Integration Tests Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the failing integration tests in `UrlShortenerControllerIT` by correcting the typo in the POST endpoint route.

**Architecture:** The controller maps `POST` to `/api/sorten` (single 't') but all integration tests post to `/api/shorten`. Every test that calls the `post()` helper receives a 404, which cascades into NullPointerExceptions in any test that calls `Objects.requireNonNull(post().getBody())`. Fixing the one-character typo in the `@PostMapping` annotation resolves all failures.

**Tech Stack:** Spring Boot 3.3, JUnit 5, Testcontainers (PostgreSQL), TestRestTemplate

---

## Root Cause Analysis

| File | Issue |
|------|-------|
| `src/main/java/com/example/urlshortener/controller/UrlShortenerController.java:26` | `@PostMapping("/sorten")` — missing 'h'. Tests post to `/api/shorten`, hitting no handler → 404 |

All other endpoints (GET, PUT, DELETE, stats) are spelled correctly and would pass in isolation. The `post()` helper is used as a setup step in almost every nested test class (to obtain a `shortCode`), so the 404 from POST causes downstream tests to either fail assertion or throw `NullPointerException` on `Objects.requireNonNull(post().getBody())`.

---

## Files to Modify

- **Modify:** `src/main/java/com/example/urlshortener/controller/UrlShortenerController.java` — fix `@PostMapping` annotation (line 26)

No other files require changes. Unit tests (`UrlShortenerServiceTest`, `ShortCodeGeneratorTest`) are unaffected and should already pass.

---

### Task 1: Fix the POST endpoint typo

**Files:**
- Modify: `src/main/java/com/example/urlshortener/controller/UrlShortenerController.java:26`

- [ ] **Step 1: Confirm the current broken state**

Run only the POST tests to see them fail before touching anything:

```bash
./mvnw test -Dtest=UrlShortenerControllerIT#PostShorten
```

Expected output contains lines like:
```
expected: 201 CREATED
 but was: 404 NOT_FOUND
```

- [ ] **Step 2: Fix the typo**

In `src/main/java/com/example/urlshortener/controller/UrlShortenerController.java`, line 26, change:

```java
// BEFORE
@PostMapping("/sorten")
```

to:

```java
// AFTER
@PostMapping("/shorten")
```

The full method signature context for orientation (do NOT change anything else):

```java
@PostMapping("/shorten")
public ResponseEntity<ShortenResponse> shorten(@Valid @RequestBody ShortenRequest shortenRequest) {
```

- [ ] **Step 3: Run all integration tests and confirm they pass**

```bash
./mvnw test -Dtest=UrlShortenerControllerIT
```

Expected: All tests `PASS`. The output should contain no `FAILED` or `ERROR` entries, and the summary should look like:

```
Tests run: N, Failures: 0, Errors: 0, Skipped: 0
```

If any tests still fail, read the failure message before proceeding — do not guess.

- [ ] **Step 4: Run the full test suite to confirm no regressions**

```bash
./mvnw test
```

Expected: All three test classes pass — `UrlShortenerControllerIT`, `UrlShortenerServiceTest`, `ShortCodeGeneratorTest`.

```
BUILD SUCCESS
```

- [ ] **Step 5: Commit**

```bash
git add src/main/java/com/example/urlshortener/controller/UrlShortenerController.java
git commit -m "fix: correct POST /api/shorten route typo (was /sorten)"
```

---

## Self-Review

**Spec coverage:** The single requirement is "fix integration tests." The typo on line 26 is the only code defect. No other tests or files need to change.

**Placeholder scan:** No placeholders — every step has exact commands and expected output.

**Type consistency:** No types introduced. Single annotation value changed.
