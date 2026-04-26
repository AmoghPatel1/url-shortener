"use client";

import { useState, useEffect } from "react";
import { createShortUrl, listUrls, deleteUrl } from "@/lib/api";
import type { ShortUrl } from "@/lib/api";
import UrlInput from "@/components/UrlInput";
import ResultCard from "@/components/ResultCard";
import LinkRow from "@/components/LinkRow";
import Link from "next/link";

const SHORT_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8081";

export default function HomePage() {
  const [result, setResult] = useState<ShortUrl | null>(null);
  const [loading, setLoading] = useState(false);
  const [recent, setRecent] = useState<ShortUrl[]>([]);

  useEffect(() => {
    listUrls()
      .then((all) => setRecent(all.slice(-5).reverse()))
      .catch(() => {});
  }, []);

  async function handleShorten(url: string) {
    setLoading(true);
    try {
      const created = await createShortUrl(url);
      setResult(created);
      setRecent((prev) => [created, ...prev.slice(0, 4)]);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(code: string) {
    await deleteUrl(code);
    setRecent((prev) => prev.filter((l) => l.shortCode !== code));
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-start pt-24 px-4 pb-16">
      {/* Header */}
      <div className="text-center mb-10">
        <h1 className="text-accent font-black text-5xl tracking-tighter leading-none">snip.</h1>
        <p className="text-muted text-sm mt-2">make your links shorter</p>
      </div>

      {/* Input / Result — transforms in place */}
      <div className="w-full max-w-xl">
        {result ? (
          <ResultCard result={result} onReset={() => setResult(null)} />
        ) : (
          <UrlInput onShorten={handleShorten} loading={loading} />
        )}
      </div>

      {/* Recent links */}
      {recent.length > 0 && (
        <div className="w-full max-w-xl mt-12">
          <div className="flex items-center justify-between mb-3">
            <span className="text-faint text-xs tracking-widest uppercase">Recent</span>
            <Link href="/dashboard" className="text-faint text-xs hover:text-accent transition-colors">
              view all →
            </Link>
          </div>
          <div className="flex flex-col gap-2">
            {recent.map((link) => (
              <div key={link.shortCode} className="bg-surface rounded-lg px-4 py-3 flex items-center justify-between gap-3">
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className="text-accent text-sm font-bold">
                    {SHORT_BASE.replace("http://", "")}/{link.shortCode}
                  </span>
                  <span className="text-faint text-xs truncate">{link.url}</span>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <button
                    onClick={() => navigator.clipboard.writeText(`${SHORT_BASE}/${link.shortCode}`)}
                    className="text-xs text-muted hover:text-accent transition-colors"
                  >
                    copy
                  </button>
                  <Link href={`/edit/${link.shortCode}`} className="text-xs text-muted hover:text-accent transition-colors">
                    edit
                  </Link>
                  <button
                    onClick={() => handleDelete(link.shortCode)}
                    className="text-xs text-muted hover:text-danger transition-colors"
                  >
                    delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
