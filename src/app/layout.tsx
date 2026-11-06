import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Noto_Sans, Bangers } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/components/providers/AuthProvider";

// Geist Sans — primary Latin typeface (clean, modern, premium feel).
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

// Geist Mono — used sparingly for numbers / timestamps.
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

// Bangers — comic-book display font. Used ONLY by the Comic Bible section
// (hero banner title, story card titles, reader headings) for the golden
// comic-lettering look. Not part of the general Lordsbook type system.
const bangers = Bangers({
  variable: "--font-comic",
  subsets: ["latin"],
  weight: ["400"],
  display: "swap",
});

// Noto Sans — wide script coverage. We deliberately do NOT subset so that
// Devanagari (Hindi/Marathi), Telugu, Tamil, Bengali, Kannada, Malayalam,
// Gujarati, Gurmukhi (Punjabi), Odia and Urdu (Arabic) glyphs are all
// available at runtime.
const notoSans = Noto_Sans({
  variable: "--font-noto-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

// ─────────────────────────────────────────────────────────────────────────────
// Branding note (rebrand 2026-11):
//   Public-facing brand is "Lordsbook" — a Christian social network with
//   faith reels, Bible teachings, and scripture devotionals designed to
//   help you grow in faith daily. Legacy brand names (BharatSocial, Desily)
//   are preserved only as defensive reserved usernames + internal code
//   comments. The deployed domain is NOT changed here. The canonical
//   production URL remains the existing Vercel deployment until the user
//   confirms the new domain. See REBRANDING.md for the full domain-update
//   checklist.
//
//   DO NOT introduce a hardcoded `https://lordsbook.com` (or any other) URL
//   until the user confirms the secured domain.
// ─────────────────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: "Lordsbook — Christian Social Network",
  description:
    "Lordsbook is a Christian social network with faith reels, Bible teachings, and scripture devotionals designed to help you grow in faith daily through scripture, community, and the Word.",
  keywords: [
    "Lordsbook",
    "Christian social network",
    "faith community",
    "Bible teachings",
    "scripture devotionals",
    "faith reels",
    "daily devotional",
    "Christian fellowship",
    "grow in faith",
  ],
  authors: [{ name: "Lordsbook" }],
  applicationName: "Lordsbook",
  icons: {
    icon: [
      { url: '/favicon-32.png', type: 'image/png', sizes: '32x32' },
      { url: '/favicon-16.png', type: 'image/png', sizes: '16x16' },
      { url: '/lordsbook-icon-192.png', type: 'image/png', sizes: '192x192' },
      { url: '/lordsbook-icon-512.png', type: 'image/png', sizes: '512x512' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180' },
    ],
    shortcut: ['/favicon-32.png'],
  },
  manifest: "/manifest.webmanifest",
  openGraph: {
    title: "Lordsbook — Christian Social Network",
    description: "Faith reels, Bible teachings, and scripture devotionals. Grow in faith daily with the Lordsbook community.",
    siteName: "Lordsbook",
    type: "website",
    // NOTE: `url` deliberately omitted — the canonical domain is not yet
    // confirmed. Open Graph consumers will fall back to the request URL.
    images: [
      {
        url: "/lordsbook-logo.png",
        width: 1254,
        height: 1254,
        alt: "Lordsbook",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Lordsbook — Christian Social Network",
    description: "Faith reels, Bible teachings, and scripture devotionals. Grow in faith daily with the Lordsbook community.",
    images: ["/lordsbook-logo.png"],
  },
};

export const viewport: Viewport = {
  // Brand royal blue — matches the Lordsbook shield border + PWA manifest theme.
  themeColor: "#2563EB",
  width: "device-width",
  initialScale: 1,
  // Respect iOS safe areas so the mobile bottom nav doesn't get clipped.
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${notoSans.variable} ${bangers.variable} antialiased bg-background text-foreground`}
      >
        <AuthProvider>
          {children}
        </AuthProvider>
        <Toaster />
      </body>
    </html>
  );
}
