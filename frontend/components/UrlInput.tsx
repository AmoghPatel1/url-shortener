"use client";

import { useState } from "react";

interface Props {
  onShorten: (url: string) => Promise<void>;
  loading: boolean;
}

export default function UrlInput({ onShorten, loading }: Props) {
  const [value, setValue] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!value.trim()) {
      setError("paste a url first.");
      return;
    }
    try {
      await onShorten(value.trim());
      setValue("");
    } catch {
      setError("something went wrong. try again.");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-xl">
      <div className="flex flex-col gap-2">
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="https://very-long-url.com/paste/here"
          className="w-full bg-surface border border-accent-dim rounded-lg px-4 py-3 text-sm text-white placeholder-faint focus:outline-none focus:border-accent transition-colors"
          disabled={loading}
        />
        {error && (
          <p className="text-danger text-xs">{error}</p>
        )}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-accent text-bg font-black py-3 rounded-lg text-sm tracking-widest hover:opacity-90 active:opacity-75 transition-opacity disabled:opacity-50"
        >
          {loading ? "shortening..." : "SHORTEN →"}
        </button>
      </div>
    </form>
  );
}
