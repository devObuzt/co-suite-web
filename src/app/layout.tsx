import type { Metadata } from "next";
import "./globals.css";
import { LanguageProvider } from "@/lib/i18n/LanguageContext";
import { ThemeProvider } from "@/lib/theme/ThemeContext";
import { FirstTimeLanguagePicker } from "@/components/FirstTimeLanguagePicker";

export const metadata: Metadata = {
  title: "جميل شولي | حلاقة خيل عربية",
  description: "موقع حجز وتواصل لخدمات حلاقة وتجهيز الخيل العربية.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" className="h-full antialiased">
      <body className="min-h-full bg-background text-foreground">
        <ThemeProvider>
          <LanguageProvider>
            <FirstTimeLanguagePicker />
            {children}
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
