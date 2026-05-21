"use client";

type ToastTone = "mint" | "lemon" | "rose" | "danger";

const bgs: Record<ToastTone, string> = {
  mint:   "var(--mint)",
  lemon:  "var(--lemon)",
  rose:   "var(--rose)",
  danger: "var(--danger)",
};

interface ToastProps {
  children: React.ReactNode;
  visible: boolean;
  tone?: ToastTone;
}

export default function Toast({ children, visible, tone = "mint" }: ToastProps) {
  return (
    <div
      style={{
        position: "fixed",
        bottom: visible ? 28 : -120,
        left: "50%",
        transform: "translateX(-50%) rotate(-1.5deg)",
        background: bgs[tone],
        border: "2.5px solid var(--ink)",
        borderRadius: 14,
        padding: "12px 22px",
        boxShadow: "0 5px 0 var(--ink)",
        fontFamily: "var(--font-sans, -apple-system, system-ui, sans-serif)",
        fontWeight: 600,
        fontSize: 14,
        color: "var(--ink)",
        transition: "bottom 0.3s cubic-bezier(0.2, 1.4, 0.4, 1)",
        zIndex: 100,
        whiteSpace: "nowrap",
        pointerEvents: "none",
      }}
    >
      {children}
    </div>
  );
}
