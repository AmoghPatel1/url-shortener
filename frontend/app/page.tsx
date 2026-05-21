"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { createShortUrl, listUrls } from "@/lib/api";
import type { ShortUrl } from "@/lib/api";
import TopBar from "@/components/TopBar";
import StickerCard from "@/components/StickerCard";
import ChunkyBtn from "@/components/ChunkyBtn";
import LoopSlug from "@/components/LoopSlug";

const FILLS = ["var(--lemon)", "var(--mint)", "var(--sky)", "var(--rose)", "var(--lilac)"];
const TILTS = [-1, 1.2, -0.8, 1, -1.5];

function relTime(iso: string) {
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function shortHost(u: string) {
  try { return new URL(u).hostname.replace(/^www\./, ""); }
  catch { return u; }
}

function Spinner() {
  return (
    <span
      style={{
        display: "inline-block",
        width: 14,
        height: 14,
        border: "2px solid #fff",
        borderTopColor: "transparent",
        borderRadius: "50%",
        animation: "loopSpin 0.7s linear infinite",
      }}
    />
  );
}

export default function HomePage() {
  const [url, setUrl] = useState("");
  const [custom, setCustom] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<ShortUrl | null>(null);
  const [recent, setRecent] = useState<ShortUrl[]>([]);
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    listUrls()
      .then((all) => setRecent(all.slice(0, 5)))
      .catch(() => {});
  }, []);

  async function handleSubmit() {
    if (!url.trim()) return;
    if (!/^https?:\/\//i.test(url.trim())) {
      setError("Needs http:// or https://");
      setTimeout(() => setError(""), 1800);
      return;
    }
    setBusy(true);
    setError("");
    try {
      const created = await createShortUrl(url.trim());
      setResult(created);
      setUrl("");
      setCustom("");
      setRecent((prev) => [created, ...prev.slice(0, 4)]);
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  }

  function handleCopy(code: string) {
    const base = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8081";
    navigator.clipboard.writeText(`${base}/${code}`).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  return (
    <div
      className="dot-bg"
      style={{
        minHeight: "100vh",
        background: "var(--paper)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <TopBar />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 360px",
          flex: 1,
          minHeight: 0,
        }}
      >
        {/* Main column */}
        <main style={{ padding: "40px 56px 48px", overflow: "auto" }}>
          {/* Hero headline */}
          <h1
            style={{
              fontFamily: "var(--font-sans)",
              fontWeight: 700,
              fontSize: "clamp(48px, 6vw, 78px)",
              lineHeight: 0.94,
              letterSpacing: "-3.4px",
              margin: "8px 0 16px",
              color: "var(--ink)",
            }}
          >
            Loop a long link
            <br />
            into a{" "}
            <span
              style={{
                display: "inline-block",
                background: "var(--lemon)",
                padding: "2px 16px",
                borderRadius: 14,
                transform: "rotate(-3deg)",
                border: "2.5px solid var(--ink)",
                boxShadow: "0 4px 0 var(--ink)",
              }}
            >
              tiny
            </span>{" "}
            one.
          </h1>

          <p
            style={{
              fontSize: 16,
              color: "var(--ink-soft)",
              margin: "0 0 36px",
              maxWidth: 480,
              lineHeight: 1.55,
              fontFamily: "var(--font-sans)",
            }}
          >
            Paste anything. We&apos;ll squish it into something pocketable. Pick a
            custom slug if you want it memorable.
          </p>

          {/* Input card */}
          <div style={{ marginBottom: 22 }}>
            <StickerCard
              tilt={-0.6}
              hoverLevel={false}
              padding="20px 22px 18px"
              style={{
                animation: error ? "loopShake 0.35s" : undefined,
              }}
            >
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 13,
                  fontWeight: 700,
                  color: "var(--ink)",
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                  marginBottom: 8,
                }}
              >
                Paste your long URL
              </div>
              <div style={{ position: "relative" }}>
                <input
                  ref={inputRef}
                  value={url}
                  onChange={(e) => { setUrl(e.target.value); if (error) setError(""); }}
                  onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                  placeholder="paste your link..."
                  autoFocus
                  style={{
                    width: "100%",
                    border: "none",
                    borderBottom: "2.5px solid var(--ink)",
                    outline: "none",
                    background: "transparent",
                    fontFamily: "var(--font-sans)",
                    fontSize: 22,
                    fontWeight: 600,
                    padding: "6px 0 12px",
                    color: "var(--ink)",
                    letterSpacing: -0.6,
                    caretColor: "var(--pop)",
                  }}
                />
                {!url && (
                  <span
                    aria-hidden
                    style={{
                      position: "absolute",
                      left: 0,
                      top: 6,
                      fontSize: 22,
                      fontWeight: 600,
                      lineHeight: 1,
                      color: "var(--pop)",
                      pointerEvents: "none",
                      animation: "loopCaret 1s step-end infinite",
                      userSelect: "none",
                    }}
                  >
                    |
                  </span>
                )}
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr auto",
                  gap: 14,
                  alignItems: "center",
                  paddingTop: 12,
                  borderTop: "1.5px solid rgba(26,26,26,0.12)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "6px 12px",
                    background: "var(--paper)",
                    borderRadius: 8,
                    border: "2px solid var(--ink)",
                  }}
                >
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 10,
                      color: "var(--mute)",
                      textTransform: "uppercase",
                      letterSpacing: 0.5,
                      whiteSpace: "nowrap",
                      flexShrink: 0,
                    }}
                  >
                    Slug (opt)
                  </span>
                  <span style={{ color: "var(--mute)", fontSize: 13, lineHeight: 1 }}>·</span>
                  <span
                    style={{
                      fontFamily: "var(--font-sans)",
                      fontSize: 14,
                      color: "var(--mute)",
                      fontWeight: 600,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {(process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8081").replace(/^https?:\/\//, "")}/
                  </span>
                  <input
                    value={custom}
                    onChange={(e) =>
                      setCustom(
                        e.target.value.replace(/[^a-z0-9-]/gi, "").toLowerCase()
                      )
                    }
                    placeholder="my-link"
                    style={{
                      flex: 1,
                      border: "none",
                      outline: "none",
                      background: "transparent",
                      fontFamily: "var(--font-mono)",
                      fontSize: 14,
                      color: "var(--ink)",
                      padding: 0,
                      minWidth: 0,
                    }}
                  />
                </div>

                <ChunkyBtn
                  kind="pop"
                  size="lg"
                  onClick={handleSubmit}
                  disabled={busy || !url.trim()}
                  icon={busy ? <Spinner /> : undefined}
                >
                  {busy ? "Looping…" : "Make loop →"}
                </ChunkyBtn>
              </div>

              {error && (
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 12,
                    color: "var(--danger)",
                    marginTop: 8,
                  }}
                >
                  ! {error}
                </div>
              )}
            </StickerCard>
          </div>

          {/* Result or how-it-works */}
          {result ? (
            <div
              key={result.shortCode}
              style={{ animation: "loopPop 0.4s cubic-bezier(0.2, 1.4, 0.4, 1)" }}
            >
              <StickerCard
                fill="var(--mint)"
                tilt={-1.6}
                hoverLevel={false}
                padding="22px 26px"
                style={{ position: "relative" }}
              >
                <div
                  style={{
                    position: "absolute",
                    top: -12,
                    right: 24,
                    background: "var(--pop)",
                    color: "#fff",
                    fontFamily: "var(--font-mono)",
                    fontSize: 11,
                    padding: "4px 12px",
                    borderRadius: 999,
                    border: "2px solid var(--ink)",
                    fontWeight: 700,
                    letterSpacing: 0.5,
                    transform: "rotate(6deg)",
                    boxShadow: "0 2px 0 var(--ink)",
                  }}
                >
                  ✨ NEW
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 11,
                    color: "var(--ink)",
                    opacity: 0.7,
                    textTransform: "uppercase",
                    letterSpacing: 1,
                    marginBottom: 10,
                  }}
                >
                  Your tiny link
                </div>
                <div style={{ marginBottom: 10 }}>
                  <LoopSlug code={result.shortCode} size="xl" />
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 12,
                    color: "var(--ink)",
                    opacity: 0.65,
                    marginBottom: 18,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  ↳ {result.url}
                </div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <ChunkyBtn
                    kind={copied ? "lemon" : "soft"}
                    onClick={() => handleCopy(result.shortCode)}
                  >
                    {copied ? "✓ Copied!" : "Copy"}
                  </ChunkyBtn>
                  <Link href={`/edit/${result.shortCode}`} style={{ textDecoration: "none" }}>
                    <ChunkyBtn kind="soft">Edit</ChunkyBtn>
                  </Link>
                  <div style={{ flex: 1 }} />
                  <ChunkyBtn kind="soft" size="sm" onClick={() => setResult(null)}>
                    + New
                  </ChunkyBtn>
                </div>
              </StickerCard>
            </div>
          ) : (
            <StickerCard fill="var(--sky)" tilt={1} padding="16px 22px">
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  color: "var(--ink)",
                  textTransform: "uppercase",
                  letterSpacing: 1,
                  fontWeight: 600,
                  marginBottom: 6,
                }}
              >
                How it works
              </div>
              <div
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: 14,
                  color: "var(--ink)",
                  lineHeight: 1.6,
                }}
              >
                ① Paste a URL · ② Hit{" "}
                <span
                  style={{
                    background: "var(--paper2)",
                    padding: "1px 8px",
                    borderRadius: 6,
                    border: "1.5px solid var(--ink)",
                    fontFamily: "var(--font-mono)",
                    fontSize: 12,
                  }}
                >
                  ↵
                </span>{" "}
                · ③ Share. Custom slugs are lowercase, hyphens ok.
              </div>
            </StickerCard>
          )}
        </main>

        {/* Recent sidebar */}
        <aside
          style={{
            borderLeft: "2px solid var(--ink)",
            background: "var(--paper2)",
            padding: "32px 28px",
            overflow: "auto",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              justifyContent: "space-between",
              marginBottom: 18,
            }}
          >
            <h2
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 22,
                fontWeight: 700,
                letterSpacing: -0.6,
                margin: 0,
                color: "var(--ink)",
              }}
            >
              Recent
            </h2>
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                color: "var(--mute)",
              }}
            >
              {recent.length} links
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {recent.length === 0 ? (
              <p
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: 13,
                  color: "var(--mute)",
                  textAlign: "center",
                  marginTop: 32,
                }}
              >
                No loops yet. Make one!
              </p>
            ) : (
              recent.map((u, i) => (
                <StickerCard
                  key={u.shortCode}
                  fill={FILLS[i % FILLS.length]}
                  tilt={TILTS[i % TILTS.length]}
                  padding="10px 14px"
                >
                  <div style={{ marginBottom: 4 }}>
                    <LoopSlug code={u.shortCode} size="sm" />
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 10.5,
                      color: "var(--ink)",
                      opacity: 0.75,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    ↳ {shortHost(u.url)}
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 10,
                      color: "var(--ink)",
                      opacity: 0.6,
                      marginTop: 4,
                      display: "flex",
                      justifyContent: "space-between",
                    }}
                  >
                    <span>{relTime(u.createdAt)}</span>
                    <span>{u.accessCount.toLocaleString()} clicks</span>
                  </div>
                </StickerCard>
              ))
            )}
          </div>

          {recent.length > 0 && (
            <div style={{ marginTop: 20 }}>
              <Link href="/dashboard" style={{ textDecoration: "none" }}>
                <ChunkyBtn kind="soft" full size="sm">
                  See all loops →
                </ChunkyBtn>
              </Link>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
