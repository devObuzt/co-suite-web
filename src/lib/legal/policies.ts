export type LegalLink = { label: string; href: string };

export type LegalSection = {
  title: string;
  body?: string;
  bullets?: string[];
  /** Rendered as real anchors. Google's OAuth review requires the YouTube
   *  Terms of Service and Google Privacy Policy to be linked, not just named. */
  links?: LegalLink[];
};

export type LegalPolicy = {
  slug: string;
  title: string;
  subtitle: string;
  languageNote?: string;
  sections: LegalSection[];
};

export const LEGAL_UPDATED_AT = "September 2, 2026";

export const GOOGLE_LINKS: LegalLink[] = [
  { label: "YouTube Terms of Service", href: "https://www.youtube.com/t/terms" },
  { label: "Google Privacy Policy", href: "https://policies.google.com/privacy" },
  { label: "Google security settings (revoke access)", href: "https://myaccount.google.com/permissions" },
];
export const LEGAL_CONTACT_EMAIL = "legal@cosuite.app";

export const legalPolicies: LegalPolicy[] = [
  {
    slug: "privacy",
    title: "Privacy Policy | سياسة الخصوصية | מדיניות פרטיות",
    subtitle: "How co-Suite collects, uses, stores, and protects user and business data.",
    sections: [
      {
        title: "Overview",
        body: "co-Suite provides AI-powered tools for business onboarding, content generation, analytics, scheduling, and advertising workflow management. This policy explains what information we collect and how we use it.",
      },
      {
        title: "Information we collect",
        bullets: [
          "Account data such as name, email address, login credentials, language preference, and billing-related identifiers.",
          "Business profile data including business name, links, website content, social pages, brand assets, audience information, services, products, and strategy inputs.",
          "Generated content including prompts, captions, images, carousels, videos, hashtags, approvals, rejections, schedules, and publishing history.",
          "Connected platform data from services the user chooses to connect, including Meta/Facebook/Instagram pages, ad accounts, analytics, Google Ads account/campaign reporting data, and YouTube channel identity and publishing data.",
          "Technical data such as IP address, browser, device, logs, error reports, cookies, and usage events needed to secure and operate the service.",
        ],
      },
      {
        title: "How we use information",
        bullets: [
          "To create and manage user accounts and business suites.",
          "To analyze business links and build brand, audience, and marketing strategy profiles.",
          "To generate AI-assisted content, images, videos, ad ideas, reports, and recommendations.",
          "To connect, read, and publish through third-party platforms only when the user authorizes that connection.",
          "To monitor service performance, prevent abuse, secure accounts, and improve product quality.",
          "To manage billing, subscriptions, balances, invoices, and support requests.",
        ],
      },
      {
        title: "AI processing",
        body: "co-Suite may send selected business data, prompts, uploaded assets, links, and generated drafts to AI model providers to provide requested functionality. We minimize the data sent where practical and use provider APIs according to their applicable terms. Users should not submit confidential, regulated, or third-party data unless they have the right to do so.",
      },
      {
        title: "Third-party services",
        bullets: [
          "Meta platforms may be used for Facebook Pages, Instagram, Meta Ads, publishing, and analytics.",
          "Google Ads may be used for OAuth connection, account selection, and campaign/ad reporting.",
          "YouTube API Services are used to publish videos to channels the user connects. See the dedicated section below.",
          "Cloud storage, hosting, database, payment, logging, and AI providers may process data as processors or service providers.",
        ],
      },
      {
        title: "YouTube API Services",
        body: "co-Suite uses YouTube API Services to publish videos to YouTube channels that a user explicitly connects. By connecting a channel, the user also agrees to be bound by the YouTube Terms of Service, and Google's Privacy Policy governs data handled by Google.",
        bullets: [
          "Scopes we request: youtube.upload to upload videos; youtube.readonly to confirm which channel an authorization actually belongs to before anything is published; youtube.force-ssl to attach caption tracks to videos we upload.",
          "Data we store: the OAuth refresh token for the connected channel, the channel ID and title, and a record of what we published (title, description, tags, privacy setting, caption track, and timestamps).",
          "We do not access watch history, subscriptions, private playlists, comments, messages, or channel analytics beyond confirming the target channel identity.",
          "Google user data obtained through these scopes is never sold, never shared with third parties for their own purposes, never used for advertising or profiling, and never used to train AI models.",
          "Stored YouTube authorized data is refreshed or deleted within 30 days, as required by the YouTube API Services Terms of Service.",
          "Users can disconnect a channel inside co-Suite at any time, which deletes the stored authorization, or revoke access directly from their Google Account security settings.",
        ],
        links: GOOGLE_LINKS,
      },
      {
        title: "Limited use of Google user data",
        body: "co-Suite's use and transfer of information received from Google APIs adheres to the Google API Services User Data Policy, including the Limited Use requirements. Google user data is used only to provide the features the user connected the account for, is not transferred except as needed to provide those features, with the user's explicit consent, or where required by law, and is not read by humans except with the user's consent, for security or abuse investigation, or where required by law.",
        links: [
          { label: "Google API Services User Data Policy", href: "https://developers.google.com/terms/api-services-user-data-policy" },
        ],
      },
      {
        title: "Data retention and deletion",
        body: "We keep information as long as needed to provide the service, comply with legal obligations, resolve disputes, maintain security, and operate billing records. Users may request access, correction, export, or deletion where applicable by contacting us. Disconnecting a platform deletes the stored authorization for that platform.",
      },
      {
        title: "Contact",
        body: `Privacy requests can be sent to ${LEGAL_CONTACT_EMAIL}. This policy is a general product policy and should be reviewed by legal counsel before public reliance.`,
      },
    ],
  },
  {
    slug: "terms",
    title: "Terms & Conditions | תקנון | الشروط والأحكام",
    subtitle: "General terms for using co-Suite, including subscription, ad budgets, AI usage, and platform connections.",
    languageNote: "This page includes Hebrew-facing terms because the first market is Israel.",
    sections: [
      {
        title: "Service description",
        body: "co-Suite is a software platform that helps businesses create marketing suites, analyze online presence, generate AI-assisted content, connect advertising/social platforms, monitor campaigns, and manage publishing workflows.",
      },
      {
        title: "User responsibilities",
        bullets: [
          "Users must provide accurate account, business, billing, and connection information.",
          "Users are responsible for having rights to uploaded logos, fonts, images, text, business data, and connected social/ad accounts.",
          "Users must review all AI-generated content before use or publication.",
          "Users must comply with applicable laws, advertising rules, privacy laws, platform policies, and intellectual property rights.",
        ],
      },
      {
        title: "Subscription payments | תשלום עבור השתתפות חודשית/שנתית",
        body: "The service may be offered through monthly or yearly subscription plans. Subscription fees cover access to the co-Suite platform and do not automatically include external advertising spend, third-party platform charges, payment processing fees, or exceptional AI usage unless expressly stated in the selected plan.",
      },
      {
        title: "Advertising budgets | יתרת תקציבים לפרסום",
        body: "Advertising budget balances are separate from subscription fees. If users load or allocate budgets for advertising through Meta, Google, or other platforms, those amounts are intended for media spend and related campaign activity. The user remains responsible for approving budgets, targeting, campaigns, and platform charges. Unused balances, if any, are handled according to the applicable plan, invoice, written agreement, and payment provider rules.",
      },
      {
        title: "AI model usage | יצירת שימוש במודלי AI",
        body: "AI features may generate text, strategy, images, videos, logos, recommendations, and campaign drafts. AI output may be incomplete, inaccurate, similar to existing materials, or unsuitable for regulated industries. Users must verify facts, claims, offers, prices, legal statements, and compliance before publishing. co-Suite may meter AI usage and charge or limit high-cost usage according to the selected plan or balance.",
      },
      {
        title: "Connected platforms",
        body: "When users connect Meta, Google Ads, Instagram, Facebook, or other third-party platforms, co-Suite acts according to permissions granted by the user. Platform APIs, availability, review requirements, rate limits, and permissions may change. co-Suite is not responsible for third-party outages, rejected ads, suspended accounts, or policy enforcement by external platforms.",
      },
      {
        title: "YouTube API Services",
        body: "Features that publish to YouTube are built on YouTube API Services. By using them, the user agrees to the YouTube Terms of Service and acknowledges that the Google Privacy Policy applies to data handled by Google. co-Suite does not control YouTube's daily API quota, content review, age or made-for-kids classification, monetization decisions, or channel enforcement, and is not responsible for videos that YouTube restricts, rejects, or removes.",
        links: GOOGLE_LINKS,
      },
      {
        title: "Refunds and cancellations",
        body: "Unless a separate written agreement says otherwise, subscriptions renew until cancelled. Cancellation stops future renewal but does not automatically refund prior periods. Advertising budgets, setup fees, AI usage, and third-party costs may be non-refundable once used, committed, or charged by a third-party provider.",
      },
      {
        title: "Limitation of liability",
        body: "The service is provided on an as-is and as-available basis. To the maximum extent permitted by law, co-Suite is not liable for indirect damages, lost profits, lost advertising budget, campaign performance, platform decisions, or business outcomes. Users are responsible for final approval and use of all generated or published materials.",
      },
      {
        title: "Hebrew summary | תקציר בעברית",
        bullets: [
          "השימוש במערכת כפוף לתשלום חודשי או שנתי לפי המסלול שנבחר.",
          "תקציבי פרסום בפלטפורמות כגון Google או Meta הם נפרדים מדמי השימוש במערכת.",
          "שימוש במודלי AI עשוי להיות מחויב, מוגבל או מנוהל לפי מסלול המשתמש ויתרתו.",
          "המשתמש אחראי לבדוק ולאשר כל תוכן, פרסום, תקציב וקמפיין לפני שימוש בפועל.",
        ],
      },
    ],
  },
  {
    slug: "accessibility",
    title: "הצהרת נגישות | Accessibility Statement",
    subtitle: "Our accessibility commitment for co-Suite users.",
    languageNote: "Accessibility statement draft for Israeli-market use. Review with an accessibility professional before publication.",
    sections: [
      {
        title: "מחויבות לנגישות",
        body: "co-Suite שואפת לאפשר שימוש נוח ושוויוני ככל האפשר לכלל המשתמשים, לרבות אנשים עם מוגבלויות. אנו פועלים לשיפור מתמשך של חוויית המשתמש, מבנה המסכים, ניגודיות, ניווט מקלדת ותמיכה בטכנולוגיות מסייעות.",
      },
      {
        title: "Accessibility measures",
        bullets: [
          "Support for keyboard navigation in core flows where practical.",
          "Semantic page structure, headings, labels, and readable controls.",
          "Light and dark themes with improving contrast standards.",
          "Multilingual support including right-to-left languages such as Arabic and Hebrew.",
        ],
      },
      {
        title: "Known limitations",
        body: "Some generated content, uploaded files, external platform embeds, AI-created images, or third-party pages may not fully meet accessibility requirements. We continue to improve these areas.",
      },
      {
        title: "פנייה בנושא נגישות",
        body: `אם נתקלת בקושי נגישות, ניתן לפנות אלינו בכתובת ${LEGAL_CONTACT_EMAIL}. מומלץ לציין את כתובת העמוד, תיאור הבעיה, סוג הדפדפן, המכשיר וטכנולוגיה מסייעת אם נעשה בה שימוש.`,
      },
    ],
  },
  {
    slug: "cookies",
    title: "Cookie Policy | سياسة ملفات تعريف الارتباط | מדיניות Cookies",
    subtitle: "How cookies and similar technologies may be used by co-Suite.",
    sections: [
      {
        title: "What cookies are used for",
        bullets: [
          "Authentication and session security.",
          "Language, theme, and interface preferences.",
          "Analytics, debugging, and product performance.",
          "Payment, fraud prevention, and platform integration flows where needed.",
        ],
      },
      {
        title: "Managing cookies",
        body: "Users can control cookies through browser settings. Blocking essential cookies may prevent login, dashboard usage, OAuth connections, or payment flows from working correctly.",
      },
      {
        title: "Third-party cookies",
        body: "External providers such as hosting, analytics, payment, Meta, Google, or embedded services may use their own cookies according to their policies.",
      },
    ],
  },
  {
    slug: "ai-policy",
    title: "AI Usage Policy | سياسة استخدام الذكاء الاصطناعي",
    subtitle: "Rules and expectations for AI-generated content and model usage.",
    sections: [
      {
        title: "Human review required",
        body: "AI-generated text, images, videos, strategy, logos, ad recommendations, and translations must be reviewed by the user before use. The user is responsible for final approval.",
      },
      {
        title: "Prohibited use",
        bullets: [
          "Do not use the service to create unlawful, deceptive, harmful, infringing, discriminatory, or abusive content.",
          "Do not submit sensitive personal data, confidential data, or regulated information unless you have the legal right and operational need to do so.",
          "Do not use generated content to impersonate others or misrepresent business claims, pricing, guarantees, or certifications.",
        ],
      },
      {
        title: "Model costs and limits",
        body: "AI usage may consume paid model resources. co-Suite may meter usage, apply limits, pause generation, or deduct balances according to the selected plan and operational cost.",
      },
    ],
  },
  {
    slug: "billing",
    title: "Billing, Subscription & Advertising Budget Policy",
    subtitle: "How subscription fees, AI usage, and advertising budgets are treated.",
    sections: [
      {
        title: "Subscription fees",
        body: "Subscription fees provide access to the co-Suite software according to the selected plan. Plans may be monthly or yearly and may include different limits, seats, AI usage, storage, or publishing capabilities.",
      },
      {
        title: "Advertising budgets",
        body: "Advertising budgets are separate from subscription fees. Media spend may be charged by platforms such as Meta or Google, or managed through a dedicated budget balance. The user is responsible for campaign approvals and budget decisions.",
      },
      {
        title: "AI and generation costs",
        body: "Some AI operations, especially image/video generation and high-volume content generation, may have additional cost, limits, or balance deductions.",
      },
      {
        title: "Failed payments and suspension",
        body: "If payment fails or balance becomes insufficient, co-Suite may pause generation, publishing, analytics refreshes, or campaign-management functions until payment or balance is restored.",
      },
    ],
  },
];

export function getLegalPolicy(slug: string) {
  return legalPolicies.find((policy) => policy.slug === slug);
}
