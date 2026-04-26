"use client";

import { useState, useEffect } from "react";
import { getStats } from "@/lib/api";
import type { ShortUrl } from "@/lib/api";
import NavBar from "@/components/NavBar";
import Link from "next/link";

const SHORT_BASE = "http://localhost:8081";

export default function AnalyticsPage({ params }: { params: { code: string } }) {
  const [data, setData] = useState<ShortUrl | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    getStats(params.code)
      .then(setData)
      .catch(() => setError("link not found."))
      .finally(() => setLoading(false));
  }, [params.code]);

  async function handleCopy() {
    if (!data) return;
    await navigator.clipboard.writeText(`${SHORT_BASE}/${data.shortCode}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const createdDate = data
    ? new Date(data.createdAt).toLocaleDateString("en-GB", {
        day: "2-digit", month: "long", year: "numeric",
      })
    : "";

  return (
    <div className="min-h-screen">
      <NavBar />
      <main className="max-w-xl mx-auto px-6 py-10">
        <Link href="/dashboard" className="text-faint text-xs hover:text-accent transition-colors">
          ← back to dashboard
        </Link>

        {loading && <p className="text-faint text-sm mt-8">loading...</p>}
        {error && <p className="text-danger text-sm mt-8">{error}</p>}

        {data && (
          <div className="mt-8 flex flex-col gap-6">
            <h1 className="text-accent font-black text-3xl tracking-tight">
              {data.shortCode}
            </h1>

            {/* Stats grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-surface rounded-lg px-4 py-4">
                <p className="text-faint text-xs tracking-widest uppercase mb-1">Total Clicks</p>
                <p className="text-accent font-black text-3xl">{data.accessCount}</p>
              </div>
              <div className="bg-surface rounded-lg px-4 py-4">
                <p className="text-faint text-xs tracking-widest uppercase mb-1">Created</p>
                <p className="text-white text-sm font-bold mt-1">{createdDate}</p>
              </div>
            </div>

            {/* Original URL */}
            <div className="bg-surface rounded-lg px-4 py-4">
              <p className="text-faint text-xs tracking-widest uppercase mb-2">Original URL</p>
              <a
                href={data.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted text-sm break-all hover:text-accent transition-colors"
              >
                {data.url}
              </a>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={handleCopy}
                className="flex-1 bg-accent text-bg font-black py-3 rounded-lg text-sm tracking-widest hover:opacity-90 transition-opacity"
              >
                {copied ? "COPIED!" : "COPY SHORT LINK"}
              </button>
              <Link
                href={`/edit/${data.shortCode}`}
                className="px-6 py-3 border border-accent-dim rounded-lg text-accent text-sm hover:bg-surface transition-colors flex items-center"
              >
                edit
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
