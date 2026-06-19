import type { Metadata, Viewport } from "next"
import { DM_Sans, Lora, Space_Grotesk } from "next/font/google"
import { ClerkProvider } from "@clerk/nextjs"
import { Toaster } from "sonner"

import { DeveloperViewportIndicator } from "@/components/developer/developer-viewport-indicator"
import { ThemeProvider } from "@/components/layout/layout-theme-provider"
import { PwaRegisterSw } from "@/components/pwa/pwa-register-sw"

import "./globals.css"

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-space-grotesk",
  display: "swap"
})

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  variable: "--font-dm-sans",
  display: "swap"
})

const lora = Lora({
  subsets: ["latin"],
  weight: ["400", "600"],
  style: ["italic"],
  variable: "--font-lora",
  display: "swap"
})

export const metadata: Metadata = {
  title: "Foracle - Personal Finance Management",
  description: "Take control of your financial future with Foracle",
  // Site-wide noindex, inherited by every route. Remove when ready to launch.
  robots: { index: false, follow: false },
  // Linked via Next's Metadata API (no raw <head> tag). PWA icons live in the
  // manifest; these <link> icons cover favicons + the iOS apple-touch-icon.
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/logo-72.png", sizes: "72x72", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" }
    ],
    // iOS uses apple-touch-icon (opaque, 180x180); it rounds the corners itself.
    apple: [{ url: "/icons/icon-180.png", sizes: "180x180", type: "image/png" }]
  },
  // iOS "Add to Home Screen" launches standalone (full-screen, no Safari chrome).
  appleWebApp: {
    capable: true,
    title: "Foracle",
    statusBarStyle: "default"
  }
}

export const viewport: Viewport = {
  // Opt into the safe-area insets the bottom nav already references via
  // env(safe-area-inset-*); without viewport-fit=cover those resolve to 0 on iOS.
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FBF7F1" },
    { media: "(prefers-color-scheme: dark)", color: "#1C2B2A" }
  ]
}

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <ClerkProvider
      appearance={{
        variables: {
          colorPrimary: "#B8622A",
          colorBackground: "#FBF7F1",
          colorText: "#1C2B2A",
          colorTextSecondary: "rgba(28,43,42,0.55)",
          colorInputBackground: "#FFFFFF",
          colorInputText: "#1C2B2A",
          fontFamily: '"Space Grotesk", system-ui, sans-serif',
          borderRadius: "10px"
        },
        elements: {
          formButtonPrimary:
            "bg-brand-terracotta hover:bg-brand-coral text-brand-warm-white font-medium",
          card: "border border-brand-deep-forest/[0.1] shadow-none",
          headerTitle: "text-brand-deep-forest",
          headerSubtitle: "text-brand-deep-forest/[0.55]",
          socialButtonsBlockButton:
            "border-brand-deep-forest/[0.2] hover:bg-brand-cream"
        }
      }}
      signInFallbackRedirectUrl="/overview"
      signUpFallbackRedirectUrl="/overview">
      <html lang="en" suppressHydrationWarning>
        <body
          className={`${dmSans.className} ${dmSans.variable} ${spaceGrotesk.variable} ${lora.variable} antialiased`}>
          <ThemeProvider
            attribute="class"
            defaultTheme="light"
            enableSystem
            disableTransitionOnChange>
            {children}
            <DeveloperViewportIndicator />
            <PwaRegisterSw />
            <Toaster
              position="bottom-right"
              toastOptions={{
                style: {
                  background: "#FBF7F1",
                  border: "1px solid rgba(28,43,42,0.10)",
                  color: "#1C2B2A",
                  fontFamily: '"Space Grotesk", system-ui, sans-serif'
                }
              }}
            />
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  )
}
