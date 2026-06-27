"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const links = [
  { href: "/players", label: "Players" },
  { href: "/sessions/new", label: "New Session" },
  { href: "/sessions", label: "History" },
];

export function Nav() {
  const pathname = usePathname();

  return (
    <header className="bg-zinc-950 border-b border-zinc-800">
      <div className="max-w-5xl mx-auto px-4 h-16 flex items-center gap-8">
        <Link href="/" className="flex items-center gap-2.5 shrink-0">
          <div className="w-7 h-7 rounded bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-black text-xs tracking-tighter">PB</span>
          </div>
          <span className="font-bold text-lg tracking-tight text-white hidden sm:block">
            Round Robin
          </span>
          <span className="font-bold text-lg tracking-tight text-white sm:hidden">
            Round Robin
          </span>
        </Link>

        <nav className="flex items-center gap-1 ml-auto">
          {links.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                pathname === href || pathname.startsWith(href + "/")
                  ? "bg-primary/15 text-primary"
                  : "text-zinc-400 hover:bg-zinc-800 hover:text-white"
              )}
            >
              {label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
