# snip. Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Build the snip. Next.js frontend and add two missing backend endpoints (list all URLs, redirect).

**Architecture:** Next.js 14 App Router frontend in `frontend/`. Backend is Spring Boot on port 8081. Frontend calls backend via a typed API client in `lib/api.ts`. Two backend endpoints are added first so the frontend has a complete API to call.

**Tech Stack:** Next.js 14, TypeScript, Tailwind CSS, JetBrains Mono (Google Fonts), Jest + React Testing Library

---

## API Reference (actual backend routes)

> Note: spec said `/api/urls` — actual routes are `/api/shorten`.

| Action | Method | Route | Body / Notes |
|---|---|---|---|
| List all | GET | `/api/shorten` | returns `ShortenResponse[]` — **to be added** |
| Create | POST | `/api/shorten` | `{ "url": "..." }` |
| Get one | GET | `/api/shorten/{code}` | |
| Update | PUT | `/api/shorten/{code}` | `{ "url": "..." }` |
| Delete | DELETE | `/api/shorten/{code}` | 204 No Content |
| Stats | GET | `/api/shorten/{code}/stats` | returns `accessCount` |
| Redirect | GET | `/{code}` | 302 → originalUrl — **to be added** |

`ShortenResponse` shape:
```typescript
{ id: number; url: string; shortCode: string; accessCount: number; createdAt: string; updatedAt: string; }
```

---

## File Map

### Backend additions
| File | Action |
|---|---|
| `backend/src/main/java/.../repository/ShortUrlRepository.java` | Add JPQL `incrementAccessCount` |
| `backend/src/main/java/.../service/UrlShortenerService.java` | Add `resolveUrl(code)` method |
| `backend/src/main/java/.../controller/UrlShortenerController.java` | Add `GET /api/shorten` list endpoint |
| `backend/src/main/java/.../controller/RedirectController.java` | Create — handles `GET /{code}` |
| `backend/src/test/java/.../controller/RedirectControllerIT.java` | Create — integration test |

### Frontend
| File | Action |
|---|---|
| `frontend/` | Scaffold Next.js 14 app |
| `frontend/tailwind.config.ts` | Custom color tokens |
| `frontend/app/layout.tsx` | Root layout — font + dark bg |
| `frontend/lib/api.ts` | Typed API client |
| `frontend/components/NavBar.tsx` | Top nav (dashboard + inner pages) |
| `frontend/components/UrlInput.tsx` | URL input + SHORTEN button |
| `frontend/components/ResultCard.tsx` | Post-shorten result card |
| `frontend/components/LinkRow.tsx` | Single link row (recent list + dashboard) |
| `frontend/components/LinkTable.tsx` | Full dashboard table |
| `frontend/app/page.tsx` | Home page `/` |
| `frontend/app/dashboard/page.tsx` | Dashboard page `/dashboard` |
| `frontend/app/dashboard/[code]/page.tsx` | Analytics page |
| `frontend/app/edit/[code]/page.tsx` | Edit page |
| `frontend/app/not-found.tsx` | 404 page |

---

## Phase 1: Backend Additions

### Task 1: Add list endpoint + JPQL increment to repository

**Files:**
- Modify: `backend/src/main/java/com/example/urlshortener/repository/ShortUrlRepository.java`
- Modify: `backend/src/main/java/com/example/urlshortener/controller/UrlShortenerController.java`

- [x] **Step 1: Add JPQL increment method to repository**

Replace `ShortUrlRepository.java` with:

```java
package com.example.urlshortener.repository;

import com.example.urlshortener.entity.ShortUrl;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface ShortUrlRepository extends JpaRepository<ShortUrl, Long> {

    Optional<ShortUrl> findByShortCode(String shortCode);

    Boolean existsByShortCode(String shortCode);

    @Modifying
    @Query("UPDATE ShortUrl s SET s.accessCount = s.accessCount + 1 WHERE s.shortCode = :shortCode")
    int incrementAccessCount(@Param("shortCode") String shortCode);
}
```

- [x] **Step 2: Add `resolveUrl` to service**

In `UrlShortenerService.java`, add this method after `incrementAccessCount()`:

```java
@Transactional
public String resolveUrl(String code) {
    log.info("Resolving short code '{}' for redirect", code);
    int updated = shortUrlRepository.incrementAccessCount(code);
    if (updated == 0) {
        throw new UrlNotFoundException(code);
    }
    return findOrThrow(code).getOriginalUrl();
}
```

- [x] **Step 3: Add `GET /api/shorten` list endpoint to controller**

