import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { QueryProvider } from "@/components/providers";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Content OS — Daily Process Tracker",
  description: "Simple single-page tracker: Pinterest rotation, categories, daily tasks, progress, rewards.",
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        {/* Inline style to prevent ANY white flash before CSS loads */}
        <style dangerouslySetInnerHTML={{ __html: `html,body{background:#09090b;background-color:#09090b;}` }} />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`} style={{ backgroundColor: "#09090b" }}>
        <QueryProvider>{children}</QueryProvider>
        <Toaster />
        <SonnerToaster />
      </body>
    </html>
  );
}
