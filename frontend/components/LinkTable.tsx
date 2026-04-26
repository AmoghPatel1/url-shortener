"use client";

import LinkRow from "./LinkRow";
import type { ShortUrl } from "@/lib/api";

interface Props {
  links: ShortUrl[];
  onDelete: (code: string) => Promise<void>;
}

export default function LinkTable({ links, onDelete }: Props) {
  if (links.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-faint text-sm">no links yet.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-surface-hover">
            <th className="px-4 py-3 text-left text-xs text-faint font-normal tracking-widest uppercase">Short Code</th>
            <th className="px-4 py-3 text-left text-xs text-faint font-normal tracking-widest uppercase">Original URL</th>
            <th className="px-4 py-3 text-left text-xs text-faint font-normal tracking-widest uppercase">Created</th>
            <th className="px-4 py-3 text-left text-xs text-faint font-normal tracking-widest uppercase">Clicks</th>
            <th className="px-4 py-3 text-left text-xs text-faint font-normal tracking-widest uppercase">Actions</th>
          </tr>
        </thead>
        <tbody>
          {links.map((link) => (
            <LinkRow key={link.shortCode} link={link} onDelete={onDelete} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
