import Link from "next/link";

export default function NavBar() {
  return (
    <nav className="border-b border-accent-dim px-6 py-4 flex items-center justify-between">
      <Link href="/" className="text-accent font-black text-xl tracking-tighter hover:opacity-80 transition-opacity">
        snip.
      </Link>
      <Link
        href="/dashboard"
        className="text-muted text-sm hover:text-accent transition-colors"
      >
        dashboard →
      </Link>
    </nav>
  );
}
