import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { AuthProvider } from "@/contexts/auth-context";
import { Toaster } from "@/components/ui/toaster";
import dynamic from 'next/dynamic';
import "./globals.css";

// Dynamically import the Capacitor integration component to prevent SSR issues
const CapacitorIntegration = dynamic(
  () => import('@/components/CapacitorIntegration'),
  { ssr: false }
);

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "Yamkar - Employee Management System",
    template: "%s | Yamkar",
  },
  description: "A comprehensive employee management system for agricultural businesses",
  keywords: ["employee management", "agriculture", "farmer data", "field operations"],
  authors: [{ name: "Yamkar" }],
  creator: "Yamkar",
  publisher: "Yamkar",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon-16x16.png",
    apple: "/apple-touch-icon.png",
  },
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
  },
  robots: {
    index: false,
    follow: false,
  },
  generator: 'v0.dev'
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <AuthProvider>
          {/* Add the Capacitor integration component */}
          <CapacitorIntegration />
          {children}
          <Toaster />
        </AuthProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}