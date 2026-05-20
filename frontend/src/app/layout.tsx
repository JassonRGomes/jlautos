import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeAuthProvider } from "@/context/ThemeAuthContext";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import FloatingSmsButton from "@/components/FloatingSmsButton";


const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "J&L Autos | Premium Luxury Showroom & Car Dealership",
  description: "Browse J&L Autos' curated collection of premium luxury motorcars. Private test drives, VIP bookings, and bespoke pricing proposals are available online.",
  keywords: "Porsche, Aston Martin, Audi RS, Luxury Car Dealership, Beverly Hills Car Dealership, Digital Showroom",
  authors: [{ name: "J&L Autos Concierge Team" }],
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-background text-foreground transition-colors duration-300">
        <ThemeAuthProvider>
          <Navigation />
          <main className="flex-grow">{children}</main>
          <Footer />
          <FloatingSmsButton />
        </ThemeAuthProvider>

      </body>
    </html>
  );
}

