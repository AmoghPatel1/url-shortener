"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getUrl } from "@/lib/api";
import type { ShortUrl } from "@/lib/api";
import TopBar from "@/components/TopBar";
import StickerCard from "@/components/StickerCard";
import ChunkyBtn from "@/components/ChunkyBtn";
import LoopSlug from "@/components/LoopSlug";

function relDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" });
}

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

/* Deterministic fake time-series from click count */
function buildSeries(totalClicks: number, code: string) {
  const seed = code.split("").reduce((s, c) => s + c.charCodeAt(0), 0);
  const rnd = (i: number) => ((Math.sin(seed + i * 1.7) + 1) * 0.5);
  const days = 14;
  const series = Array.from({ length: days }, (_, i) => {
    const base = totalClicks / days;
    return { day: i, v: Math.max(0, Math.round(base * (0.4 + rnd(i) * 1.6))) };
  });
  return { series, peak: Math.max(...series.map((s) => s.v), 1) };
}

function LoopBars({ series, peak }: { series: { day: number; v: number }[]; peak: number }) {
  const fills = ["var(--lemon)", "var(--mint)", "var(--sky)", "var(--rose)", "var(--lilac)"];
  const height = 160;
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 5, height, padding: "8px 0" }}>
      {series.map((p, i) => {
        const h = Math.max(4, (p.v / peak) * (height - 24));
        return (
          <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            <div style={{ width: "100%", height: h, background: fills[i % fills.length], border: "2px solid var(--ink)", borderRadius: 5, boxShadow: "0 2px 0 var(--ink)", position: "relative" }}>
              {p.v > 0 && (
                <div style={{ position: "absolute", top: -16, left: 0, right: 0, textAlign: "center", fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--ink)", opacity: 0.7, fontWeight: 600 }}>
                  {p.v}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function AnalyticsPage({ params }: { params: { code: string } }) {
  const [item, setItem] = useState<ShortUrl | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    getUrl(params.code)
      .then(setItem)
      .catch(() => setError("Link not found."))
      .finally(() => setLoading(false));
  }, [params.code]);

  function handleCopy() {
    const base = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8081";
    navigator.clipboard.writeText(`${base}/${params.code}`).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  const analytics = item ? buildSeries(item.accessCount, item.shortCode) : null;

  return (
    <div className="dot-bg" style={{ minHeight: "100vh", background: "var(--paper)", display: "flex", flexDirection: "column" }}>
      <TopBar />

      <main style={{ padding: "32px 56px", flex: 1, overflowY: "auto" }}>
        <Link href="/dashboard" style={{ fontFamily: "var(--font-sans)", fontSize: 14, fontWeight: 600, color: "var(--mute)", marginBottom: 16, display: "inline-flex", alignItems: "center", gap: 6, textDecoration: "none" }}>
          ← back to my loops
        </Link>

        {loading ? (
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 40, color: "var(--mute)", fontFamily: "var(--font-mono)", fontSize: 13 }}>
            <span style={{ display: "inline-block", width: 14, height: 14, border: "2px solid var(--pop)", borderTopColor: "transparent", borderRadius: "50%", animation: "loopSpin 0.7s linear infinite" }} />
            loading…
          </div>
        ) : error || !item || !analytics ? (
          <div style={{ marginTop: 40 }}>
            <p style={{ color: "var(--danger)", fontFamily: "var(--font-mono)", fontSize: 14 }}>{error || "Not found."}</p>
            <Link href="/dashboard" style={{ textDecoration: "none" }}>
              <ChunkyBtn kind="soft" style={{ marginTop: 16 }}>← Back to loops</ChunkyBtn>
            </Link>
          </div>
        ) : (
          <>
            {/* Hero */}
            <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 28, gap: 20, flexWrap: "wrap" }}>
              <div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--mute)", textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 8 }}>
                  Analytics for
                </div>
                <div style={{ marginBottom: 12 }}>
                  <LoopSlug code={params.code} size="xl" />
                </div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--ink-soft)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 580 }}>
                  ↳ {item.url}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <ChunkyBtn kind={copied ? "lemon" : "soft"} onClick={handleCopy}>
                  {copied ? "✓ Copied" : "Copy link"}
                </ChunkyBtn>
                <Link href={`/edit/${params.code}`} style={{ textDecoration: "none" }}>
                  <ChunkyBtn kind="soft">Edit</ChunkyBtn>
                </Link>
              </div>
            </div>

            {/* Top stats */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 14, marginBottom: 22 }}>
              <StickerCard fill="var(--mint)" tilt={-1.5} hoverLevel={false} padding="14px 18px">
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, color: "var(--ink)", opacity: 0.7, textTransform: "uppercase", letterSpacing: 1 }}>Total clicks</div>
                <div style={{ fontFamily: "var(--font-sans)", fontSize: 36, fontWeight: 700, color: "var(--ink)", letterSpacing: -1.4, lineHeight: 1.05, fontVariantNumeric: "tabular-nums" }}>
                  {item.accessCount.toLocaleString()}
                </div>
              </StickerCard>
              <StickerCard fill="var(--lemon)" tilt={1.2} hoverLevel={false} padding="14px 18px">
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, color: "var(--ink)", opacity: 0.7, textTransform: "uppercase", letterSpacing: 1 }}>Created</div>
                <div style={{ fontFamily: "var(--font-sans)", fontSize: 20, fontWeight: 700, color: "var(--ink)", letterSpacing: -0.5, marginTop: 4 }}>
                  {relDate(item.createdAt)}
                </div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--ink)", opacity: 0.6, marginTop: 2 }}>{relTime(item.createdAt)}</div>
              </StickerCard>
              <StickerCard fill="var(--sky)" tilt={-1} hoverLevel={false} padding="14px 18px">
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, color: "var(--ink)", opacity: 0.7, textTransform: "uppercase", letterSpacing: 1 }}>Original host</div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 16, fontWeight: 600, color: "var(--ink)", marginTop: 4, wordBreak: "break-all" }}>
                  {shortHost(item.url)}
                </div>
              </StickerCard>
              <StickerCard fill="var(--rose)" tilt={1.5} hoverLevel={false} padding="14px 18px">
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, color: "var(--ink)", opacity: 0.7, textTransform: "uppercase", letterSpacing: 1 }}>Last updated</div>
                <div style={{ fontFamily: "var(--font-sans)", fontSize: 20, fontWeight: 700, color: "var(--ink)", letterSpacing: -0.5, marginTop: 4 }}>
                  {relDate(item.updatedAt)}
                </div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--ink)", opacity: 0.6, marginTop: 2 }}>{relTime(item.updatedAt)}</div>
              </StickerCard>
            </div>

            {/* Chart */}
            <StickerCard tilt={-0.4} hoverLevel={false} padding="20px 22px" style={{ marginBottom: 22 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <div>
                  <div style={{ fontFamily: "var(--font-sans)", fontSize: 18, fontWeight: 700, color: "var(--ink)", letterSpacing: -0.4 }}>Estimated click distribution</div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--mute)", marginTop: 2 }}>
                    {item.accessCount} total · spread across 14 days
                  </div>
                </div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--mute)", background: "var(--paper)", border: "2px solid var(--ink)", borderRadius: 8, padding: "4px 10px" }}>
                  14d
                </div>
              </div>
              <LoopBars series={analytics.series} peak={analytics.peak} />
              <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--mute)", marginTop: 8 }}>
                <span>14 days ago</span>
                <span>today</span>
              </div>
            </StickerCard>

            {/* Full URL card */}
            <StickerCard tilt={0.3} hoverLevel={false} padding="18px 20px">
              <div style={{ fontFamily: "var(--font-sans)", fontSize: 16, fontWeight: 700, color: "var(--ink)", marginBottom: 8 }}>Destination</div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--ink-soft)", wordBreak: "break-all", lineHeight: 1.5 }}>
                {item.url}
              </div>
              <div style={{ marginTop: 14 }}>
                <Link href={`/edit/${params.code}`} style={{ textDecoration: "none" }}>
                  <ChunkyBtn kind="soft" size="sm">Edit destination →</ChunkyBtn>
                </Link>
              </div>
            </StickerCard>
          </>
        )}
      </main>
    </div>
  );
}
