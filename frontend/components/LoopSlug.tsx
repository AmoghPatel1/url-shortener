const SHORT_HOST = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8081")
  .replace(/^https?:\/\//, "");

type SlugSize = "sm" | "md" | "lg" | "xl";

const fontSizes: Record<SlugSize, number> = { sm: 13, md: 18, lg: 26, xl: 44 };
const paddings: Record<SlugSize, string> = {
  sm: "0 6px",
  md: "0 6px",
  lg: "0 6px",
  xl: "0 8px",
};
const radii: Record<SlugSize, number> = { sm: 6, md: 6, lg: 6, xl: 8 };

interface LoopSlugProps {
  code: string;
  size?: SlugSize;
}

export default function LoopSlug({ code, size = "md" }: LoopSlugProps) {
  const fs = fontSizes[size];

  return (
    <span
      style={{
        fontFamily: "var(--font-sans, -apple-system, system-ui, sans-serif)",
        fontSize: fs,
        fontWeight: 700,
        letterSpacing: -0.6,
        color: "var(--ink)",
        lineHeight: 1.05,
      }}
    >
      <span style={{ color: "var(--mute)" }}>{SHORT_HOST}/</span>
      <span
        style={{
          background: "var(--paper2)",
          padding: paddings[size],
          borderRadius: radii[size],
          border: "2px solid var(--ink)",
          boxShadow: "0 2px 0 var(--ink)",
          display: "inline-block",
          marginLeft: 2,
        }}
      >
        {code}
      </span>
    </span>
  );
}
