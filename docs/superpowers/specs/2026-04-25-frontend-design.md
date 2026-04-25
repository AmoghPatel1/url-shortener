# snip. — Frontend Design Spec

**Date:** 2026-04-25
**Scope:** Next.js frontend for the url-shortener project

---

## Visual Identity

| Token | Value |
|---|---|
| Background | `#0d0d0d` |
| Surface (cards, inputs) | `#1a1a1a` |
| Surface hover | `#222222` |
| Accent | `#00ff88` |
| Accent dim | `#00ff8833` (borders), `#00ff8866` (icons) |
| Accent bg (result card) | `#0f1f17` |
| Text primary | `#ffffff` |
| Text secondary | `#888888` |
| Text muted | `#444444` |
| Danger | `#ff4444` |
| Font | JetBrains Mono (Google Fonts) — monospace throughout |

---

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Styling:** Tailwind CSS
- **HTTP client:** fetch (native) — calls backend at `http://localhost:8081/api`
- **No auth** — public app

---

## Pages

| Route | Component | Purpose |
|---|---|---|
| `/` | `HomePage` | Shorten a URL, see recent links |
| `/dashboard` | `DashboardPage` | All links — table with copy/edit/delete |
| `/dashboard/[code]` | `AnalyticsPage` | Click count + metadata for one link |
| `/edit/[code]` | `EditPage` | Edit destination URL for a short code |
| `not-found.tsx` | `NotFound` | 404 styled page |

---

## Page Designs

### Home (`/`)

**Layout:** Vertically centered on full viewport height.

**Structure (top to bottom):**
1. `snip.` logo — large monospace, accent color, with dot
2. Tagline — `"make your links shorter"` in muted text
3. URL input — full-width, dark surface, accent border on focus
4. SHORTEN button — accent background, black text, full-width below input
5. **Result area** (hidden until first shorten):
   - Input area transforms in-place into a result card
   - Card shows: short URL in large accent text + COPY button
   - Sub-line shows original URL truncated
   - "shorten another?" link resets to input state
6. Recent links section (below the fold):
   - Label: `RECENT` in small muted caps
   - Last 5 links from `GET /api/urls`, sorted by `createdAt` desc
   - Each row: short code | truncated original URL | copy icon | edit icon | delete icon

**Transform interaction:**
- State A (default): input + button visible
- State B (after shorten): result card visible, same container dimensions
- Transition: CSS opacity + translate, ~200ms
- Reset: clicking "shorten another?" returns to State A with cleared input

---

### Dashboard (`/dashboard`)

**Layout:** Full page. Top navbar with `snip.` logo linking to `/`. 

**Structure:**
1. Page title: `all links` in accent
2. Table columns: SHORT LINK | ORIGINAL URL | CREATED | CLICKS | ACTIONS
3. Each row actions: copy icon, edit icon (→ `/edit/[code]`), delete icon
4. Delete: inline confirmation (row highlights red, shows confirm/cancel — no modal)
5. Empty state: centered message `"no links yet."` + button to go home
6. Pagination: none (show all, scroll)

---

### Analytics (`/dashboard/[code]`)

**Layout:** Centered card. Back link to `/dashboard`.

**Structure:**
1. Short code as heading in accent
2. Stats grid (2 columns):
   - TOTAL CLICKS
   - CREATED
3. Original URL (full, copyable)
4. COPY SHORT LINK button
5. Edit link → `/edit/[code]`

**Data source:** `GET /api/urls/{code}` — reads `clickCount` field from response.

---

### Edit (`/edit/[code]`)

**Layout:** Centered, minimal. Back link to `/dashboard`.

**Structure:**
1. Label: `editing snip.io/[code]`
2. URL input prefilled with current `originalUrl`
3. SAVE button (accent) + CANCEL link (muted, goes back)
4. On save: calls `PUT /api/urls/{code}`, then redirects to `/dashboard`
5. Error state: red border on input + error message below

---

### 404 (`not-found.tsx`)

Centered. Shows `404` in large accent monospace. Subline: `"this link doesn't exist."` Link back to `/`.

---

## API Integration

All calls to `http://localhost:8081/api`.

| Action | Method | Endpoint |
|---|---|---|
| List all URLs | GET | `/urls` |
| Create short URL | POST | `/urls` |
| Get by code | GET | `/urls/{code}` |
| Update URL | PUT | `/urls/{code}` |
| Delete URL | DELETE | `/urls/{code}` |

---

## Backend Additions Required

These don't exist yet and must be implemented before analytics works:

1. **Flyway migration** — add `click_count BIGINT NOT NULL DEFAULT 0` to `short_urls`
2. **Redirect endpoint** — `GET /{code}` → 302 redirect to `originalUrl`, increments `click_count`
3. **Stats exposed** — `clickCount` field included in existing API responses (no new endpoint needed)

Analytics page renders `clickCount: 0` until redirect endpoint exists — no blocking dependency for frontend build.

---

## Component Structure

```
frontend/
  app/
    layout.tsx           # Root layout — JetBrains Mono font, dark bg
    page.tsx             # Home
    dashboard/
      page.tsx           # Dashboard
      [code]/
        page.tsx         # Analytics
    edit/
      [code]/
        page.tsx         # Edit
    not-found.tsx        # 404
  components/
    UrlInput.tsx         # Input + button (home page)
    ResultCard.tsx       # Post-shorten result display
    LinkRow.tsx          # Single row in recent/dashboard lists
    LinkTable.tsx        # Full dashboard table
    NavBar.tsx           # Top bar (dashboard + inner pages)
```

---

## Out of Scope

- Authentication / user accounts
- Custom short codes (user-defined)
- QR codes
- Link expiry
- Mobile-specific native features
