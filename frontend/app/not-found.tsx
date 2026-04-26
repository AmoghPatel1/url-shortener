import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-4">
      <span className="text-accent font-black text-8xl tracking-tighter">404</span>
      <p className="text-faint text-sm">this link doesn&apos;t exist.</p>
      <Link href="/" className="text-muted text-xs hover:text-accent transition-colors mt-2">
        ← back to snip.
      </Link>
    </main>
  );
}