In `UrlShortenerController.java`, add this method after the class-level `@RequestMapping`:

```java
@GetMapping("/shorten")
public ResponseEntity<List<ShortenResponse>> listAll() {
    log.info("GET /api/shorten — listing all");
    List<ShortenResponse> all = urlShortenerService.listAll();
    return ResponseEntity.ok(all);
}
```

Also add `import java.util.List;` at the top.

- [x] **Step 4: Add `listAll` to service**

In `UrlShortenerService.java`, add after `createShortUrl()`:

```java
@Transactional(readOnly = true)
public List<ShortenResponse> listAll() {
    log.info("Listing all short URLs");
    return shortUrlRepository.findAll()
            .stream()
            .map(ShortenResponse::from)
            .toList();
}
```

Also add `import java.util.List;` at the top.

- [x] **Step 5: Start the app and verify list endpoint**

```bash
cd backend && ./mvnw spring-boot:run
curl -s http://localhost:8081/api/shorten | jq
```

Expected: `[]` (empty array if no data) or array of ShortenResponse objects.

- [x] **Step 6: Commit**

```bash
git add backend/src/main/java/com/example/urlshortener/repository/ShortUrlRepository.java
git add backend/src/main/java/com/example/urlshortener/service/UrlShortenerService.java
git add backend/src/main/java/com/example/urlshortener/controller/UrlShortenerController.java
git commit -m "feat: add list-all endpoint and JPQL increment to repository"
```

---

### Task 2: Add redirect controller

**Files:**
- Create: `backend/src/main/java/com/example/urlshortener/controller/RedirectController.java`
- Create: `backend/src/test/java/com/example/urlshortener/controller/RedirectControllerIT.java`

- [x] **Step 1: Write the failing test**

Create `backend/src/test/java/com/example/urlshortener/controller/RedirectControllerIT.java`:

```java
package com.example.urlshortener.controller;

import com.example.urlshortener.dto.ShortenRequest;
import com.example.urlshortener.dto.ShortenResponse;
import com.example.urlshortener.service.UrlShortenerService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.testcontainers.junit.jupiter.Testcontainers;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@Testcontainers
@ActiveProfiles("test")
class RedirectControllerIT {

    @Autowired MockMvc mockMvc;
    @Autowired UrlShortenerService service;

    @Test
    void redirect_validCode_returns302() throws Exception {
        ShortenResponse created = service.createShortUrl(new ShortenRequest("https://example.com"));

        mockMvc.perform(get("/" + created.getShortCode()))
                .andExpect(status().isFound())
                .andExpect(header().string("Location", "https://example.com"));
    }

    @Test
    void redirect_unknownCode_returns404() throws Exception {
        mockMvc.perform(get("/nonexistent"))
                .andExpect(status().isNotFound());
    }
}
```

- [x] **Step 2: Run test — verify it fails**

```bash
cd backend && ./mvnw test -Dtest=RedirectControllerIT
```

Expected: `FAIL` — `RedirectController` doesn't exist yet.

- [x] **Step 3: Create redirect controller**

Create `backend/src/main/java/com/example/urlshortener/controller/RedirectController.java`:

```java
package com.example.urlshortener.controller;

import com.example.urlshortener.service.UrlShortenerService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

import java.net.URI;

@Slf4j
@RestController
@RequiredArgsConstructor
public class RedirectController {

    private final UrlShortenerService urlShortenerService;

    @GetMapping("/{code}")
    public ResponseEntity<Void> redirect(@PathVariable String code) {
        log.info("Redirect request for code '{}'", code);
        String originalUrl = urlShortenerService.resolveUrl(code);
        HttpHeaders headers = new HttpHeaders();
        headers.setLocation(URI.create(originalUrl));
        return ResponseEntity.status(HttpStatus.FOUND).headers(headers).build();
    }
}
```

- [x] **Step 4: Run test — verify it passes**

```bash
cd backend && ./mvnw test -Dtest=RedirectControllerIT
```

Expected: `BUILD SUCCESS`, both tests green.

- [x] **Step 5: Verify redirect manually**

```bash
curl -v http://localhost:8081/abc123
```

