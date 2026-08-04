/**
 * Business-card data contract (`/ex/bc/<slug>`).
 *
 * Cards are pure data: the renderer in `components/ex/bc/BusinessCard.tsx`
 * draws whatever this describes. Today the objects are hand-written in
 * `cards.ts`; when the in-app card builder lands it should emit exactly this
 * shape (from the DB) and nothing about the renderer needs to change.
 */

/** Which icon + default action a contact tile gets. */
export type ContactKind =
  | "phone"
  | "whatsapp"
  | "email"
  | "facebook"
  | "instagram"
  | "website"
  | "location";

export type ContactTile = {
  kind: ContactKind;
  /** Small caption above the value, e.g. "טלפון". */
  label: string;
  /** The line the visitor reads, e.g. "+972 52-646-0290". */
  value: string;
  /** Tap target. Omit for a tile that only copies. */
  href?: string;
  /** When set, tapping also copies this text and shows a toast. */
  copyText?: string;
  /** Accessible name for the link; falls back to `${label}: ${value}`. */
  ariaLabel?: string;
};

export type BusinessCardTheme = {
  /** Frame border + browser theme colour. */
  frame: string;
  /** Heading-chip background. */
  chip: string;
  /** Heading-chip text. */
  chipText: string;
  /** Contact-block text (sits on the photo). */
  contactText: string;
};

export type BusinessCard = {
  slug: string;
  /** BCP-47 tag for the card content, e.g. "he". */
  lang: string;
  dir: "rtl" | "ltr";
  /** <title> + og:title. */
  title: string;
  /** Meta description + og:description. */
  description: string;
  photo: { src: string; alt: string };
  logo?: { src: string; alt: string; href?: string; width: number };
  /** The stacked chips under the logo — name, then practice areas. */
  headings: string[];
  contacts: ContactTile[];
  theme: BusinessCardTheme;
  /** Absolute-from-root paths; used for og:image and the tab icon. */
  ogImage: string;
  icon: string;
  /** Shown in the toast after a successful copy. */
  copiedMessage: string;
};
