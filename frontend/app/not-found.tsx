import Link from "next/link";
import TopBar from "@/components/TopBar";
import StickerCard from "@/components/StickerCard";
import ChunkyBtn from "@/components/ChunkyBtn";

export default function NotFound() {
  return (
    <div className="dot-bg" style={{ minHeight: "100vh", background: "var(--paper)", display: "flex", flexDirection: "column" }}>
      <TopBar />
      <main style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "32px 56px" }}>
        <div style={{ textAlign: "center", maxWidth: 500 }}>
          <div style={{ position: "relative", height: 200, marginBottom: 32 }}>
            <StickerCard
              fill="var(--lemon)"
              tilt={-8}
              hoverLevel={false}
              padding="20px 36px"
              style={{ position: "absolute", top: 30, left: "8%", fontFamily: "var(--font-sans)", fontSize: 90, fontWeight: 700, color: "var(--ink)", lineHeight: 1 }}
            >
              4
            </StickerCard>
            <StickerCard
              fill="var(--pop)"
              tilt={4}
              hoverLevel={false}
              padding="20px 36px"
              style={{ position: "absolute", top: 0, left: "50%", transform: "translateX(-50%) rotate(4deg)", fontFamily: "var(--font-sans)", fontSize: 90, fontWeight: 700, color: "#fff", lineHeight: 1, animation: "loopBounce 1.6s ease-in-out infinite" }}
            >
              0
            </StickerCard>
            <StickerCard
              fill="var(--mint)"
              tilt={8}
              hoverLevel={false}
              padding="20px 36px"
              style={{ position: "absolute", top: 30, right: "8%", fontFamily: "var(--font-sans)", fontSize: 90, fontWeight: 700, color: "var(--ink)", lineHeight: 1 }}
            >
              4
            </StickerCard>
          </div>

          <h2 style={{ fontFamily: "var(--font-sans)", fontSize: 36, fontWeight: 700, letterSpacing: -1.2, margin: "0 0 12px", color: "var(--ink)" }}>
            That loop&apos;s not here.
          </h2>
          <p style={{ fontSize: 15, color: "var(--ink-soft)", lineHeight: 1.55, margin: "0 0 24px", fontFamily: "var(--font-sans)" }}>
            Maybe it was deleted, mistyped, or never existed. Slugs are case-sensitive — double-check the spelling.
          </p>
          <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/" style={{ textDecoration: "none" }}>
              <ChunkyBtn kind="pop">← Make a new one</ChunkyBtn>
            </Link>
            <Link href="/dashboard" style={{ textDecoration: "none" }}>
              <ChunkyBtn kind="soft">See all loops</ChunkyBtn>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
