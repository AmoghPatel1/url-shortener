"use client";

import { useState, ReactNode, CSSProperties } from "react";

interface StickerCardProps {
  children: ReactNode;
  fill?: string;
  tilt?: number;
  hoverLevel?: boolean;
  padding?: string | number;
  className?: string;
  style?: CSSProperties;
  onClick?: () => void;
}

export default function StickerCard({
  children,
  fill,
  tilt = -1.2,
  hoverLevel = true,
  padding = 16,
  className = "",
  style: extra = {},
  onClick,
}: StickerCardProps) {
  const [hover, setHover] = useState(false);

  return (
    <div
      className={`relative ${className}`}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={onClick}
      style={{
        background: fill ?? "var(--paper2)",
        border: "2.5px solid var(--ink)",
        borderRadius: 16,
        padding,
        boxShadow: "0 5px 0 var(--ink)",
        transform:
          hover && hoverLevel
            ? "rotate(0deg) translateY(-2px)"
            : `rotate(${tilt}deg)`,
        transition: "transform 0.15s cubic-bezier(0.2, 1.4, 0.4, 1)",
        cursor: onClick ? "pointer" : undefined,
        ...extra,
      }}
    >
      {children}
    </div>
  );
}
