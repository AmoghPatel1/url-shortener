"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "@/components/ThemeProvider";

function LoopLogo() {
  return (
    <div
      style={{
        width: 36,
        height: 36,
        borderRadius: "50%",
        background: "var(--pop)",
        border: "2.5px solid var(--ink)",
        boxShadow: "0 3px 0 var(--ink)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        transform: "rotate(-4deg)",
      }}
    >
      <svg
        width={20}
        height={20}
        viewBox="0 0 20 20"
        fill="none"
        stroke="#fff"
        strokeWidth="3"
        strokeLinecap="round"
      >
        <path d="M5 4v12h10" />
      </svg>
    </div>
  );
}

export default function TopBar() {
  const pathname = usePathname();
  const { dark, toggle } = useTheme();

  const isHome = pathname === "/";
  const isDash = !isHome;

  return (
    <header
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "18px 36px",
        borderBottom: "2px solid var(--ink)",
        background: "var(--paper)",
        position: "relative",
        zIndex: 10,
        flexShrink: 0,
      }}
    >
      {/* Logo */}
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <LoopLogo />
        <div>
          <div
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 26,
              fontWeight: 700,
              letterSpacing: -1,
              color: "var(--ink)",
              lineHeight: 1,
            }}
          >
            loop
          </div>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10.5,
              color: "var(--mute)",
              marginTop: 2,
            }}
          >
            tiny links, big bounce
          </div>
        </div>
      </div>

      {/* Pill nav */}
      <nav
        style={{
          display: "flex",
          gap: 4,
          background: "var(--paper2)",
          padding: 4,
          borderRadius: 999,
          border: "2.5px solid var(--ink)",
          boxShadow: "0 3px 0 var(--ink)",
        }}
      >
        {[
          { href: "/",          label: "Make",     active: isHome },
          { href: "/dashboard", label: "My loops", active: isDash },
        ].map(({ href, label, active }) => (
          <Link
            key={href}
            href={href}
            style={{
              background: active ? "var(--ink)" : "transparent",
              color: active ? "var(--paper)" : "var(--ink)",
              padding: "7px 18px",
              borderRadius: 999,
              fontFamily: "var(--font-sans)",
              fontWeight: 700,
              fontSize: 13,
              textDecoration: "none",
              transition: "background 0.12s",
            }}
          >
            {label}
          </Link>
        ))}
      </nav>

      {/* Dark toggle */}
      <button
        onClick={toggle}
        title="Toggle theme"
        style={{
          width: 40,
          height: 40,
          borderRadius: "50%",
          border: "2.5px solid var(--ink)",
          background: dark ? "var(--lemon)" : "var(--sky)",
          color: "var(--ink)",
          cursor: "pointer",
          boxShadow: "0 3px 0 var(--ink)",
          padding: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {dark ? (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="8" cy="8" r="3" />
            <path d="M8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2M3 3l1.4 1.4M11.6 11.6L13 13M3 13l1.4-1.4M11.6 4.4L13 3" />
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M13 9.5A5.5 5.5 0 1 1 6.5 3a4.5 4.5 0 0 0 6.5 6.5z" />
          </svg>
        )}
      </button>
    </header>
  );
}
