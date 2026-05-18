"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api, Suite } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, ArrowRight } from "lucide-react";

export default function DashboardPage() {
  const [suites, setSuites] = useState<Suite[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.suites.list().then(setSuites).finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Your Suites</h1>
          <p className="text-zinc-400 text-sm mt-1">Each suite is a complete marketing workspace for one business</p>
        </div>
        <Link href="/suite/new">
          <Button className="bg-indigo-600 hover:bg-indigo-500 gap-2">
            <Plus size={16} /> New Suite
          </Button>
        </Link>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-40 bg-zinc-900 border border-zinc-800 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : suites.length === 0 ? (
        <div className="text-center py-24 border border-dashed border-zinc-800 rounded-xl">
          <p className="text-zinc-400 mb-4">No suites yet — create your first one</p>
          <Link href="/suite/new">
            <Button className="bg-indigo-600 hover:bg-indigo-500 gap-2">
              <Plus size={16} /> Create Suite
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {suites.map((suite) => (
            <SuiteCard key={suite.id} suite={suite} />
          ))}
        </div>
      )}
    </div>
  );
}

function SuiteCard({ suite }: { suite: Suite }) {
  const statusColor = suite.status === "active" ? "bg-emerald-950 text-emerald-400 border-emerald-800" : "bg-amber-950 text-amber-400 border-amber-800";

  return (
    <Link href={`/suite/${suite.id}`}>
      <Card className="bg-zinc-900 border-zinc-800 hover:border-zinc-600 transition-colors group cursor-pointer h-full">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm mb-3"
              style={{ backgroundColor: suite.brand?.colors?.primary || "#4f46e5" }}
            >
              {suite.name[0].toUpperCase()}
            </div>
            <Badge className={`text-xs border ${statusColor}`} variant="outline">
              {suite.status}
            </Badge>
          </div>
          <CardTitle className="text-white text-base">{suite.name}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-zinc-400 text-sm line-clamp-2 mb-4">
            {suite.brand?.description || suite.brand?.tagline || "Complete your suite setup to get started."}
          </p>
          <div className="flex items-center text-indigo-400 text-sm gap-1 group-hover:gap-2 transition-all">
            Open suite <ArrowRight size={14} />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
