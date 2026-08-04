import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { BusinessCard } from "@/components/ex/bc/BusinessCard";
import { allCardSlugs, CARD_ORIGIN, getCard } from "@/lib/ex/bc/cards";

type Props = { params: Promise<{ slug: string }> };

/** Every card is known at build time, so all of /ex/bc/* prerenders. */
export function generateStaticParams() {
  return allCardSlugs().map((slug) => ({ slug }));
}

export const dynamicParams = false;

/**
 * Overrides the app-wide viewport: the card is a read-only page, so visitors
 * get pinch-zoom back, and the browser chrome picks up the brand colour.
 */
export async function generateViewport({ params }: Props): Promise<Viewport> {
  const { slug } = await params;
  return {
    width: "device-width",
    initialScale: 1,
    maximumScale: 5,
    userScalable: true,
    viewportFit: "cover",
    themeColor: getCard(slug)?.theme.frame,
  };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const card = getCard(slug);
  if (!card) return { title: "Not found" };

  return {
    metadataBase: new URL(CARD_ORIGIN),
    title: card.title,
    description: card.description,
    icons: { icon: card.icon, apple: card.icon },
    alternates: { canonical: `/ex/bc/${card.slug}` },
    openGraph: {
      type: "profile",
      title: card.title,
      description: card.description,
      url: `${CARD_ORIGIN}/ex/bc/${card.slug}`,
      images: [{ url: card.ogImage, width: 1200, height: 630, alt: card.title }],
    },
    twitter: {
      card: "summary_large_image",
      title: card.title,
      description: card.description,
      images: [card.ogImage],
    },
  };
}

export default async function BusinessCardPage({ params }: Props) {
  const { slug } = await params;
  const card = getCard(slug);
  if (!card) notFound();

  return <BusinessCard card={card} />;
}
