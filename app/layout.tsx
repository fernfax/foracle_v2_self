import type { Metadata } from "next";
import { Space_Grotesk, DM_Sans, Lora } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-space-grotesk",
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  variable: "--font-dm-sans",
  display: "swap",
});

const lora = Lora({
  subsets: ["latin"],
  weight: ["400", "600"],
  style: ["italic"],
  variable: "--font-lora",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Foracle - Personal Finance Management",
  description: "Take control of your financial future with Foracle",
  icons: {
    icon: [
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/logo-72.png", sizes: "72x72", type: "image/png" },
    ],
    apple: [
      { url: "/logo-144.png", sizes: "144x144", type: "image/png" },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
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
          borderRadius: "10px",
        },
        elements: {
          formButtonPrimary:
            "bg-[#B8622A] hover:bg-[#D4845A] text-[#FBF7F1] font-medium",
          card: "border border-[rgba(28,43,42,0.10)] shadow-none",
          headerTitle: "text-[#1C2B2A]",
          headerSubtitle: "text-[rgba(28,43,42,0.55)]",
          socialButtonsBlockButton:
            "border-[rgba(28,43,42,0.20)] hover:bg-[#F0EBE0]",
        },
      }}
      signInFallbackRedirectUrl="/overview"
      signUpFallbackRedirectUrl="/overview"
    >
      <html lang="en" suppressHydrationWarning>
        <body
          className={`${dmSans.className} ${dmSans.variable} ${spaceGrotesk.variable} ${lora.variable} antialiased`}
        >
          <ThemeProvider
            attribute="class"
            defaultTheme="light"
            enableSystem
            disableTransitionOnChange
          >
            {children}
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
