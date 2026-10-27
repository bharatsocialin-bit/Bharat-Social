import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Noto_Sans } from "next/font/google";
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
// Branding note (rebrand 2026-10):
//   Public-facing brand is "Desily — One India. Every Voice."
//   The deployed domain is NOT changed here. The canonical production URL
//   remains the existing Vercel deployment until the user confirms the new
//   domain. See REBRANDING.md (and the report accompanying this commit) for
//   the full domain-update checklist.
//
//   DO NOT introduce a hardcoded `https://desily.in` (or any other) URL
//   until the user confirms the secured domain.
// ─────────────────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: "Desily — One India. Every Voice.",
  description:
    "Desily is a modern social space for people across India. Share short posts, follow what you love, and stay close to your communities — in English, हिन्दी, తెలుగు and more.",
  keywords: [
    "Desily",
    "social media India",
    "Indian social network",
    "short posts",
    "Hindi",
    "Telugu",
    "India",
    "One India Every Voice",
  ],
  authors: [{ name: "Desily" }],
  applicationName: "Desily",
  icons: {
    icon: [
      { url: '/favicon-32.png', type: 'image/png', sizes: '32x32' },
      { url: '/favicon-16.png', type: 'image/png', sizes: '16x16' },
      { url: '/desily-icon-192.png', type: 'image/png', sizes: '192x192' },
      { url: '/desily-icon-512.png', type: 'image/png', sizes: '512x512' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180' },
    ],
    shortcut: ['/favicon-32.png'],
  },
  manifest: "/manifest.webmanifest",
  openGraph: {
    title: "Desily — One India. Every Voice.",
    description: "A modern social space for people across India. One India. Every Voice.",
    siteName: "Desily",
    type: "website",
    // NOTE: `url` deliberately omitted — the canonical domain is not yet
    // confirmed. Open Graph consumers will fall back to the request URL,
    // which is correct for both the Vercel preview domain and any future
    // custom domain.
    images: [
      {
        url: "/desily-logo.png",
        width: 1254,
        height: 1254,
        alt: "Desily — One India. Every Voice.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Desily — One India. Every Voice.",
    description: "A modern social space for people across India. One India. Every Voice.",
    images: ["/desily-logo.png"],
  },
};

export const viewport: Viewport = {
  // Brand navy — matches the favicon background and the PWA manifest theme.
  themeColor: "#0B2545",
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
        className={`${geistSans.variable} ${geistMono.variable} ${notoSans.variable} antialiased bg-background text-foreground`}
      >
        <AuthProvider>
          {children}
        </AuthProvider>
        <Toaster />
      </body>
    </html>
  );
}
