"use client";

import { useState } from "react";
import type { ShortUrl } from "@/lib/api";

interface Props {
  result: ShortUrl;
  onReset: () => void;
}

const SHORT_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8081";

export default function ResultCard({ result, onReset }: Props) {
  const [copied, setCopied] = useState(false);

  const shortUrl = `${SHORT_BASE}/${result.shortCode}`;

  async function handleCopy() {
    await navigator.clipboard.writeText(shortUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="w-full max-w-xl bg-accent-glow border border-accent rounded-lg px-4 py-4 flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-col gap-1 min-w-0">
          <span className="text-accent font-black text-lg tracking-tight truncate">
            {shortUrl}
          </span>
          <span className="text-faint text-xs truncate">{result.url}</span>
        </div>
        <button
          onClick={handleCopy}
          className="shrink-0 bg-accent text-bg font-black px-4 py-2 rounded text-xs tracking-widest hover:opacity-90 active:opacity-75 transition-opacity"
        >
          {copied ? "COPIED!" : "COPY"}
        </button>
      </div>
      <button
        onClick={onReset}
        className="text-faint text-xs hover:text-accent transition-colors text-left"
      >
        shorten another? →
      </button>
    </div>
  );
}
