import type { Metadata } from "next";
import { Geist, Geist_Mono, Spectral } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const spectral = Spectral({
  variable: "--font-spectral",
  subsets: ["latin"],
  weight: ["700", "800"],
});

/**
 * Accepts either the bare token or the full `<meta … content="…">` tag Search
 * Console shows, since the whole tag is what people tend to copy.
 */
function googleVerificationToken(raw: string | undefined): string | undefined {
  const value = raw?.trim();
  if (!value) return undefined;
  const fromTag = /content=["']?([A-Za-z0-9_-]+)/.exec(value)?.[1];
  const token = fromTag ?? value;
  return /^[A-Za-z0-9_-]{20,}$/.test(token) ? token : undefined;
}

const googleSiteVerification = googleVerificationToken(process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION);

export const metadata: Metadata = {
  title: { default: "ChapterConnect", template: "%s · ChapterConnect" },
  description: "Connect with your alumni",
  // Google Search Console ownership proof, required for OAuth brand verification.
  // Set the variable in Vercel to the `content` value from the HTML-tag method.
  ...(googleSiteVerification ? { verification: { google: googleSiteVerification } } : {}),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${spectral.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <Toaster />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
