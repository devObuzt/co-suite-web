import Link from "next/link";
import { BrandMark } from "@/components/BrandMark";
import { legalPolicies, LEGAL_UPDATED_AT } from "@/lib/legal/policies";

export const metadata = {
  title: "Legal Center — co-Suite",
  description: "co-Suite legal policies, privacy, terms, accessibility, cookies, AI usage, and billing.",
};

export default function LegalIndexPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-5xl px-5 py-8 sm:px-8">
        <header className="flex items-center justify-between border-b border-border pb-6">
          <Link href="/"><BrandMark /></Link>
          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">Back home</Link>
        </header>

        <section className="py-12">
          <p className="text-sm text-muted-foreground">Last updated: {LEGAL_UPDATED_AT}</p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight">Legal Center</h1>
          <p className="mt-4 max-w-2xl text-muted-foreground">
            Draft legal and policy pages for co-Suite. These documents should be reviewed by qualified legal counsel before public reliance.
          </p>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          {legalPolicies.map((policy) => (
            <Link
              key={policy.slug}
              href={`/legal/${policy.slug}`}
              className="rounded-xl border border-border bg-card p-5 transition-colors hover:bg-accent"
            >
              <h2 className="text-lg font-semibold">{policy.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{policy.subtitle}</p>
            </Link>
          ))}
        </section>
      </div>
    </main>
  );
}
