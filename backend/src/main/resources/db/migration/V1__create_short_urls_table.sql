-- ── Table: short_urls ─────────────────────────────────────────────────────
CREATE TABLE short_urls
(
    id           BIGINT        NOT NULL GENERATED ALWAYS AS IDENTITY,
    short_code   VARCHAR(20)   NOT NULL,
    original_url VARCHAR(2048) NOT NULL,
    access_count BIGINT        NOT NULL DEFAULT 0,
    created_at   TIMESTAMP     NOT NULL,
    updated_at   TIMESTAMP     NOT NULL,

    CONSTRAINT pk_short_urls PRIMARY KEY (id)
);

-- ── Unique Index: short_code ──────────────────────────────────────────────
CREATE UNIQUE INDEX idx_short_urls_short_code
    ON short_urls (short_code);



-- Why GENERATED ALWAYS AS IDENTITY over SERIAL
-- sql-- ❌ SERIAL — older PostgreSQL syntax, not SQL standard
-- id SERIAL PRIMARY KEY
--
-- -- ❌ AUTO_INCREMENT — MySQL syntax, doesn't work in PostgreSQL
-- id BIGINT NOT NULL AUTO_INCREMENT
--
-- -- ✅ GENERATED ALWAYS AS IDENTITY — modern PostgreSQL (10+), SQL standard
-- id BIGINT NOT NULL GENERATED ALWAYS AS IDENTITY


-- Why Separate CREATE UNIQUE INDEX over UNIQUE constraint
-- -- ✅ UNIQUE constraint — simpler but less flexible
-- short_code VARCHAR(20) NOT NULL UNIQUE
--
-- -- ✅ CREATE UNIQUE INDEX — preferred, gives you:
-- --    - explicit index name (easier to drop/manage)
-- --    - visible in query planner
-- --    - consistent naming convention across migrations
-- CREATE UNIQUE INDEX idx_short_urls_short_code ON short_urls (short_code);
-- ```