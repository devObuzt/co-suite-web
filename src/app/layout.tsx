import type { Metadata, Viewport } from "next";
import { Inter, Cairo, Noto_Sans_Hebrew } from "next/font/google";
import "./globals.css";
import { LanguageProvider } from "@/lib/i18n/LanguageContext";
import { AccessibilityProvider } from "@/lib/accessibility/AccessibilityContext";
import { AccessibilityFab } from "@/components/AccessibilityFab";
import { FirstTimeLanguagePicker } from "@/components/FirstTimeLanguagePicker";

// Runs before first paint to apply saved accessibility prefs (theme, font
// scale, contrast, motion) with no flash. Mirrors applyPrefs() in
// AccessibilityContext. Kept dependency-free and defensive.
const A11Y_INIT_SCRIPT = `(function(){try{var d=document.documentElement;var p=null;try{var raw=localStorage.getItem('oneshare_a11y_prefs');if(raw)p=JSON.parse(raw);}catch(e){}if(!p){var lg=localStorage.getItem('co_suite_theme');p={theme:(lg==='dark'||lg==='light')?lg:'light',fontScale:100,contrast:'normal',motion:'normal'};}var th=p.theme||'light';var res=th==='system'?((window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches)?'dark':'light'):th;d.classList.toggle('dark',res==='dark');d.dataset.theme=res;var fs=[100,125,150].indexOf(p.fontScale)>=0?p.fontScale:100;d.style.fontSize=fs+'%';if(p.contrast==='high')d.dataset.contrast='high';else delete d.dataset.contrast;if(p.motion==='reduced')d.dataset.motion='reduced';else delete d.dataset.motion;}catch(e){}})();`;

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
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} ${cairo.variable} ${notoHebrew.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-background text-foreground">
        <script dangerouslySetInnerHTML={{ __html: A11Y_INIT_SCRIPT }} />
        <AccessibilityProvider>
          <LanguageProvider>
            {children}
            <AccessibilityFab />
            <FirstTimeLanguagePicker />
          </LanguageProvider>
        </AccessibilityProvider>
      </body>
    </html>
  );
}
