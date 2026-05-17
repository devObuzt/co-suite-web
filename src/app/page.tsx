"use client";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-zinc-950 text-white flex flex-col">
      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-5 border-b border-zinc-800">
        <span className="text-xl font-bold tracking-tight text-white">co-Suite</span>
        <div className="flex items-center gap-4">
          <Link href="/login">
            <Button variant="ghost" className="text-zinc-400 hover:text-white">Sign in</Button>
          </Link>
          <Link href="/signup">
            <Button className="bg-indigo-600 hover:bg-indigo-500 text-white">Get started</Button>
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center text-center px-6 py-24">
        <div className="inline-flex items-center gap-2 bg-indigo-950 border border-indigo-800 text-indigo-300 text-sm px-3 py-1 rounded-full mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
          AI-powered marketing suite
        </div>

        <h1 className="text-5xl md:text-7xl font-bold tracking-tight max-w-4xl leading-[1.1] mb-6">
          Your entire marketing
          <span className="text-indigo-400"> in one suite</span>
        </h1>

        <p className="text-zinc-400 text-lg md:text-xl max-w-2xl mb-10 leading-relaxed">
          Generate content, manage ads, schedule posts, and analyze performance — all powered by AI.
          Built for teams of any size.
        </p>

        <div className="flex flex-col sm:flex-row gap-4">
          <Link href="/signup">
            <Button size="lg" className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 h-12 text-base">
              Start for free
            </Button>
          </Link>
          <Link href="/login">
            <Button size="lg" variant="outline" className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 px-8 h-12 text-base">
              Sign in
            </Button>
          </Link>
        </div>
      </section>

      {/* Feature grid */}
      <section className="border-t border-zinc-800 grid md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-zinc-800">
        {[
          { title: "AI Content Engine", desc: "Generate images, carousels, and videos with a single click. Approve or edit before publishing." },
          { title: "Ad Management", desc: "Run and monitor Meta Ads and Google Ads campaigns directly from your suite." },
          { title: "Smart Scheduling", desc: "Auto-publish on your chosen cadence, or schedule manually. Kill switch always available." },
        ].map((f) => (
          <div key={f.title} className="p-8">
            <h3 className="text-white font-semibold mb-2">{f.title}</h3>
            <p className="text-zinc-400 text-sm leading-relaxed">{f.desc}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
