import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "../styles/elevated.css";
import "../styles/surfaces.css";
import { HahnSoloFooter } from "@/components/hahn-solo-footer";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Redirect Manager",
  description: "Purpose-built redirect CRUD for SitecoreAI — three extension points backed by Authoring GraphQL",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider>
          {/* MarketplaceProvider moved into per-extension-point layouts
              (context-panel/, dashboard-widget/, full-page/) so the root
              IntroPage at `/` can render without being blocked by the SDK
              handshake. Each extension route still wraps its own children
              in MarketplaceProvider via its nested layout. */}
          {children}
          <Toaster />
          <HahnSoloFooter />
        </ThemeProvider>
      </body>
    </html>
  );
}
