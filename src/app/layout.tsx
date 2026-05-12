import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Inter } from "next/font/google";
import { AppProviders } from "./app-providers";
import { AppToaster } from "@/components/app-toaster";
import { PwaRegister } from "@/components/pwa-register";
import { ThemeScript } from "@/components/theme-script";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Truck Finanças - Gestão de Fretes",
  description:
    "Gestão financeira e controle de comissões para motoristas e donos de frota",
  applicationName: "Truck Finanças",
  icons: {
    icon: "/brand-logo-rounded.png",
    shortcut: "/brand-logo-rounded.png",
    apple: "/brand-logo-rounded.png",
  },
  appleWebApp: {
    capable: true,
    title: "Truck Finanças",
    statusBarStyle: "black-translucent",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  /** Alinha com hsl(var(--primary)) em globals.css (claro · #2463eb, escuro · #468af6) */
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#468af6" },
    { media: "(prefers-color-scheme: light)", color: "#2463eb" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${inter.variable} font-sans antialiased`}
      >
        <ThemeScript />
        <AppProviders>
          {children}
          <AppToaster />
          <PwaRegister />
        </AppProviders>
      </body>
    </html>
  );
}