Expected: `HTTP/1.1 302` with `Location: <original-url>` header (or 404 if code doesn't exist).

- [x] **Step 6: Commit**

```bash
git add backend/src/main/java/com/example/urlshortener/controller/RedirectController.java
git add backend/src/test/java/com/example/urlshortener/controller/RedirectControllerIT.java
git commit -m "feat: add redirect endpoint GET /{code} with access count increment"
```

---

## Phase 2: Frontend Foundation

### Task 3: Scaffold Next.js app

**Files:**
- Create: `frontend/` (entire Next.js project)
- Modify: `frontend/tailwind.config.ts`
- Modify: `frontend/app/globals.css`

- [x] **Step 1: Scaffold Next.js app in frontend/**

```bash
cd url-shortener
npx create-next-app@14 frontend --typescript --tailwind --app --no-src-dir --import-alias "@/*" --yes
```

When prompted (if not using `--yes`):
- TypeScript: Yes
- ESLint: Yes
- Tailwind CSS: Yes
- `src/` directory: No
- App Router: Yes
- Import alias: `@/*`

- [x] **Step 2: Install JetBrains Mono font package**

```bash
cd frontend && npm install @fontsource/jetbrains-mono
```

- [x] **Step 3: Configure Tailwind with snip. color tokens**

Replace `frontend/tailwind.config.ts` with:

```typescript
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "#0d0d0d",
        surface: "#1a1a1a",
        "surface-hover": "#222222",
        accent: "#00ff88",
        "accent-dim": "#00ff8833",
        "accent-glow": "#0f1f17",
        "accent-border": "#00ff8866",
        muted: "#888888",
        faint: "#444444",
        danger: "#ff4444",
      },
      fontFamily: {
        mono: ["JetBrains Mono", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
```

- [x] **Step 4: Update globals.css**

Replace `frontend/app/globals.css` with:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@import "@fontsource/jetbrains-mono/400.css";
@import "@fontsource/jetbrains-mono/700.css";
@import "@fontsource/jetbrains-mono/900.css";

* {
  box-sizing: border-box;
}

body {
  background-color: #0d0d0d;
  color: #ffffff;
  font-family: "JetBrains Mono", monospace;
}

::selection {
  background-color: #00ff8833;
  color: #00ff88;
}

::-webkit-scrollbar {
  width: 6px;
}

::-webkit-scrollbar-track {
  background: #1a1a1a;
}

::-webkit-scrollbar-thumb {
  background: #00ff8844;
  border-radius: 3px;
}
```

- [x] **Step 5: Update root layout**

Replace `frontend/app/layout.tsx` with:

```tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "snip.",
  description: "make your links shorter",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-bg text-white font-mono min-h-screen">
        {children}
      </body>
    </html>
  );
}
```

- [x] **Step 6: Start dev server and verify blank dark page loads**

```bash
cd frontend && npm run dev
```

Open http://localhost:3000. Expected: dark background (`#0d0d0d`), no errors in console.

- [x] **Step 7: Commit**

```bash
git add frontend/
git commit -m "feat: scaffold Next.js frontend with Tailwind and snip. theme"
```

---

### Task 4: API client

**Files:**
- Create: `frontend/lib/api.ts`
- Create: `frontend/lib/api.test.ts`

- [x] **Step 1: Install jest + RTL for frontend**

```bash
cd frontend
npm install --save-dev jest jest-environment-jsdom @testing-library/react @testing-library/jest-dom ts-jest @types/jest
```

- [x] **Step 2: Add jest config**

Create `frontend/jest.config.ts`:

```typescript
import type { Config } from "jest";

const config: Config = {
  testEnvironment: "node",
  transform: { "^.+\\.tsx?$": ["ts-jest", { tsconfig: { jsx: "react" } }] },
  moduleNameMapper: { "^@/(.*)$": "<rootDir>/$1" },
};

export default config;
```

- [x] **Step 3: Write failing tests for API client**

Create `frontend/lib/api.test.ts`:

```typescript
import { createShortUrl, listUrls, getUrl, updateUrl, deleteUrl } from "./api";

const mockFetch = jest.fn();
global.fetch = mockFetch;

const mockResponse = {
  id: 1,
  url: "https://example.com",
  shortCode: "abc123",
  accessCount: 0,
  createdAt: "2026-01-01T00:00:00",
  updatedAt: "2026-01-01T00:00:00",
};

beforeEach(() => mockFetch.mockReset());

test("createShortUrl posts to /api/shorten", async () => {
  mockFetch.mockResolvedValue({ ok: true, json: async () => mockResponse });
  const result = await createShortUrl("https://example.com");
  expect(mockFetch).toHaveBeenCalledWith(
    "http://localhost:8081/api/shorten",
    expect.objectContaining({ method: "POST", body: JSON.stringify({ url: "https://example.com" }) })
  );
  expect(result.shortCode).toBe("abc123");
});

test("listUrls calls GET /api/shorten", async () => {
  mockFetch.mockResolvedValue({ ok: true, json: async () => [mockResponse] });
  const result = await listUrls();
  expect(mockFetch).toHaveBeenCalledWith("http://localhost:8081/api/shorten", expect.any(Object));
  expect(result).toHaveLength(1);
});

test("deleteUrl calls DELETE /api/shorten/abc123", async () => {
  mockFetch.mockResolvedValue({ ok: true, json: async () => ({}) });
  await deleteUrl("abc123");
  expect(mockFetch).toHaveBeenCalledWith(
    "http://localhost:8081/api/shorten/abc123",
    expect.objectContaining({ method: "DELETE" })
  );
});
```

- [x] **Step 4: Run tests — verify they fail**

```bash
cd frontend && npx jest lib/api.test.ts
```

Expected: `FAIL` — `api` module not found.

- [x] **Step 5: Create API client**

Create `frontend/lib/api.ts`:

```typescript
const BASE = "http://localhost:8081";

export interface ShortUrl {
  id: number;
  url: string;
  shortCode: string;
  accessCount: number;
  createdAt: string;
  updatedAt: string;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`${res.status}: ${body}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const createShortUrl = (url: string) =>
  request<ShortUrl>("/api/shorten", {
    method: "POST",
    body: JSON.stringify({ url }),
  });

export const listUrls = () =>
  request<ShortUrl[]>("/api/shorten", { method: "GET" });

export const getUrl = (code: string) =>
  request<ShortUrl>(`/api/shorten/${code}`, { method: "GET" });

export const getStats = (code: string) =>
  request<ShortUrl>(`/api/shorten/${code}/stats`, { method: "GET" });

export const updateUrl = (code: string, url: string) =>
  request<ShortUrl>(`/api/shorten/${code}`, {
    method: "PUT",
    body: JSON.stringify({ url }),
  });

export const deleteUrl = (code: string) =>
  request<void>(`/api/shorten/${code}`, { method: "DELETE" });
```

- [x] **Step 6: Run tests — verify they pass**

```bash
cd frontend && npx jest lib/api.test.ts
```

Expected: `PASS`, 3 tests green.

- [x] **Step 7: Commit**

```bash
git add frontend/lib/ frontend/jest.config.ts
git commit -m "feat: add typed API client for snip. backend"
```

---

## Phase 3: Components

### Task 5: NavBar

**Files:**
- Create: `frontend/components/NavBar.tsx`

- [x] **Step 1: Create NavBar component**

Create `frontend/components/NavBar.tsx`:

```tsx
import Link from "next/link";

export default function NavBar() {
  return (
    <nav className="border-b border-accent-dim px-6 py-4 flex items-center justify-between">
      <Link href="/" className="text-accent font-black text-xl tracking-tighter hover:opacity-80 transition-opacity">
        snip.
      </Link>
      <Link
        href="/dashboard"
        className="text-muted text-sm hover:text-accent transition-colors"
      >
        dashboard →
      </Link>
    </nav>
  );
}
```

- [x] **Step 2: Commit**

```bash
git add frontend/components/NavBar.tsx
git commit -m "feat: add NavBar component"
```

---

### Task 6: UrlInput and ResultCard

**Files:**
- Create: `frontend/components/UrlInput.tsx`
- Create: `frontend/components/ResultCard.tsx`

- [x] **Step 1: Create UrlInput component**

Create `frontend/components/UrlInput.tsx`:

```tsx
"use client";

import { useState } from "react";

interface Props {
  onShorten: (url: string) => Promise<void>;
  loading: boolean;
}

export default function UrlInput({ onShorten, loading }: Props) {
  const [value, setValue] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!value.trim()) {
      setError("paste a url first.");
      return;
    }
    try {
      await onShorten(value.trim());
      setValue("");
    } catch {
      setError("something went wrong. try again.");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-xl">
      <div className="flex flex-col gap-2">
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="https://very-long-url.com/paste/here"
          className="w-full bg-surface border border-accent-dim rounded-lg px-4 py-3 text-sm text-white placeholder-faint focus:outline-none focus:border-accent transition-colors"
          disabled={loading}
        />
        {error && (
          <p className="text-danger text-xs">{error}</p>
        )}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-accent text-bg font-black py-3 rounded-lg text-sm tracking-widest hover:opacity-90 active:opacity-75 transition-opacity disabled:opacity-50"
        >
          {loading ? "shortening..." : "SHORTEN →"}
        </button>
      </div>
    </form>
  );
}
```

- [x] **Step 2: Create ResultCard component**

Create `frontend/components/ResultCard.tsx`:

```tsx
"use client";

import { useState } from "react";
import type { ShortUrl } from "@/lib/api";

interface Props {
  result: ShortUrl;
  onReset: () => void;
}

const SHORT_BASE = "http://localhost:8081";

export default function ResultCard({ result, onReset }: Props) {
  const [copied, setCopied] = useState(false);

  const shortUrl = `${SHORT_BASE}/${result.shortCode}`;

  async function handleCopy() {
    await navigator.clipboard.writeText(shortUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="w-full max-w-xl bg-accent-glow border border-accent rounded-lg px-4 py-4 flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-col gap-1 min-w-0">
          <span className="text-accent font-black text-lg tracking-tight truncate">
            {shortUrl}
          </span>
          <span className="text-faint text-xs truncate">{result.url}</span>
        </div>
        <button
          onClick={handleCopy}
          className="shrink-0 bg-accent text-bg font-black px-4 py-2 rounded text-xs tracking-widest hover:opacity-90 active:opacity-75 transition-opacity"
        >
          {copied ? "COPIED!" : "COPY"}
        </button>
      </div>
      <button
        onClick={onReset}
        className="text-faint text-xs hover:text-accent transition-colors text-left"
      >
        shorten another? →
      </button>
    </div>
  );
}
```

- [x] **Step 3: Commit**

```bash
git add frontend/components/UrlInput.tsx frontend/components/ResultCard.tsx
git commit -m "feat: add UrlInput and ResultCard components"
```

---

### Task 7: LinkRow and LinkTable

**Files:**
- Create: `frontend/components/LinkRow.tsx`
- Create: `frontend/components/LinkTable.tsx`

- [x] **Step 1: Create LinkRow component**

Create `frontend/components/LinkRow.tsx`:

```tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import type { ShortUrl } from "@/lib/api";

interface Props {
  link: ShortUrl;
  onDelete: (code: string) => Promise<void>;
}

const SHORT_BASE = "http://localhost:8081";

export default function LinkRow({ link, onDelete }: Props) {
  const [copied, setCopied] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const shortUrl = `${SHORT_BASE}/${link.shortCode}`;

  async function handleCopy() {
    await navigator.clipboard.writeText(shortUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleDelete() {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    setDeleting(true);
    try {
      await onDelete(link.shortCode);
    } finally {
      setDeleting(false);
      setConfirming(false);
    }
  }

  const createdDate = new Date(link.createdAt).toLocaleDateString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
  });

  return (
    <tr className={`border-b border-surface-hover transition-colors ${confirming ? "bg-danger/5" : "hover:bg-surface-hover"}`}>
      <td className="px-4 py-3">
        <span className="text-accent text-sm font-bold">{link.shortCode}</span>
      </td>
      <td className="px-4 py-3 max-w-xs">
        <span className="text-muted text-xs truncate block">{link.url}</span>
      </td>
      <td className="px-4 py-3 text-faint text-xs whitespace-nowrap">{createdDate}</td>
      <td className="px-4 py-3 text-faint text-xs">{link.accessCount}</td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <button onClick={handleCopy} className="text-xs text-muted hover:text-accent transition-colors">
            {copied ? "copied!" : "copy"}
          </button>
          <Link href={`/edit/${link.shortCode}`} className="text-xs text-muted hover:text-accent transition-colors">
            edit
          </Link>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className={`text-xs transition-colors ${confirming ? "text-danger font-bold" : "text-muted hover:text-danger"}`}
          >
            {confirming ? (deleting ? "..." : "confirm?") : "delete"}
          </button>
          {confirming && (
            <button onClick={() => setConfirming(false)} className="text-xs text-faint hover:text-muted transition-colors">
              cancel
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}
```

- [x] **Step 2: Create LinkTable component**

Create `frontend/components/LinkTable.tsx`:

```tsx
"use client";

import LinkRow from "./LinkRow";
import type { ShortUrl } from "@/lib/api";

interface Props {
  links: ShortUrl[];
  onDelete: (code: string) => Promise<void>;
}

export default function LinkTable({ links, onDelete }: Props) {
  if (links.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-faint text-sm">no links yet.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-surface-hover">
            <th className="px-4 py-3 text-left text-xs text-faint font-normal tracking-widest uppercase">Short Code</th>
            <th className="px-4 py-3 text-left text-xs text-faint font-normal tracking-widest uppercase">Original URL</th>
            <th className="px-4 py-3 text-left text-xs text-faint font-normal tracking-widest uppercase">Created</th>
            <th className="px-4 py-3 text-left text-xs text-faint font-normal tracking-widest uppercase">Clicks</th>
            <th className="px-4 py-3 text-left text-xs text-faint font-normal tracking-widest uppercase">Actions</th>
          </tr>
        </thead>
        <tbody>
          {links.map((link) => (
            <LinkRow key={link.shortCode} link={link} onDelete={onDelete} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [x] **Step 3: Commit**

```bash
git add frontend/components/LinkRow.tsx frontend/components/LinkTable.tsx
git commit -m "feat: add LinkRow and LinkTable components"
```

---

## Phase 4: Pages

### Task 8: Home page

**Files:**
- Modify: `frontend/app/page.tsx`

- [x] **Step 1: Write home page**

Replace `frontend/app/page.tsx` with:

```tsx
"use client";

import { useState, useEffect } from "react";
import { createShortUrl, listUrls, deleteUrl } from "@/lib/api";
import type { ShortUrl } from "@/lib/api";
import UrlInput from "@/components/UrlInput";
import ResultCard from "@/components/ResultCard";
import LinkRow from "@/components/LinkRow";
import Link from "next/link";

export default function HomePage() {
  const [result, setResult] = useState<ShortUrl | null>(null);
  const [loading, setLoading] = useState(false);
  const [recent, setRecent] = useState<ShortUrl[]>([]);

  useEffect(() => {
    listUrls()
      .then((all) => setRecent(all.slice(-5).reverse()))
      .catch(() => {});
  }, []);

  async function handleShorten(url: string) {
    setLoading(true);
    try {
      const created = await createShortUrl(url);
      setResult(created);
      setRecent((prev) => [created, ...prev.slice(0, 4)]);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(code: string) {
    await deleteUrl(code);
    setRecent((prev) => prev.filter((l) => l.shortCode !== code));
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-start pt-24 px-4 pb-16">
      {/* Header */}
      <div className="text-center mb-10">
        <h1 className="text-accent font-black text-5xl tracking-tighter leading-none">snip.</h1>
        <p className="text-muted text-sm mt-2">make your links shorter</p>
      </div>

      {/* Input / Result — transforms in place */}
      <div className="w-full max-w-xl">
        {result ? (
          <ResultCard result={result} onReset={() => setResult(null)} />
        ) : (
          <UrlInput onShorten={handleShorten} loading={loading} />
        )}
      </div>

      {/* Recent links */}
      {recent.length > 0 && (
        <div className="w-full max-w-xl mt-12">
          <div className="flex items-center justify-between mb-3">
            <span className="text-faint text-xs tracking-widest uppercase">Recent</span>
            <Link href="/dashboard" className="text-faint text-xs hover:text-accent transition-colors">
              view all →
            </Link>
          </div>
          <div className="flex flex-col gap-2">
            {recent.map((link) => (
              <div key={link.shortCode} className="bg-surface rounded-lg px-4 py-3 flex items-center justify-between gap-3">
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className="text-accent text-sm font-bold">
                    localhost:8081/{link.shortCode}
                  </span>
                  <span className="text-faint text-xs truncate">{link.url}</span>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <button
                    onClick={() => navigator.clipboard.writeText(`http://localhost:8081/${link.shortCode}`)}
                    className="text-xs text-muted hover:text-accent transition-colors"
                  >
                    copy
                  </button>
                  <Link href={`/edit/${link.shortCode}`} className="text-xs text-muted hover:text-accent transition-colors">
                    edit
                  </Link>
                  <button
                    onClick={() => handleDelete(link.shortCode)}
                    className="text-xs text-muted hover:text-danger transition-colors"
                  >
                    delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
```

- [x] **Step 2: Manually test home page**

With backend running on 8081 and frontend on 3000:
1. Open http://localhost:3000
2. Paste a URL → hit SHORTEN → result card should appear with short URL + COPY button
3. Click "shorten another?" → input returns
4. Shorten 2–3 more — recent list appears below
5. Click copy on a recent link → verify clipboard

- [x] **Step 3: Commit**

```bash
git add frontend/app/page.tsx
git commit -m "feat: implement home page with URL shorten + result transform"
```

---

### Task 9: Dashboard page

**Files:**
- Create: `frontend/app/dashboard/page.tsx`

- [x] **Step 1: Create dashboard page**

Create `frontend/app/dashboard/page.tsx`:

```tsx
"use client";

import { useState, useEffect } from "react";
import { listUrls, deleteUrl } from "@/lib/api";
import type { ShortUrl } from "@/lib/api";
import NavBar from "@/components/NavBar";
import LinkTable from "@/components/LinkTable";
import Link from "next/link";

export default function DashboardPage() {
  const [links, setLinks] = useState<ShortUrl[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    listUrls()
      .then(setLinks)
      .catch(() => setError("failed to load links."))
      .finally(() => setLoading(false));
  }, []);

  async function handleDelete(code: string) {
    await deleteUrl(code);
    setLinks((prev) => prev.filter((l) => l.shortCode !== code));
  }

  return (
    <div className="min-h-screen">
      <NavBar />
      <main className="max-w-5xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-accent font-black text-2xl tracking-tight">all links</h1>
          <Link href="/" className="text-faint text-sm hover:text-accent transition-colors">
            + shorten new
          </Link>
        </div>

        {loading && <p className="text-faint text-sm">loading...</p>}
        {error && <p className="text-danger text-sm">{error}</p>}
        {!loading && !error && (
          <LinkTable links={links} onDelete={handleDelete} />
        )}
      </main>
    </div>
  );
}
```

- [x] **Step 2: Manually test dashboard**

1. Open http://localhost:3000/dashboard
2. All links should appear in the table
3. Click delete on a link → row turns red bg → "confirm?" text → click again → row removed
4. Click edit on a link → should navigate to `/edit/{code}` (page not yet built — expected 404)
5. Click "copy" → verify clipboard

- [x] **Step 3: Commit**

```bash
git add frontend/app/dashboard/page.tsx
git commit -m "feat: implement dashboard page with full links table"
```

---

### Task 10: Analytics page

**Files:**
- Create: `frontend/app/dashboard/[code]/page.tsx`

- [x] **Step 1: Create analytics page**

Create `frontend/app/dashboard/[code]/page.tsx`:

```tsx
"use client";

import { useState, useEffect } from "react";
import { getStats } from "@/lib/api";
import type { ShortUrl } from "@/lib/api";
import NavBar from "@/components/NavBar";
import Link from "next/link";

const SHORT_BASE = "http://localhost:8081";

export default function AnalyticsPage({ params }: { params: { code: string } }) {
  const [data, setData] = useState<ShortUrl | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    getStats(params.code)
      .then(setData)
      .catch(() => setError("link not found."))
      .finally(() => setLoading(false));
  }, [params.code]);

  async function handleCopy() {
    if (!data) return;
    await navigator.clipboard.writeText(`${SHORT_BASE}/${data.shortCode}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const createdDate = data
    ? new Date(data.createdAt).toLocaleDateString("en-GB", {
        day: "2-digit", month: "long", year: "numeric",
      })
    : "";

  return (
    <div className="min-h-screen">
      <NavBar />
      <main className="max-w-xl mx-auto px-6 py-10">
        <Link href="/dashboard" className="text-faint text-xs hover:text-accent transition-colors">
          ← back to dashboard
        </Link>

        {loading && <p className="text-faint text-sm mt-8">loading...</p>}
        {error && <p className="text-danger text-sm mt-8">{error}</p>}

        {data && (
          <div className="mt-8 flex flex-col gap-6">
            <h1 className="text-accent font-black text-3xl tracking-tight">
              {data.shortCode}
            </h1>

            {/* Stats grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-surface rounded-lg px-4 py-4">
                <p className="text-faint text-xs tracking-widest uppercase mb-1">Total Clicks</p>
                <p className="text-accent font-black text-3xl">{data.accessCount}</p>
              </div>
              <div className="bg-surface rounded-lg px-4 py-4">
                <p className="text-faint text-xs tracking-widest uppercase mb-1">Created</p>
                <p className="text-white text-sm font-bold mt-1">{createdDate}</p>
              </div>
            </div>

            {/* Original URL */}
            <div className="bg-surface rounded-lg px-4 py-4">
              <p className="text-faint text-xs tracking-widest uppercase mb-2">Original URL</p>
              <a
                href={data.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted text-sm break-all hover:text-accent transition-colors"
              >
                {data.url}
              </a>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={handleCopy}
                className="flex-1 bg-accent text-bg font-black py-3 rounded-lg text-sm tracking-widest hover:opacity-90 transition-opacity"
              >
                {copied ? "COPIED!" : "COPY SHORT LINK"}
              </button>
              <Link
                href={`/edit/${data.shortCode}`}
                className="px-6 py-3 border border-accent-dim rounded-lg text-accent text-sm hover:bg-surface transition-colors flex items-center"
              >
                edit
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
```

- [x] **Step 2: Manually test analytics page**

1. Go to http://localhost:3000/dashboard
2. Click a short code directly (navigate to `/dashboard/{code}`)
3. Stats card should show total clicks + created date + original URL
4. Click the short link via browser or curl — `curl -v http://localhost:8081/{code}` — access count should increment
5. Reload analytics page — count should be higher

- [x] **Step 3: Commit**

```bash
git add frontend/app/dashboard/
git commit -m "feat: implement analytics page with click count and link metadata"
```

---

### Task 11: Edit page

**Files:**
- Create: `frontend/app/edit/[code]/page.tsx`

- [x] **Step 1: Create edit page**

Create `frontend/app/edit/[code]/page.tsx`:

```tsx
"use client";

import { useState, useEffect } from "react";
import { getUrl, updateUrl } from "@/lib/api";
import NavBar from "@/components/NavBar";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function EditPage({ params }: { params: { code: string } }) {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    getUrl(params.code)
      .then((data) => setValue(data.url))
      .catch(() => setError("link not found."))
      .finally(() => setLoading(false));
  }, [params.code]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!value.trim()) {
      setError("url cannot be empty.");
      return;
    }
    setSaving(true);
    try {
      await updateUrl(params.code, value.trim());
      router.push("/dashboard");
    } catch {
      setError("failed to save. check the url and try again.");
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen">
      <NavBar />
      <main className="max-w-xl mx-auto px-6 py-10">
        <Link href="/dashboard" className="text-faint text-xs hover:text-accent transition-colors">
          ← back to dashboard
        </Link>

        <h1 className="text-white font-black text-2xl tracking-tight mt-8 mb-1">
          editing{" "}
          <span className="text-accent">snip./{params.code}</span>
        </h1>
        <p className="text-faint text-xs mb-8">update the destination url</p>

        {loading && <p className="text-faint text-sm">loading...</p>}

        {!loading && (
          <form onSubmit={handleSave} className="flex flex-col gap-3">
            <input
              type="text"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="https://new-destination.com"
              className={`w-full bg-surface border rounded-lg px-4 py-3 text-sm text-white placeholder-faint focus:outline-none transition-colors ${
                error ? "border-danger" : "border-accent-dim focus:border-accent"
              }`}
              disabled={saving}
            />
            {error && <p className="text-danger text-xs">{error}</p>}
            <div className="flex gap-3 mt-2">
              <button
                type="submit"
                disabled={saving}
                className="flex-1 bg-accent text-bg font-black py-3 rounded-lg text-sm tracking-widest hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                {saving ? "saving..." : "SAVE →"}
              </button>
              <Link
                href="/dashboard"
                className="px-6 py-3 border border-surface-hover rounded-lg text-faint text-sm hover:text-muted transition-colors flex items-center"
              >
                cancel
              </Link>
            </div>
          </form>
        )}
      </main>
    </div>
  );
}
```

- [x] **Step 2: Manually test edit page**

1. Go to http://localhost:3000/dashboard
2. Click edit on any link → navigates to `/edit/{code}`
3. Input should be prefilled with current URL
4. Clear it and leave blank → "url cannot be empty." error
5. Enter a valid new URL → click SAVE → redirected to `/dashboard` → URL updated in table

- [x] **Step 3: Commit**

```bash
git add frontend/app/edit/
git commit -m "feat: implement edit page with prefilled form and redirect on save"
```

---

### Task 12: 404 page

**Files:**
- Create: `frontend/app/not-found.tsx`

- [x] **Step 1: Create not-found page**

Create `frontend/app/not-found.tsx`:

```tsx
import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-4">
      <span className="text-accent font-black text-8xl tracking-tighter">404</span>
      <p className="text-faint text-sm">this link doesn&apos;t exist.</p>
      <Link href="/" className="text-muted text-xs hover:text-accent transition-colors mt-2">
        ← back to snip.
      </Link>
    </main>
  );
}
```

- [x] **Step 2: Verify 404 page**

Navigate to http://localhost:3000/some-nonexistent-route. Expected: `404` in large green text with the back link.

- [x] **Step 3: Final smoke test — all pages**

| URL | Expected |
|---|---|
| http://localhost:3000 | Home: centered input, dark bg, accent green |
| Paste URL + SHORTEN | Result card replaces input |
| "shorten another?" | Input returns |
| Recent links list | Shows last 5 links |
| http://localhost:3000/dashboard | Full table with all links |
| Edit → save | Redirects to dashboard |
| http://localhost:3000/dashboard/{code} | Stats: click count + date + original URL |
| http://localhost:8081/{code} | 302 redirect to original URL |
| http://localhost:3000/nonexistent | 404 page |

- [x] **Step 4: Commit**

```bash
git add frontend/app/not-found.tsx
git commit -m "feat: add 404 not-found page"
```
