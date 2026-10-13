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

export const metadata: Metadata = {
  title: "BharatSocial — One India. Every Voice.",
  description:
    "BharatSocial is a modern social space for people across India. Share short posts, follow what you love, and stay close to your communities — in English, हिन्दी, తెలుగు and more.",
  keywords: [
    "BharatSocial",
    "Bharat Social",
    "social media India",
    "Indian social network",
    "short posts",
    "Hindi",
    "Telugu",
    "India",
    "One India Every Voice",
  ],
  authors: [{ name: "BharatSocial" }],
  applicationName: "BharatSocial",
  icons: {
    icon: "/logo.svg",
    apple: "/bharatsocial-logo.png",
  },
  manifest: undefined,
  openGraph: {
    title: "BharatSocial — One India. Every Voice.",
    description: "A modern social space for people across India. One India. Every Voice.",
    siteName: "BharatSocial",
    type: "website",
    url: "https://BharatSocial.in",
  },
  twitter: {
    card: "summary_large_image",
    title: "BharatSocial — One India. Every Voice.",
    description: "A modern social space for people across India. One India. Every Voice.",
  },
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
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
