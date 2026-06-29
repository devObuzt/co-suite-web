import { LangCode } from "@/lib/i18n/translations";

export interface AdminPromptCatalogRow {
  key: string;
  source: string;
  sourceLabel: string;
  title: string;
  defaultValue: string;
}

const SOCIAL_PROMPTS_AR = {
  base: `ابدأ دائمًا بتعريف البزنس:
- الاسم
- المنتجات والخدمات
- تفاصيل الجمهور المستهدف
- العرض التسويقي كجواب على حاجة الجمهور
- الرسالة التسويقية

اكتب النتيجة بلغة الجمهور الأولى، وباللهجة المحددة إن وجدت.`,
  attraction: `اعطيني {count} فكرة ريل أو بوست
عن قصص حقيقية أو ترندات متعلقة أو أفكار جذابة تجاوب اهتمامات وسلوكيات جمهوري في مجالي.
الفكرة يجب أن تكون ذات طابع غريب أو فاشل أو ناجح أو مميز، ومعها عبرة أو نصيحة للجمهور المستهدف.
اكتب كل فكرة بصيغة عنوان صادم غير متوقع أو استخدم إحدى أساليب الفضول، ومع نص 15 سطر للشرح بطريقة سرد قصصي أو جذابة.
اختم بدعوة عفوية لمتابعة صفحتي أو الحجز معي أو الشراء أو طلب الخدمة.`,
  trust: `اعطيني {count} فكرة ريل أو بوست
تعليمي يعطي معلومات جديدة ومفيدة في مجالي أو أفكار تساعد على بناء الهوية والثقة مع المتابعين.
تبدأ بعنوان صادم غير متوقع أو استخدم إحدى أساليب الفضول، مع نص 10 أسطر يوضح الفكرة وخطوات عملية للتطبيق بطريقة سرد قصصي.
اختم بعرض خدمتي أو متابعة صفحتي بطريقة عفوية.`,
  sales: `اعطيني {count} فكرة ريل أو بوست
عن قصص عملائي لتسويق خدماتي/منتجاتي بطريقة جذابة ومقنعة، أو أي فكرة لزيادة المبيعات مناسبة لنوع المصلحة.
اكتب كل فكرة بصيغة عنوان صادم غير متوقع أو استخدم إحدى أساليب الفضول، ومع نص 15 سطر بطريقة سرد قصصي.
اختم بدعوة عفوية للحجز أو الشراء أو طلب الخدمة.`,
  hooks: `أساليب الفضول:
1. Curiosity Hook
2. Promise Hook
3. Pattern Break / Shock
4. Question Hook
5. Story Hook

حيل اختيار الأفكار:
1. Amplify Your Point
2. Be Competitive
3. Challenge The Norm
4. Don’t (Directly) Sell
5. Be Emotionally Open

فكر دائمًا بالعرض الذي يجاوب حاجة الجمهور.`,
};

export function buildAdminPromptCatalog(_language: LangCode): AdminPromptCatalogRow[] {
  return [
    {
      key: "prompts.marketingPlan.social.base",
      source: "marketingPlan",
      sourceLabel: "الخطة التسويقية",
      title: "تعريف البزنس الدائم",
      defaultValue: SOCIAL_PROMPTS_AR.base,
    },
    {
      key: "prompts.marketingPlan.social.attraction",
      source: "marketingPlan",
      sourceLabel: "الخطة التسويقية",
      title: "محتوى جذب المتابعين والمشاهدات",
      defaultValue: SOCIAL_PROMPTS_AR.attraction,
    },
    {
      key: "prompts.marketingPlan.social.trust",
      source: "marketingPlan",
      sourceLabel: "الخطة التسويقية",
      title: "محتوى بناء الثقة والهوية",
      defaultValue: SOCIAL_PROMPTS_AR.trust,
    },
    {
      key: "prompts.marketingPlan.social.sales",
      source: "marketingPlan",
      sourceLabel: "الخطة التسويقية",
      title: "محتوى زيادة المبيعات",
      defaultValue: SOCIAL_PROMPTS_AR.sales,
    },
    {
      key: "prompts.marketingPlan.social.hooks",
      source: "marketingPlan",
      sourceLabel: "الخطة التسويقية",
      title: "أساليب الفضول والحيل الفعالة",
      defaultValue: SOCIAL_PROMPTS_AR.hooks,
    },
  ];
}
