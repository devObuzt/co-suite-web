"use client";

import { FormEvent, useMemo, useState } from "react";
import {
  ArrowUpLeft,
  CalendarCheck,
  Camera,
  CheckCircle2,
  Clock3,
  ExternalLink,
  MapPin,
  MessageCircle,
  Phone,
  Scissors,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

const WHATSAPP_NUMBER = "972500000000";
const INSTAGRAM_URL = "https://www.instagram.com/gamilsholy1/";

const services = [
  {
    title: "قص كامل للجسم",
    text: "تنظيف وتنعيم الفروة للخيول اللي بتتعرق كثير أو بتحتاج جاهزية للموسم والعروض.",
    detail: "Full body clip",
  },
  {
    title: "تهذيب الرأس والأذنين",
    text: "شغل هادي ودقيق بالمناطق الحساسة مع اهتمام براحة الخيل وردة فعله.",
    detail: "Face, ears, muzzle",
  },
  {
    title: "قص الأرجل والذيل واللبدة",
    text: "ترتيب اللمسات الظاهرة قبل التصوير، البيع، السباق، أو الزيارة البيطرية.",
    detail: "Legs, mane, tail",
  },
  {
    title: "تجهيز قبل المناسبة",
    text: "تنسيق الشكل النهائي حسب لون الفروة، نوع الخيل، وهدف الموعد.",
    detail: "Show ready",
  },
];

const steps = [
  "ابعث صورة أو فيديو قصير للخيل",
  "نحدد نوع القص والحالة والموقع",
  "يتم تأكيد الموعد وتجهيز الأدوات",
  "الخيل يطلع مرتب ونظيف ومرتاح",
];

const gallery = [
  {
    label: "Arabian profile",
    src: "https://images.unsplash.com/photo-1553284965-83fd3e82fa5a?auto=format&fit=crop&w=900&q=80",
  },
  {
    label: "Stable grooming",
    src: "https://images.unsplash.com/photo-1517519014922-8fc06b814a0e?auto=format&fit=crop&w=900&q=80",
  },
  {
    label: "Show finish",
    src: "https://images.unsplash.com/photo-1566251037378-5e04e3bec343?auto=format&fit=crop&w=900&q=80",
  },
];

type FormState = {
  name: string;
  phone: string;
  location: string;
  horse: string;
  service: string;
  message: string;
};

const initialForm: FormState = {
  name: "",
  phone: "",
  location: "",
  horse: "",
  service: "قص كامل للجسم",
  message: "",
};

function buildWhatsAppLink(form: FormState) {
  const message = [
    "مرحبا جميل، بدي أحجز موعد حلاقة خيل.",
    `الاسم: ${form.name || "-"}`,
    `الهاتف: ${form.phone || "-"}`,
    `المنطقة/الإسطبل: ${form.location || "-"}`,
    `نوع الخيل/ملاحظات: ${form.horse || "-"}`,
    `الخدمة المطلوبة: ${form.service || "-"}`,
    `تفاصيل إضافية: ${form.message || "-"}`,
  ].join("\n");

  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

export default function HorseBarberLandingPage() {
  const [form, setForm] = useState<FormState>(initialForm);
  const whatsappLink = useMemo(() => buildWhatsAppLink(form), [form]);

  function updateField(field: keyof FormState, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function submitForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    window.open(whatsappLink, "_blank", "noopener,noreferrer");
  }

  return (
    <main dir="rtl" className="min-h-screen bg-[#f6f0e7] text-[#1f1a14]">
      <a
        href={whatsappLink}
        aria-label="تواصل واتساب"
        className="fixed bottom-5 left-5 z-40 inline-flex h-14 w-14 items-center justify-center rounded-full bg-[#1f6f4a] text-white shadow-[0_16px_40px_rgba(31,111,74,0.35)] transition hover:scale-105"
      >
        <MessageCircle className="h-6 w-6" />
      </a>

      <header className="sticky top-0 z-30 border-b border-[#d8c6ad] bg-[#f6f0e7]/92 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 lg:px-8">
          <a href="#top" className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#2b241c] text-[#f3d38a]">
              <Scissors className="h-5 w-5" />
            </span>
            <span>
              <span className="block text-lg font-black leading-none">جميل شولي</span>
              <span className="text-xs font-semibold uppercase tracking-[0.22em] text-[#7a6247]">
                Arabian Horses Barber
              </span>
            </span>
          </a>
          <nav className="hidden items-center gap-6 text-sm font-bold text-[#5c4934] md:flex">
            <a href="#services" className="hover:text-[#1f1a14]">الخدمات</a>
            <a href="#gallery" className="hover:text-[#1f1a14]">الشغل</a>
            <a href="#booking" className="hover:text-[#1f1a14]">احجز</a>
          </nav>
          <a
            href={whatsappLink}
            className="inline-flex items-center gap-2 rounded-lg bg-[#1f6f4a] px-4 py-2.5 text-sm font-black text-white shadow-sm transition hover:bg-[#18583b]"
          >
            <MessageCircle className="h-4 w-4" />
            واتساب
          </a>
        </div>
      </header>

      <section id="top" className="relative overflow-hidden">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-10 lg:grid-cols-[0.95fr_1.05fr] lg:px-8 lg:py-16">
          <div className="flex flex-col justify-center">
            <div className="mb-5 inline-flex w-fit items-center gap-2 rounded-lg border border-[#cfb891] bg-[#fffaf0] px-3 py-2 text-sm font-bold text-[#745733]">
              <Sparkles className="h-4 w-4 text-[#b9782b]" />
              قص وتجهيز خيول عربية بهدوء ودقة
            </div>
            <h1 className="max-w-3xl text-5xl font-black leading-[1.05] tracking-normal text-[#211910] md:text-7xl">
              حلاقة خيل محترفة تخلي الفرس جاهز للعرض، التصوير، والموسم.
            </h1>
            <p className="mt-6 max-w-2xl text-lg font-semibold leading-8 text-[#6d563c]">
              خدمة ميدانية لحلاقة وتهذيب الخيل مع تركيز على راحة الحيوان، نظافة الشغل، وشكل نهائي مرتب يناسب الخيول العربية.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a
                href="#booking"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-[#2b241c] px-6 text-base font-black text-white transition hover:bg-[#413526]"
              >
                <CalendarCheck className="h-5 w-5" />
                احجز موعد
              </a>
              <a
                href={INSTAGRAM_URL}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-lg border border-[#c9b08a] bg-[#fffaf0] px-6 text-base font-black text-[#2b241c] transition hover:border-[#9e7743]"
              >
                <ExternalLink className="h-5 w-5" />
                شوف الإنستغرام
              </a>
            </div>
            <dl className="mt-10 grid max-w-xl grid-cols-3 gap-3">
              {[
                ["6", "منشورات"],
                ["57", "متابع"],
                ["45", "متابعهم"],
              ].map(([value, label]) => (
                <div key={label} className="border-r-2 border-[#b9782b] pr-3">
                  <dt className="text-3xl font-black text-[#2b241c]">{value}</dt>
                  <dd className="text-sm font-bold text-[#7a6247]">{label} من إنستغرام</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="relative min-h-[520px] overflow-hidden rounded-lg border border-[#ccb48f] bg-[#211910] shadow-[0_24px_80px_rgba(55,38,21,0.25)]">
            <img
              src="https://images.unsplash.com/photo-1534773728080-33d31da27ae5?auto=format&fit=crop&w=1400&q=82"
              alt="خيل عربي داخل الإسطبل"
              className="absolute inset-0 h-full w-full object-cover opacity-90"
            />
            <div className="absolute inset-0 bg-[linear-gradient(0deg,rgba(33,25,16,0.68),rgba(33,25,16,0.05)_55%,rgba(33,25,16,0.2))]" />
            <div className="absolute bottom-0 right-0 w-full p-5 sm:p-7">
              <div className="max-w-md rounded-lg border border-white/18 bg-[#211910]/78 p-5 text-white backdrop-blur-md">
                <p className="text-sm font-bold text-[#f3d38a]">Wireframe insight</p>
                <p className="mt-2 text-2xl font-black leading-tight">
                  الزبون بدو يشوف النتيجة بسرعة، بعدها يفهم إذا الخدمة آمنة للخيل، وبالنهاية يحجز بلمسة.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-[#d8c6ad] bg-[#2b241c] px-5 py-5 text-[#f6f0e7]">
        <div className="mx-auto grid max-w-7xl gap-4 text-sm font-bold md:grid-cols-3">
          <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-[#f3d38a]" /> خدمة حسب المنطقة والإسطبل</div>
          <div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-[#f3d38a]" /> تعامل هادي مع الخيول الحساسة</div>
          <div className="flex items-center gap-2"><Clock3 className="h-4 w-4 text-[#f3d38a]" /> مواعيد منظمة حسب الموسم</div>
        </div>
      </section>

      <section id="services" className="mx-auto max-w-7xl px-5 py-16 lg:px-8">
        <div className="mb-9 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.24em] text-[#b9782b]">الخدمات</p>
            <h2 className="mt-2 text-4xl font-black text-[#211910] md:text-5xl">كل اللي يحتاجه الخيل قبل ما يطلع مرتب.</h2>
          </div>
          <p className="max-w-xl text-base font-semibold leading-7 text-[#6d563c]">
            المنافسون في المجال يربحون بالثقة: خبرة، صور نتيجة، شرح تحضير الخيل، وحجز مباشر. لذلك الصفحة مبنية حول هذه الأربع نقاط.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {services.map((service) => (
            <article key={service.title} className="rounded-lg border border-[#d2bc96] bg-[#fffaf0] p-5 shadow-sm">
              <div className="mb-5 flex items-center justify-between gap-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-[#ead8b8] text-[#2b241c]">
                  <Scissors className="h-5 w-5" />
                </span>
                <span className="text-xs font-black uppercase tracking-[0.18em] text-[#99713b]">{service.detail}</span>
              </div>
              <h3 className="text-xl font-black text-[#211910]">{service.title}</h3>
              <p className="mt-3 text-sm font-semibold leading-7 text-[#6d563c]">{service.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="gallery" className="bg-[#e8dcc9] px-5 py-16 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 flex items-center justify-between gap-5">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.24em] text-[#9e6722]">الشغل</p>
              <h2 className="mt-2 text-4xl font-black text-[#211910]">معرض سريع يعطي ثقة قبل الاتصال.</h2>
            </div>
            <Camera className="hidden h-12 w-12 text-[#9e6722] md:block" />
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {gallery.map((image, index) => (
              <figure key={image.label} className="group overflow-hidden rounded-lg border border-[#c8ad82] bg-[#fffaf0]">
                <div className="aspect-[4/5] overflow-hidden">
                  <img
                    src={image.src}
                    alt={image.label}
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                  />
                </div>
                <figcaption className="flex items-center justify-between p-4 text-sm font-black text-[#4b3b29]">
                  <span>{index === 0 ? "شكل عربي واضح" : index === 1 ? "تجهيز بالإسطبل" : "نتيجة نهائية"}</span>
                  <ArrowUpLeft className="h-4 w-4" />
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-8 px-5 py-16 lg:grid-cols-[0.8fr_1.2fr] lg:px-8">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.24em] text-[#b9782b]">طريقة العمل</p>
          <h2 className="mt-2 text-4xl font-black text-[#211910]">حجز واضح بدون لف ودوران.</h2>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {steps.map((step, index) => (
            <div key={step} className="flex gap-4 rounded-lg border border-[#d2bc96] bg-[#fffaf0] p-5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#2b241c] text-sm font-black text-[#f3d38a]">
                {index + 1}
              </span>
              <p className="pt-1 text-base font-black leading-7 text-[#332719]">{step}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="booking" className="border-t border-[#d8c6ad] bg-[#fffaf0] px-5 py-16 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.24em] text-[#b9782b]">احجز الآن</p>
            <h2 className="mt-2 text-4xl font-black leading-tight text-[#211910] md:text-5xl">ابعث التفاصيل، والرسالة بتوصل جاهزة على واتساب.</h2>
            <div className="mt-8 space-y-4">
              {["يفضل يكون الخيل نظيف وجاف قبل القص", "اذكر إذا الخيل حساس من الصوت أو اللمس", "صور قبل الموعد تساعد بتحديد الوقت والسعر"].map((item) => (
                <div key={item} className="flex items-start gap-3">
                  <CheckCircle2 className="mt-1 h-5 w-5 shrink-0 text-[#1f6f4a]" />
                  <p className="text-base font-bold leading-7 text-[#5c4934]">{item}</p>
                </div>
              ))}
            </div>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href={whatsappLink} className="inline-flex items-center gap-2 rounded-lg bg-[#1f6f4a] px-5 py-3 font-black text-white">
                <MessageCircle className="h-5 w-5" />
                تواصل واتساب
              </a>
              <a href={INSTAGRAM_URL} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-lg border border-[#c8ad82] px-5 py-3 font-black text-[#2b241c]">
                <ExternalLink className="h-5 w-5" />
                @gamilsholy1
              </a>
            </div>
          </div>

          <form onSubmit={submitForm} className="rounded-lg border border-[#d2bc96] bg-[#f6f0e7] p-5 shadow-[0_20px_50px_rgba(55,38,21,0.12)] md:p-7">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2 text-sm font-black text-[#4b3b29]">
                الاسم
                <input value={form.name} onChange={(e) => updateField("name", e.target.value)} className="h-12 rounded-lg border border-[#c8ad82] bg-white px-3 text-base outline-none focus:border-[#1f6f4a]" placeholder="اسمك" />
              </label>
              <label className="grid gap-2 text-sm font-black text-[#4b3b29]">
                الهاتف
                <input value={form.phone} onChange={(e) => updateField("phone", e.target.value)} className="h-12 rounded-lg border border-[#c8ad82] bg-white px-3 text-base outline-none focus:border-[#1f6f4a]" placeholder="رقم للتواصل" />
              </label>
              <label className="grid gap-2 text-sm font-black text-[#4b3b29]">
                المنطقة / الإسطبل
                <input value={form.location} onChange={(e) => updateField("location", e.target.value)} className="h-12 rounded-lg border border-[#c8ad82] bg-white px-3 text-base outline-none focus:border-[#1f6f4a]" placeholder="مثال: الناصرة، سخنين..." />
              </label>
              <label className="grid gap-2 text-sm font-black text-[#4b3b29]">
                الخدمة
                <select value={form.service} onChange={(e) => updateField("service", e.target.value)} className="h-12 rounded-lg border border-[#c8ad82] bg-white px-3 text-base outline-none focus:border-[#1f6f4a]">
                  {services.map((service) => (
                    <option key={service.title}>{service.title}</option>
                  ))}
                </select>
              </label>
              <label className="grid gap-2 text-sm font-black text-[#4b3b29] md:col-span-2">
                نوع الخيل / الحالة
                <input value={form.horse} onChange={(e) => updateField("horse", e.target.value)} className="h-12 rounded-lg border border-[#c8ad82] bg-white px-3 text-base outline-none focus:border-[#1f6f4a]" placeholder="عربي، مهر، حساس من الماكينة..." />
              </label>
              <label className="grid gap-2 text-sm font-black text-[#4b3b29] md:col-span-2">
                ملاحظات إضافية
                <textarea value={form.message} onChange={(e) => updateField("message", e.target.value)} className="min-h-28 rounded-lg border border-[#c8ad82] bg-white px-3 py-3 text-base outline-none focus:border-[#1f6f4a]" placeholder="موعد مناسب، عدد الخيول، مناسبة قريبة..." />
              </label>
            </div>
            <button type="submit" className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#2b241c] text-base font-black text-white transition hover:bg-[#413526]">
              <Phone className="h-5 w-5" />
              إرسال الطلب على واتساب
            </button>
          </form>
        </div>
      </section>

      <footer className="bg-[#211910] px-5 py-8 text-[#f6f0e7] lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-lg font-black">جميل شولي | Arabian Horses Barber</p>
            <p className="mt-1 text-sm font-semibold text-[#cbb994]">موقع بسيط للحجز السريع وبناء الثقة من أول زيارة.</p>
          </div>
          <a href={INSTAGRAM_URL} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 font-black text-[#f3d38a]">
            <ExternalLink className="h-5 w-5" />
            instagram.com/gamilsholy1
          </a>
        </div>
      </footer>
    </main>
  );
}
