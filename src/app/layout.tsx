import type { Metadata } from "next";
import { Inter, Cairo, Noto_Sans_Hebrew } from "next/font/google";
import "./globals.css";
import { LanguageProvider } from "@/lib/i18n/LanguageContext";
import { FirstTimeLanguagePicker } from "@/components/FirstTimeLanguagePicker";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

const cairo = Cairo({
  subsets: ["arabic", "latin"],
  variable: "--font-cairo",
  weight: ["400", "600", "700", "900"],
});

const notoHebrew = Noto_Sans_Hebrew({
  subsets: ["hebrew"],
  variable: "--font-hebrew",
  weight: ["400", "600", "700"],
});

export const metadata: Metadata = {
  title: "co-Suite — AI Marketing Suite",
  description: "The all-in-one AI-powered marketing suite for your business.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${cairo.variable} ${notoHebrew.variable} h-full antialiased`}>
      <body className="min-h-full bg-background text-foreground">
        <LanguageProvider>
          <FirstTimeLanguagePicker />
          {children}
        </LanguageProvider>
      </body>
    </html>
  );
}
