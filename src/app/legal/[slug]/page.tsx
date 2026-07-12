import Link from "next/link";
import { notFound } from "next/navigation";
import { BrandMark } from "@/components/BrandMark";
import { getLegalPolicy, legalPolicies, LEGAL_UPDATED_AT } from "@/lib/legal/policies";

export function generateStaticParams() {
  return legalPolicies.map((policy) => ({ slug: policy.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }) {
  const policy = getLegalPolicy(params.slug);
  return {
    title: policy ? `${policy.title} — co-Suite` : "Legal — co-Suite",
    description: policy?.subtitle,
  };
}

export default function LegalPolicyPage({ params }: { params: { slug: string } }) {
  const policy = getLegalPolicy(params.slug);
  if (!policy) notFound();

  return (
    <main className="min-h-dvh bg-background text-foreground">
      <div className="mx-auto max-w-4xl px-5 py-8 sm:px-8">
        <header className="flex items-center justify-between border-b border-border pb-6">
          <Link href="/"><BrandMark /></Link>
          <Link href="/legal" className="text-sm text-muted-foreground hover:text-foreground">Legal Center</Link>
        </header>

        <article className="py-10">
          <p className="text-sm text-muted-foreground">Last updated: {LEGAL_UPDATED_AT}</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-5xl">{policy.title}</h1>
          <p className="mt-4 text-lg leading-relaxed text-muted-foreground">{policy.subtitle}</p>
          {policy.languageNote && (
            <p className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-100">
              {policy.languageNote}
            </p>
          )}

          <div className="mt-10 space-y-8">
            {policy.sections.map((section) => (
              <section key={section.title} className="rounded-xl border border-border bg-card p-5">
                <h2 className="text-xl font-semibold" dir="auto">{section.title}</h2>
                {section.body && (
                  <p className="mt-3 leading-relaxed text-muted-foreground" dir="auto">{section.body}</p>
                )}
                {section.bullets && (
                  <ul className="mt-3 list-disc space-y-2 ps-5 text-muted-foreground">
                    {section.bullets.map((item) => (
                      <li key={item} className="leading-relaxed" dir="auto">{item}</li>
                    ))}
                  </ul>
                )}
              </section>
            ))}
          </div>
        </article>
      </div>
    </main>
  );
}
