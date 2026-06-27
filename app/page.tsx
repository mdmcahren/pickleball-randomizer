import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function Home() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-20 flex flex-col items-center text-center gap-6">
      <div className="text-6xl">🥒</div>
      <h1 className="text-4xl font-bold tracking-tight text-green-800">
        Pickleball Matchmaker
      </h1>
      <p className="text-lg text-muted-foreground max-w-md">
        Intelligently balance teams and opponents across every game so everyone
        gets a variety of partners and competition.
      </p>

      <div className="flex flex-wrap justify-center gap-3 mt-4">
        <Link
          href="/sessions/new"
          className={cn(buttonVariants({ size: "lg" }), "bg-green-700 hover:bg-green-800")}
        >
          Start a Session
        </Link>
        <Link
          href="/players"
          className={buttonVariants({ size: "lg", variant: "outline" })}
        >
          Manage Players
        </Link>
      </div>

      <div className="grid sm:grid-cols-3 gap-4 mt-10 text-left w-full max-w-3xl">
        {[
          {
            icon: "👥",
            title: "Player Roster",
            desc: "Build a persistent player list. Select who's active for each session.",
          },
          {
            icon: "🎲",
            title: "Smart Matchmaking",
            desc: "Algorithm minimises repeated partners and opponents across all games.",
          },
          {
            icon: "🤝",
            title: "Fixed Partnerships",
            desc: "Lock pairs together and rotate which pairs face each other each game.",
          },
        ].map(({ icon, title, desc }) => (
          <div key={title} className="rounded-xl border bg-card p-5 shadow-sm">
            <div className="text-3xl mb-2">{icon}</div>
            <h3 className="font-semibold mb-1">{title}</h3>
            <p className="text-sm text-muted-foreground">{desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
