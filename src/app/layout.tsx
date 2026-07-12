import type { Metadata, Viewport } from "next";
import { Inter, Cairo, Noto_Sans_Hebrew } from "next/font/google";
import "./globals.css";
import { LanguageProvider } from "@/lib/i18n/LanguageContext";
import { ThemeProvider } from "@/lib/theme/ThemeContext";
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

// App-like mobile behavior: maximumScale/userScalable stop iOS from zooming
// the layout on input focus (the page then pans sideways and never recovers).
// interactiveWidget "resizes-visual" is the native-app choice: the keyboard
// slides OVER the page without resizing the layout viewport, so dvh/vh stay
// constant and nothing reflows on focus — the browser just scrolls the focused
// field into the visual viewport. (resizes-content shrinks the layout viewport,
// which makes every 100dvh container jump/reflow the moment the keyboard opens.)
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  interactiveWidget: "resizes-visual",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${cairo.variable} ${notoHebrew.variable} h-full antialiased`}>
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
