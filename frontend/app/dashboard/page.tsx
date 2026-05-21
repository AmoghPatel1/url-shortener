"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { listUrls, deleteUrl } from "@/lib/api";
import type { ShortUrl } from "@/lib/api";
import TopBar from "@/components/TopBar";
import StickerCard from "@/components/StickerCard";
import ChunkyBtn from "@/components/ChunkyBtn";
import LoopSlug from "@/components/LoopSlug";
import Toast from "@/components/Toast";

const FILLS = ["lemon", "mint", "sky", "rose", "lilac"] as const;

function relTime(iso: string) {
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function CopyIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7.5" height="7.5" rx="1" />
      <path d="M3 3v-.5a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1h-.5" />
    </svg>
  );
}
function EditIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 11l1-3 5.5-5.5 2 2L5 10z" />
    </svg>
  );
}
function TrashIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 3.5h9M5.5 5.5v4M7.5 5.5v4M3.5 3.5L4 11h5l.5-7.5M5 3.5V2h3v1.5" />
    </svg>
  );
}

function SmallBtn({
  children, onClick, active, danger, title,
}: {
  children: React.ReactNode;
  onClick: () => void;
  active?: boolean;
  danger?: boolean;
  title?: string;
}) {
  const [press, setPress] = useState(false);
  return (
    <button
      onClick={onClick}
      title={title}
      onMouseDown={() => setPress(true)}
      onMouseUp={() => setPress(false)}
      onMouseLeave={() => setPress(false)}
      style={{
        width: 32, height: 32, borderRadius: 9,
        border: "2px solid var(--ink)",
        background: active ? "var(--lemon)" : "var(--paper2)",
        color: danger ? "var(--danger)" : "var(--ink)",
        cursor: "pointer", padding: 0, fontWeight: 700, fontSize: 13,
        boxShadow: press ? "0 0 0 var(--ink)" : "0 2px 0 var(--ink)",
        transform: press ? "translateY(2px)" : "translateY(0)",
        transition: "transform 0.08s, box-shadow 0.08s",
        display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
      }}
    >
      {children}
    </button>
  );
}

function BigStat({ label, value, fill, tilt }: { label: string; value: string | number; fill: string; tilt: number }) {
  return (
    <StickerCard fill={fill} tilt={tilt} hoverLevel={false} padding="10px 16px" style={{ minWidth: 110 }}>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, color: "var(--ink)", opacity: 0.7, textTransform: "uppercase", letterSpacing: 1 }}>
        {label}
      </div>
      <div style={{ fontFamily: "var(--font-sans)", fontSize: 30, fontWeight: 700, color: "var(--ink)", letterSpacing: -1, lineHeight: 1.1, fontVariantNumeric: "tabular-nums" }}>
        {value}
      </div>
    </StickerCard>
  );
}

function DashCard({
  u, fill, tilt, onCopy, onDelete, copied,
}: {
  u: ShortUrl; fill: string; tilt: number;
  onCopy: () => void; onDelete: () => void; copied: boolean;
}) {
  return (
    <StickerCard fill={fill} tilt={tilt} padding="16px 18px">
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, marginBottom: 6 }}>
        <LoopSlug code={u.shortCode} size="md" />
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 700, color: "var(--ink)", whiteSpace: "nowrap" }}>
          {u.accessCount.toLocaleString()} clicks
        </span>
      </div>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--ink)", opacity: 0.7, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: 14 }}>
        ↳ {u.url}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, color: "var(--ink)", opacity: 0.6, flex: 1 }}>
          {relTime(u.createdAt)}
        </span>
        <SmallBtn onClick={onCopy} active={copied} title="Copy">
          {copied ? "✓" : <CopyIcon />}
        </SmallBtn>
        <Link href={`/analytics/${u.shortCode}`} style={{ display: "contents" }}>
          <SmallBtn onClick={() => {}} title="Analytics">
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M1 10l3-3 2.5 2L9 5l3 3" />
            </svg>
          </SmallBtn>
        </Link>
        <Link href={`/edit/${u.shortCode}`} style={{ display: "contents" }}>
          <SmallBtn onClick={() => {}} title="Edit"><EditIcon /></SmallBtn>
        </Link>
        <SmallBtn onClick={onDelete} danger title="Delete"><TrashIcon /></SmallBtn>
      </div>
    </StickerCard>
  );
}

