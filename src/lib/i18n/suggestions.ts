import type { LangCode } from "./translations";

export interface SuggestionSets {
  niches: string[];
  usp: string[];
  esp: string[];
  interests: Record<string, string[]>;
}

export const SUGGESTIONS: Record<LangCode, SuggestionSets> = {
  en: {
    niches: [
      "Digital Marketing Agency", "E-commerce", "Restaurant & Food",
      "Fashion & Beauty", "Real Estate", "Health & Wellness",
      "Education & Training", "Technology & Software", "Travel & Tourism",
      "Photography & Media", "Legal Services", "Financial Services",
      "Retail & Shopping", "Construction",
    ],
    usp: [
      "Years of experience", "Competitive pricing", "Fast delivery",
      "Local expertise", "Personalized service", "Quality guarantee",
      "24/7 support", "Free consultation", "Proven results",
    ],
    esp: [
      "Feel confident", "Save time", "Feel professional",
      "Peace of mind", "Feel proud of their brand", "In control",
      "Satisfied with results", "Stand out from competitors",
    ],
    interests: {
      "Digital Marketing Agency": ["Social media marketing", "Digital advertising", "Content creation", "SEO", "Branding"],
      "Restaurant & Food": ["Food & dining", "Cooking", "Local cuisine", "Healthy eating"],
      "Fashion & Beauty": ["Fashion", "Beauty", "Lifestyle", "Shopping", "Style trends"],
      "Real Estate": ["Real estate", "Home improvement", "Interior design", "Investment"],
      "Health & Wellness": ["Health", "Fitness", "Nutrition", "Wellness", "Mental health"],
      "default": ["Business", "Entrepreneurship", "Social media", "Innovation", "Technology"],
    },
  },
  ar: {
    niches: [
      "وكالة تسويق رقمي", "تجارة إلكترونية", "مطعم وطعام",
      "أزياء وجمال", "عقارات", "صحة ولياقة",
      "تعليم وتدريب", "تكنولوجيا وبرمجيات", "سياحة وسفر",
      "تصوير وإعلام", "خدمات قانونية", "خدمات مالية",
      "تجزئة وتسوق", "بناء وإنشاء",
    ],
    usp: [
      "سنوات من الخبرة", "أسعار تنافسية", "تسليم سريع",
      "خبرة محلية", "خدمة شخصية", "ضمان الجودة",
      "دعم على مدار الساعة", "استشارة مجانية", "نتائج مثبتة",
    ],
    esp: [
      "الشعور بالثقة", "توفير الوقت", "الشعور بالاحترافية",
      "راحة البال", "الفخر بعلامتهم التجارية", "التحكم الكامل",
      "الرضا عن النتائج", "التميز عن المنافسين",
    ],
    interests: {
      "وكالة تسويق رقمي": ["التسويق عبر وسائل التواصل", "الإعلانات الرقمية", "إنشاء المحتوى", "تحسين محركات البحث", "بناء العلامة التجارية"],
      "مطعم وطعام": ["الطعام والمطاعم", "الطبخ", "المطبخ المحلي", "الأكل الصحي"],
      "أزياء وجمال": ["الموضة", "الجمال", "أسلوب الحياة", "التسوق", "اتجاهات الموضة"],
      "عقارات": ["العقارات", "تحسين المنزل", "التصميم الداخلي", "الاستثمار"],
      "صحة ولياقة": ["الصحة", "اللياقة البدنية", "التغذية", "العافية", "الصحة النفسية"],
      "default": ["الأعمال", "ريادة الأعمال", "وسائل التواصل الاجتماعي", "الابتكار", "التكنولوجيا"],
    },
  },
  he: {
    niches: [
      "סוכנות שיווק דיגיטלי", "מסחר אלקטרוני", "מסעדות ואוכל",
      "אופנה ויופי", "נדל\"ן", "בריאות וכושר",
      "חינוך והכשרה", "טכנולוגיה ותוכנה", "תיירות ונסיעות",
      "צילום ומדיה", "שירותים משפטיים", "שירותים פיננסיים",
      "קמעונאות וקניות", "בנייה",
    ],
    usp: [
      "שנות ניסיון", "תמחור תחרותי", "משלוח מהיר",
      "מומחיות מקומית", "שירות אישי", "ערובה לאיכות",
      "תמיכה 24/7", "ייעוץ חינם", "תוצאות מוכחות",
    ],
    esp: [
      "תחושת ביטחון", "חיסכון בזמן", "תחושת מקצועיות",
      "שקט נפשי", "גאווה במותג שלהם", "שליטה מלאה",
      "שביעות רצון מהתוצאות", "בלוט מהמתחרים",
    ],
    interests: {
      "סוכנות שיווק דיגיטלי": ["שיווק ברשתות חברתיות", "פרסום דיגיטלי", "יצירת תוכן", "SEO", "מיתוג"],
      "מסעדות ואוכל": ["אוכל ומסעדות", "בישול", "מטבח מקומי", "אכילה בריאה"],
      "אופנה ויופי": ["אופנה", "יופי", "אורח חיים", "קניות", "טרנדים"],
      "נדל\"ן": ["נדל\"ן", "שיפוץ הבית", "עיצוב פנים", "השקעות"],
      "בריאות וכושר": ["בריאות", "כושר גופני", "תזונה", "רווחה", "בריאות נפשית"],
      "default": ["עסקים", "יזמות", "רשתות חברתיות", "חדשנות", "טכנולוגיה"],
    },
  },
  fr: {
    niches: [
      "Agence de marketing digital", "E-commerce", "Restaurant & Restauration",
      "Mode & Beauté", "Immobilier", "Santé & Bien-être",
      "Formation & Éducation", "Technologie & Logiciels", "Voyage & Tourisme",
      "Photographie & Médias", "Services juridiques", "Services financiers",
      "Commerce de détail", "Construction",
    ],
    usp: [
      "Années d'expérience", "Prix compétitifs", "Livraison rapide",
      "Expertise locale", "Service personnalisé", "Garantie qualité",
      "Support 24h/24", "Consultation gratuite", "Résultats prouvés",
    ],
    esp: [
      "Se sentir confiant", "Gagner du temps", "Se sentir professionnel",
      "Tranquillité d'esprit", "Fierté de leur marque", "Maîtrise totale",
      "Satisfaction des résultats", "Se démarquer de la concurrence",
    ],
    interests: {
      "default": ["Business", "Entrepreneuriat", "Réseaux sociaux", "Innovation", "Technologie"],
    },
  },
  es: {
    niches: [
      "Agencia de marketing digital", "E-commerce", "Restaurante y Gastronomía",
      "Moda y Belleza", "Bienes raíces", "Salud y Bienestar",
      "Educación y Formación", "Tecnología y Software", "Viajes y Turismo",
      "Fotografía y Medios", "Servicios legales", "Servicios financieros",
      "Comercio minorista", "Construcción",
    ],
    usp: [
      "Años de experiencia", "Precios competitivos", "Entrega rápida",
      "Experiencia local", "Servicio personalizado", "Garantía de calidad",
      "Soporte 24/7", "Consulta gratuita", "Resultados comprobados",
    ],
    esp: [
      "Sentirse seguro", "Ahorrar tiempo", "Sentirse profesional",
      "Tranquilidad", "Orgullo por su marca", "Control total",
      "Satisfacción con los resultados", "Destacar de la competencia",
    ],
    interests: {
      "default": ["Negocios", "Emprendimiento", "Redes sociales", "Innovación", "Tecnología"],
    },
  },
  tr: {
    niches: [
      "Dijital Pazarlama Ajansı", "E-ticaret", "Restoran ve Yemek",
      "Moda ve Güzellik", "Gayrimenkul", "Sağlık ve Wellness",
      "Eğitim ve Öğretim", "Teknoloji ve Yazılım", "Seyahat ve Turizm",
      "Fotoğrafçılık ve Medya", "Hukuk Hizmetleri", "Finans Hizmetleri",
      "Perakende ve Alışveriş", "İnşaat",
    ],
    usp: [
      "Yıllarca deneyim", "Rekabetçi fiyatlar", "Hızlı teslimat",
      "Yerel uzmanlık", "Kişisel hizmet", "Kalite garantisi",
      "7/24 destek", "Ücretsiz danışmanlık", "Kanıtlanmış sonuçlar",
    ],
    esp: [
      "Güven hissi", "Zaman tasarrufu", "Profesyonellik hissi",
      "Gönül rahatlığı", "Markasıyla gurur", "Tam kontrol",
      "Sonuçlardan memnuniyet", "Rakiplerden öne çıkma",
    ],
    interests: {
      "default": ["İş dünyası", "Girişimcilik", "Sosyal medya", "İnovasyon", "Teknoloji"],
    },
  },
};

export function getSuggestions(lang: LangCode): SuggestionSets {
  return SUGGESTIONS[lang] || SUGGESTIONS["en"];
}

/** Find the canonical index of an English niche string (fuzzy match). Returns -1 if not found. */
export function findNicheIndex(englishNiche: string): number {
  if (!englishNiche) return -1;
  const q = englishNiche.toLowerCase();
  return SUGGESTIONS.en.niches.findIndex(
    (n) => n.toLowerCase() === q || q.includes(n.toLowerCase()) || n.toLowerCase().includes(q)
  );
}

/** Get the English canonical niche name for a given index. */
export function getEnglishNiche(idx: number): string {
  return SUGGESTIONS.en.niches[idx] || "";
}
