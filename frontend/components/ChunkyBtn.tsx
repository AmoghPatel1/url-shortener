"use client";

import { useState, ReactNode, CSSProperties } from "react";

type BtnKind = "pop" | "soft" | "mint" | "lemon" | "danger";
type BtnSize = "sm" | "md" | "lg";

const palettes: Record<BtnKind, { bg: string; fg: string }> = {
  pop:    { bg: "var(--pop)",    fg: "#fff" },
  soft:   { bg: "var(--paper2)", fg: "var(--ink)" },
  mint:   { bg: "var(--mint)",   fg: "var(--ink)" },
  lemon:  { bg: "var(--lemon)",  fg: "var(--ink)" },
  danger: { bg: "var(--danger)", fg: "#fff" },
};

const sizes: Record<BtnSize, { py: number; px: number; fs: number; r: number }> = {
  sm: { py: 7,  px: 14, fs: 13, r: 10 },
  md: { py: 11, px: 18, fs: 14, r: 12 },
  lg: { py: 14, px: 22, fs: 16, r: 14 },
};

interface ChunkyBtnProps {
  children: ReactNode;
  kind?: BtnKind;
  size?: BtnSize;
  full?: boolean;
  icon?: ReactNode;
  disabled?: boolean;
  onClick?: () => void;
  type?: "button" | "submit" | "reset";
  style?: CSSProperties;
}

export default function ChunkyBtn({
  children,
  kind = "pop",
  size = "md",
  full = false,
  icon,
  disabled = false,
  onClick,
  type = "button",
  style: extra = {},
}: ChunkyBtnProps) {
  const [press, setPress] = useState(false);
  const [hover, setHover] = useState(false);
  const p = palettes[kind];
  const s = sizes[size];

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => { setHover(false); setPress(false); }}
      onMouseDown={() => setPress(true)}
      onMouseUp={() => setPress(false)}
      style={{
        width: full ? "100%" : "auto",
        background: p.bg,
        color: p.fg,
        border: "2.5px solid var(--ink)",
        borderRadius: s.r,
        padding: `${s.py}px ${s.px}px`,
        fontFamily: "var(--font-sans, -apple-system, system-ui, sans-serif)",
        fontWeight: 700,
        fontSize: s.fs,
        letterSpacing: -0.2,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        boxShadow: press
          ? "0 0 0 var(--ink)"
          : hover
          ? "0 5px 0 var(--ink)"
          : "0 4px 0 var(--ink)",
        transform: press
          ? "translateY(4px)"
          : hover
          ? "translateY(-1px)"
          : "translateY(0)",
        transition: "transform 0.08s, box-shadow 0.08s",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        flexShrink: 0,
        ...extra,
      }}
    >
      {icon && <span style={{ display: "flex", alignItems: "center" }}>{icon}</span>}
      <span>{children}</span>
    </button>
  );
}