export default function DashboardPage() {
  const [links, setLinks] = useState<ShortUrl[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [sort, setSort] = useState<"created" | "clicks">("created");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [toast, setToast] = useState<{ text: string; tone: "mint" | "rose" } | null>(null);

  useEffect(() => {
    listUrls().then(setLinks).catch(() => {}).finally(() => setLoading(false));
  }, []);

  function doCopy(code: string) {
    const base = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8081";
    navigator.clipboard.writeText(`${base}/${code}`).catch(() => {});
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 1400);
    showToast(`Copied /${code} ✨`, "mint");
  }

  async function doDelete(code: string) {
    await deleteUrl(code);
    setLinks((prev) => prev.filter((l) => l.shortCode !== code));
    showToast(`Deleted /${code}`, "rose");
  }

  function showToast(text: string, tone: "mint" | "rose") {
    setToast({ text, tone });
    setTimeout(() => setToast(null), 1800);
  }

  const filtered = links
    .filter(
      (u) =>
        !filter ||
        u.shortCode.toLowerCase().includes(filter.toLowerCase()) ||
        u.url.toLowerCase().includes(filter.toLowerCase())
    )
    .sort((a, b) =>
      sort === "clicks"
        ? b.accessCount - a.accessCount
        : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

  const totalClicks = links.reduce((s, u) => s + u.accessCount, 0);

  return (
    <div className="dot-bg" style={{ minHeight: "100vh", background: "var(--paper)", display: "flex", flexDirection: "column" }}>
      <TopBar />

      <main style={{ padding: "32px 56px", flex: 1, overflowY: "auto" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 16 }}>
          <h1 style={{ fontFamily: "var(--font-sans)", fontSize: "clamp(40px, 5vw, 56px)", fontWeight: 700, letterSpacing: "-2.2px", margin: 0, lineHeight: 0.95, color: "var(--ink)" }}>
            My loops
          </h1>
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
            <BigStat label="Loops" value={links.length} fill="var(--lemon)" tilt={-2} />
            <BigStat label="Total clicks" value={totalClicks.toLocaleString()} fill="var(--mint)" tilt={1.5} />
            <BigStat label="Avg / loop" value={links.length ? Math.round(totalClicks / links.length) : 0} fill="var(--sky)" tilt={-1.5} />
          </div>
        </div>

        {/* Toolbar */}
        <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 22, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 200, display: "flex", alignItems: "center", gap: 10, border: "2.5px solid var(--ink)", borderRadius: 12, padding: "10px 16px", background: "var(--paper2)", boxShadow: "0 3px 0 var(--ink)" }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="var(--mute)" strokeWidth="2" strokeLinecap="round">
              <circle cx="6" cy="6" r="4" /><path d="M9 9l4 4" />
            </svg>
            <input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Search slugs or destinations..."
              style={{ flex: 1, border: "none", outline: "none", background: "transparent", fontFamily: "var(--font-sans)", fontSize: 14, fontWeight: 500, color: "var(--ink)", minWidth: 0 }}
            />
            {filter && (
              <button onClick={() => setFilter("")} style={{ border: "none", background: "transparent", color: "var(--mute)", cursor: "pointer", fontSize: 16, padding: 0 }}>×</button>
            )}
          </div>

          <div style={{ display: "flex", borderRadius: 12, border: "2.5px solid var(--ink)", overflow: "hidden", boxShadow: "0 3px 0 var(--ink)" }}>
            {(["created", "clicks"] as const).map((k) => (
              <button key={k} onClick={() => setSort(k)} style={{ background: sort === k ? "var(--ink)" : "var(--paper2)", color: sort === k ? "var(--paper)" : "var(--ink)", border: "none", cursor: "pointer", padding: "10px 16px", fontFamily: "var(--font-sans)", fontWeight: 700, fontSize: 13 }}>
                {k === "created" ? "Newest" : "Top"}
              </button>
            ))}
          </div>

          <Link href="/" style={{ textDecoration: "none" }}>
            <ChunkyBtn kind="pop" icon={<span style={{ fontSize: 16, fontWeight: 700 }}>+</span>}>New</ChunkyBtn>
          </Link>
        </div>

        {/* Grid */}
        {loading ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 18 }}>
            {[0, 1, 2, 3].map((i) => {
              const fills = ["var(--lemon)", "var(--mint)", "var(--sky)", "var(--rose)"];
              const tilts = [-1, 1.2, -0.8, 1];
              return (
                <div key={i} style={{ background: fills[i], border: "2.5px solid var(--ink)", borderRadius: 16, padding: 18, boxShadow: "0 4px 0 var(--ink)", transform: `rotate(${tilts[i]}deg)`, animation: `loopPulse 1.4s ease-in-out infinite ${i * 0.12}s` }}>
                  <div style={{ height: 22, background: "var(--ink)", opacity: 0.2, borderRadius: 6, marginBottom: 10, width: "60%" }} />
                  <div style={{ height: 12, background: "var(--ink)", opacity: 0.15, borderRadius: 6, marginBottom: 14 }} />
                  <div style={{ display: "flex", gap: 8 }}>
                    <div style={{ height: 10, background: "var(--ink)", opacity: 0.15, borderRadius: 5, flex: 1 }} />
                    {[0, 1, 2].map((j) => <div key={j} style={{ width: 32, height: 32, background: "var(--ink)", opacity: 0.15, borderRadius: 9 }} />)}
                  </div>
                </div>
              );
            })}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ maxWidth: 480, margin: "0 auto", textAlign: "center", paddingTop: 60 }}>
            <h2 style={{ fontFamily: "var(--font-sans)", fontSize: 38, fontWeight: 700, letterSpacing: -1.4, margin: "0 0 10px", color: "var(--ink)" }}>
              {filter ? `No loops match "${filter}"` : "No loops yet!"}
            </h2>
            <p style={{ fontSize: 15, color: "var(--ink-soft)", lineHeight: 1.55, margin: "0 0 24px" }}>
              {filter ? "Try a different search." : "Make your first short link and it'll show up here."}
            </p>
            {!filter && (
              <Link href="/" style={{ textDecoration: "none" }}>
                <ChunkyBtn kind="pop" size="lg">Make my first loop →</ChunkyBtn>
              </Link>
            )}
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 18 }}>
            {filtered.map((u, i) => (
              <DashCard
                key={u.shortCode}
                u={u}
                fill={`var(--${FILLS[i % FILLS.length]})`}
                tilt={(i % 2 ? 1 : -1) * (0.6 + (i % 3) * 0.4)}
                onCopy={() => doCopy(u.shortCode)}
                onDelete={() => doDelete(u.shortCode)}
                copied={copiedCode === u.shortCode}
              />
            ))}
          </div>
        )}
      </main>

      <Toast visible={!!toast} tone={toast?.tone ?? "mint"}>{toast?.text}</Toast>
    </div>
  );
}
