"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api, Suite } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, ArrowRight, Loader2, Sparkles, Trash2, X } from "lucide-react";

export default function DashboardPage() {
  const [suites, setSuites] = useState<Suite[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.suites.list().then(setSuites).finally(() => setLoading(false));
  }, []);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Your Suites</h1>
          <p className="mt-1 text-sm text-muted-foreground">Each suite is a complete marketing workspace for one business.</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Link href="/create">
            <Button variant="outline" className="w-full gap-2 sm:w-auto">
              <Sparkles size={16} /> Quick create
            </Button>
          </Link>
          <Link href="/suite/new">
            <Button className="w-full gap-2 sm:w-auto">
              <Plus size={16} /> New Suite
            </Button>
          </Link>
        </div>
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-2">
        <Link href="/create" className="group rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/60">
          <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Sparkles size={18} />
          </div>
          <h2 className="text-base font-semibold text-foreground">Create without a Suite</h2>
          <p className="mt-2 text-sm text-muted-foreground">Generate quick content with brand mode off. Good for testing ideas before full setup.</p>
          <div className="mt-4 flex items-center gap-1 text-sm text-primary transition-all group-hover:gap-2">
            Open quick create <ArrowRight size={14} />
          </div>
        </Link>
        <Link href="/suite/new" className="group rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/60">
          <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
            <Plus size={18} />
          </div>
          <h2 className="text-base font-semibold text-foreground">Build a full Suite</h2>
          <p className="mt-2 text-sm text-muted-foreground">Research a business, save the brand profile, connect platforms, and generate consistent content.</p>
          <div className="mt-4 flex items-center gap-1 text-sm text-primary transition-all group-hover:gap-2">
            Start setup <ArrowRight size={14} />
          </div>
        </Link>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-40 animate-pulse rounded-xl border border-border bg-card" />
          ))}
        </div>
      ) : suites.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-24 text-center">
          <p className="mb-4 text-muted-foreground">No full suites yet. You can create a quick post now or build your first suite.</p>
          <Link href="/suite/new">
            <Button className="gap-2">
              <Plus size={16} /> Create Suite
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {suites.map((suite) => (
            <SuiteCard
              key={suite.id}
              suite={suite}
              onDeleted={(deletedId) => setSuites((current) => current.filter((item) => item.id !== deletedId))}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SuiteCard({ suite, onDeleted }: { suite: Suite; onDeleted: (suiteId: string) => void }) {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const statusColor = suite.status === "active"
    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
    : "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300";

  async function deleteSuite() {
    setDeleting(true);
    setError("");
    try {
      await api.suites.remove(suite.id);
      onDeleted(suite.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
      setDeleting(false);
    }
  }

  return (
    <div className="relative">
      <Link href={`/suite/${suite.id}`}>
        <Card className="h-full cursor-pointer transition-colors hover:ring-primary/50 group">
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between">
              <div
                className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg text-sm font-bold text-white"
                style={{ backgroundColor: suite.brand?.colors?.primary || "#4f46e5" }}
              >
                {suite.name[0].toUpperCase()}
              </div>
              <Badge className={`text-xs border ${statusColor}`} variant="outline">
                {suite.status}
              </Badge>
            </div>
            <CardTitle className="text-base text-foreground">{suite.name}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4 line-clamp-2 text-sm text-muted-foreground">
              {suite.brand?.description || suite.brand?.tagline || "Complete your suite setup to get started."}
            </p>
            <div className="flex items-center gap-1 text-sm text-primary transition-all group-hover:gap-2">
              Open suite <ArrowRight size={14} />
            </div>
          </CardContent>
        </Card>
      </Link>
      <button
        type="button"
        aria-label={`Delete ${suite.name}`}
        title="Delete suite"
        onClick={(e) => {
          e.preventDefault();
          setConfirming(true);
        }}
        className="absolute bottom-3 end-3 rounded-md p-1.5 text-muted-foreground/60 transition-colors hover:bg-red-500/10 hover:text-red-500"
      >
        <Trash2 size={15} />
      </button>

      {confirming && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => !deleting && setConfirming(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-border bg-background p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-lg font-bold text-foreground" dir="auto">حذف السوت &quot;{suite.name}&quot;؟</h3>
              <button
                type="button"
                onClick={() => !deleting && setConfirming(false)}
                className="rounded-md p-1 text-muted-foreground hover:bg-muted"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>
            <p className="mt-2 text-sm leading-6 text-muted-foreground" dir="auto">
              رح ينحذف السوت نهائيًا مع كل بياناته: البراند، الخطة التسويقية، المحتوى، الصور، والاشتراكات المرتبطة. المستخدمون المربوطون بالسوت ما بينحذفوا. هذا الإجراء لا يمكن التراجع عنه.
            </p>
            {error && <p className="mt-3 rounded-lg border border-red-300 bg-red-50 p-2 text-xs text-red-700" dir="auto">{error}</p>}
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button variant="outline" onClick={() => setConfirming(false)} disabled={deleting}>
                إلغاء
              </Button>
              <Button onClick={deleteSuite} disabled={deleting} className="gap-2 bg-red-600 text-white hover:bg-red-700">
                {deleting ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                احذف نهائيًا
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
