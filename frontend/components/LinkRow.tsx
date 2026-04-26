"use client";

import { useState } from "react";
import Link from "next/link";
import type { ShortUrl } from "@/lib/api";

interface Props {
  link: ShortUrl;
  onDelete: (code: string) => Promise<void>;
}

const SHORT_BASE = "http://localhost:8081";

export default function LinkRow({ link, onDelete }: Props) {
  const [copied, setCopied] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const shortUrl = `${SHORT_BASE}/${link.shortCode}`;

  async function handleCopy() {
    await navigator.clipboard.writeText(shortUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleDelete() {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    setDeleting(true);
    try {
      await onDelete(link.shortCode);
    } finally {
      setDeleting(false);
      setConfirming(false);
    }
  }

  const createdDate = new Date(link.createdAt).toLocaleDateString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
  });

  return (
    <tr className={`border-b border-surface-hover transition-colors ${confirming ? "bg-danger/5" : "hover:bg-surface-hover"}`}>
      <td className="px-4 py-3">
        <span className="text-accent text-sm font-bold">{link.shortCode}</span>
      </td>
      <td className="px-4 py-3 max-w-xs">
        <span className="text-muted text-xs truncate block">{link.url}</span>
      </td>
      <td className="px-4 py-3 text-faint text-xs whitespace-nowrap">{createdDate}</td>
      <td className="px-4 py-3 text-faint text-xs">{link.accessCount}</td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <button onClick={handleCopy} className="text-xs text-muted hover:text-accent transition-colors">
            {copied ? "copied!" : "copy"}
          </button>
          <Link href={`/edit/${link.shortCode}`} className="text-xs text-muted hover:text-accent transition-colors">
            edit
          </Link>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className={`text-xs transition-colors ${confirming ? "text-danger font-bold" : "text-muted hover:text-danger"}`}
          >
            {confirming ? (deleting ? "..." : "confirm?") : "delete"}
          </button>
          {confirming && (
            <button onClick={() => setConfirming(false)} className="text-xs text-faint hover:text-muted transition-colors">
              cancel
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}
