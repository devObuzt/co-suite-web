import type { BusinessCard } from "./types";

/**
 * Hand-maintained card registry. One entry per `/ex/bc/<slug>` page.
 * Slugs are short client codes (ts = Tamim Shehab).
 */
export const CARDS: Record<string, BusinessCard> = {
  ts: {
    slug: "ts",
    lang: "he",
    dir: "rtl",
    title: "תמים שהאב, משרד עורכי דין",
    description:
      "תמים שהאב, משרד עורכי דין | פלילי: כלכלי מיסוי | אזרחי: ביטוח לאומי ונזקי גוף",
    photo: {
      src: "/ex/bc/ts/photo.jpg",
      alt: "עו״ד תמים שהאב במשרדו",
    },
    logo: {
      src: "/ex/bc/ts/logo.png",
      alt: "Tamim Shehab — Shehab, Solomon & Co.",
      href: "https://shehablaw.co.il",
      width: 150,
    },
    headings: [
      "תמים שהאב, משרד עורכי דין",
      "פלילי: כלכלי מיסוי",
      "אזרחי: ביטוח לאומי ונזקי גוף",
    ],
    contacts: [
      {
        kind: "phone",
        label: "טלפון",
        value: "+972 52-646-0290",
        href: "tel:+972526460290",
      },
      {
        kind: "facebook",
        label: "FaceBook",
        value: "@tamimshehablaw",
        href: "https://www.facebook.com/tamimshehablaw",
      },
      {
        kind: "location",
        label: "כתובת",
        value: "מנחם אריאב 20, נוף הגליל",
        href: "https://waze.com/ul?a=share_drive&locale=he&sd=T7cX1FLKYMHP-5Xx-Q-sd&env=il&utm_source=waze_app&utm_campaign=share_drive",
        copyText: "מנחם אריאב 20, נוף הגליל",
      },
      {
        kind: "email",
        label: "E - Mail",
        value: "tamim@shehablaw.co.il",
        href: "mailto:tamim@shehablaw.co.il",
      },
    ],
    theme: {
      frame: "#072241",
      chip: "#828fa5",
      chipText: "#ffffff",
      contactText: "#ffffff",
    },
    ogImage: "/ex/bc/ts/og.png",
    icon: "/ex/bc/ts/icon.png",
    copiedMessage: "הכתובת הועתקה",
  },
};

export function getCard(slug: string): BusinessCard | undefined {
  return CARDS[slug];
}

export function allCardSlugs(): string[] {
  return Object.keys(CARDS);
}
