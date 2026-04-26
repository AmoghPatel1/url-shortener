"use client";

import { useState, useEffect } from "react";
import { getUrl, updateUrl } from "@/lib/api";
import NavBar from "@/components/NavBar";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function EditPage({ params }: { params: { code: string } }) {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    getUrl(params.code)
      .then((data) => setValue(data.url))
      .catch(() => setError("link not found."))
      .finally(() => setLoading(false));
  }, [params.code]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!value.trim()) {
      setError("url cannot be empty.");
      return;
    }
    setSaving(true);
    try {
      await updateUrl(params.code, value.trim());
      router.push("/dashboard");
    } catch {
      setError("failed to save. check the url and try again.");
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen">
      <NavBar />
      <main className="max-w-xl mx-auto px-6 py-10">
        <Link href="/dashboard" className="text-faint text-xs hover:text-accent transition-colors">
          ← back to dashboard
        </Link>

        <h1 className="text-white font-black text-2xl tracking-tight mt-8 mb-1">
          editing{" "}
          <span className="text-accent">snip./{params.code}</span>
        </h1>
        <p className="text-faint text-xs mb-8">update the destination url</p>

        {loading && <p className="text-faint text-sm">loading...</p>}

        {!loading && (
          <form onSubmit={handleSave} className="flex flex-col gap-3">
            <input
              type="text"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="https://new-destination.com"
              className={`w-full bg-surface border rounded-lg px-4 py-3 text-sm text-white placeholder-faint focus:outline-none transition-colors ${
                error ? "border-danger" : "border-accent-dim focus:border-accent"
              }`}
              disabled={saving}
            />
            {error && <p className="text-danger text-xs">{error}</p>}
            <div className="flex gap-3 mt-2">
              <button
                type="submit"
                disabled={saving}
                className="flex-1 bg-accent text-bg font-black py-3 rounded-lg text-sm tracking-widest hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                {saving ? "saving..." : "SAVE →"}
              </button>
              <Link
                href="/dashboard"
                className="px-6 py-3 border border-surface-hover rounded-lg text-faint text-sm hover:text-muted transition-colors flex items-center"
              >
                cancel
              </Link>
            </div>
          </form>
        )}
      </main>
    </div>
  );
}
