"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getUrl, updateUrl, deleteUrl } from "@/lib/api";
import type { ShortUrl } from "@/lib/api";
import TopBar from "@/components/TopBar";
import StickerCard from "@/components/StickerCard";
import ChunkyBtn from "@/components/ChunkyBtn";
import LoopSlug from "@/components/LoopSlug";

function TrashIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 3.5h9M5.5 5.5v4M7.5 5.5v4M3.5 3.5L4 11h5l.5-7.5M5 3.5V2h3v1.5" />
    </svg>
  );
}

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

export default function EditPage({ params }: { params: { code: string } }) {
  const router = useRouter();
  const [item, setItem] = useState<ShortUrl | null>(null);
  const [destination, setDestination] = useState("");
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [confirmDel, setConfirmDel] = useState(false);

  useEffect(() => {
    getUrl(params.code)
      .then((data) => {
        setItem(data);
        setDestination(data.url);
      })
      .catch(() => setError("Link not found."))
      .finally(() => setLoading(false));
  }, [params.code]);

  const dirty = item ? destination !== item.url : false;

  async function handleSave() {
    if (!dirty || saving) return;
    setError("");
    setSaving(true);
    try {
      await updateUrl(params.code, destination.trim());
      setSaved(true);
      setTimeout(() => router.push("/dashboard"), 800);
    } catch {
      setError("Failed to save. Check the URL and try again.");
      setSaving(false);
    }
  }

  async function handleDelete() {
    await deleteUrl(params.code);
    router.push("/dashboard");
  }

  return (
    <div className="dot-bg" style={{ minHeight: "100vh", background: "var(--paper)", display: "flex", flexDirection: "column" }}>
      <TopBar />

      <main style={{ padding: "32px 56px", flex: 1, overflowY: "auto" }}>
        <Link
          href="/dashboard"
          style={{ background: "transparent", border: "none", cursor: "pointer", padding: 0, fontFamily: "var(--font-sans)", fontSize: 14, fontWeight: 600, color: "var(--mute)", marginBottom: 20, display: "inline-flex", alignItems: "center", gap: 6, textDecoration: "none" }}
        >
          ← back to my loops
        </Link>

        {loading ? (
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 40, color: "var(--mute)", fontFamily: "var(--font-mono)", fontSize: 13 }}>
            <span style={{ display: "inline-block", width: 14, height: 14, border: "2px solid var(--pop)", borderTopColor: "transparent", borderRadius: "50%", animation: "loopSpin 0.7s linear infinite" }} />
            loading…
          </div>
        ) : error && !item ? (
          <div style={{ marginTop: 40 }}>
            <p style={{ color: "var(--danger)", fontFamily: "var(--font-mono)", fontSize: 14 }}>{error}</p>
            <Link href="/dashboard" style={{ textDecoration: "none" }}>
              <ChunkyBtn kind="soft" style={{ marginTop: 16 }}>← Back to loops</ChunkyBtn>
            </Link>
          </div>
        ) : item ? (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 36, marginTop: 16 }}>
            {/* Main column */}
            <div>
              <h1 style={{ fontFamily: "var(--font-sans)", fontSize: "clamp(40px, 5vw, 56px)", fontWeight: 700, letterSpacing: "-2.2px", margin: "0 0 28px", lineHeight: 0.95, color: "var(--ink)" }}>
                Re-aim<br />this loop.
              </h1>

              {/* Short link (stays the same) */}
              <StickerCard fill="var(--sky)" tilt={-1.4} hoverLevel={false} padding="14px 18px" style={{ marginBottom: 22 }}>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--ink)", opacity: 0.7, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>
                  Short link · stays the same
                </div>
                <LoopSlug code={params.code} size="lg" />
              </StickerCard>

              {/* Destination editor */}
              <StickerCard tilt={0.4} hoverLevel={false} padding="16px 18px" style={{ marginBottom: 22 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--mute)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>
                  <span>New destination</span>
                  <span>{destination.length} chars</span>
                </div>
                <textarea
                  value={destination}
                  onChange={(e) => { setDestination(e.target.value); setSaved(false); }}
                  rows={3}
                  style={{ width: "100%", boxSizing: "border-box", resize: "none", border: "none", outline: "none", background: "transparent", fontFamily: "var(--font-mono)", fontSize: 14, color: "var(--ink)", lineHeight: 1.6 }}
                />
                {dirty && (
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--pop)", fontWeight: 600, marginTop: 6 }}>
                    ● unsaved changes
                  </div>
                )}
                {error && (
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--danger)", marginTop: 6 }}>
                    ! {error}
                  </div>
                )}
              </StickerCard>

              {/* Actions */}
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <ChunkyBtn
                  kind={saved ? "mint" : "pop"}
                  onClick={handleSave}
                  disabled={!dirty || saved || saving}
                >
                  {saved ? "✓ Saved!" : saving ? "Saving…" : "Save changes"}
                </ChunkyBtn>
                <Link href="/dashboard" style={{ textDecoration: "none" }}>
                  <ChunkyBtn kind="soft">Cancel</ChunkyBtn>
                </Link>
                <div style={{ flex: 1 }} />
                {confirmDel ? (
                  <>
                    <ChunkyBtn kind="soft" onClick={() => setConfirmDel(false)}>Keep</ChunkyBtn>
                    <ChunkyBtn kind="danger" onClick={handleDelete}>Delete forever</ChunkyBtn>
                  </>
                ) : (
                  <ChunkyBtn kind="soft" onClick={() => setConfirmDel(true)} icon={<TrashIcon />}>
                    Delete
                  </ChunkyBtn>
                )}
              </div>
            </div>

            {/* Stats sidebar */}
            <aside>
              <h2 style={{ fontFamily: "var(--font-sans)", fontSize: 22, fontWeight: 700, letterSpacing: -0.6, margin: "0 0 16px", color: "var(--ink)" }}>
                Stats
              </h2>
              <div style={{ display: "grid", gap: 14 }}>
                <StickerCard fill="var(--mint)" tilt={-1.5} hoverLevel={false} padding="12px 16px">
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, color: "var(--ink)", opacity: 0.7, textTransform: "uppercase", letterSpacing: 1 }}>Total clicks</div>
                  <div style={{ fontFamily: "var(--font-sans)", fontSize: 36, fontWeight: 700, color: "var(--ink)", letterSpacing: -1.4, lineHeight: 1.1, fontVariantNumeric: "tabular-nums" }}>
                    {item.accessCount.toLocaleString()}
                  </div>
                </StickerCard>

                <StickerCard fill="var(--lemon)" tilt={1.2} hoverLevel={false} padding="10px 16px">
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, color: "var(--ink)", opacity: 0.7, textTransform: "uppercase", letterSpacing: 1 }}>Created</div>
                  <div style={{ fontFamily: "var(--font-sans)", fontSize: 16, fontWeight: 600, color: "var(--ink)", marginTop: 2 }}>
                    {relDate(item.createdAt)}
                  </div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--ink)", opacity: 0.6, marginTop: 2 }}>
                    {relTime(item.createdAt)}
                  </div>
                </StickerCard>

                <StickerCard fill="var(--rose)" tilt={-1} hoverLevel={false} padding="10px 16px">
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, color: "var(--ink)", opacity: 0.7, textTransform: "uppercase", letterSpacing: 1 }}>Original host</div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 14, fontWeight: 500, color: "var(--ink)", marginTop: 2 }}>
                    {shortHost(item.url)}
                  </div>
                </StickerCard>
              </div>
            </aside>
          </div>
        ) : null}
      </main>
    </div>
  );
}
