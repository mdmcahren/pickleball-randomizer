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
    <header className="bg-green-700 text-white shadow-md">
      <div className="max-w-5xl mx-auto px-4 h-16 flex items-center gap-8">
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <span className="text-2xl">🥒</span>
          <span className="font-bold text-lg tracking-tight hidden sm:block">
            Pickleball Matchmaker
          </span>
          <span className="font-bold text-lg tracking-tight sm:hidden">
            PB Match
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
                  ? "bg-white/20 text-white"
                  : "text-green-100 hover:bg-white/10 hover:text-white"
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
