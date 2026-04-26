"use client";

import { useState, useEffect } from "react";
import { listUrls, deleteUrl } from "@/lib/api";
import type { ShortUrl } from "@/lib/api";
import NavBar from "@/components/NavBar";
import LinkTable from "@/components/LinkTable";
import Link from "next/link";

export default function DashboardPage() {
  const [links, setLinks] = useState<ShortUrl[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    listUrls()
      .then(setLinks)
      .catch(() => setError("failed to load links."))
      .finally(() => setLoading(false));
  }, []);

  async function handleDelete(code: string) {
    await deleteUrl(code);
    setLinks((prev) => prev.filter((l) => l.shortCode !== code));
  }

  return (
    <div className="min-h-screen">
      <NavBar />
      <main className="max-w-5xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-accent font-black text-2xl tracking-tight">all links</h1>
          <Link href="/" className="text-faint text-sm hover:text-accent transition-colors">
            + shorten new
          </Link>
        </div>

        {loading && <p className="text-faint text-sm">loading...</p>}
        {error && <p className="text-danger text-sm">{error}</p>}
        {!loading && !error && (
          <LinkTable links={links} onDelete={handleDelete} />
        )}
      </main>
    </div>
  );
}
