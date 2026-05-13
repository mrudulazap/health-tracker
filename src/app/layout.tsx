import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { PinGate } from "@/components/PinGate";
import { Nav } from "@/components/Nav";

export const dynamic = "force-dynamic";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Health Tracker",
  description: "Track meals, workouts, and cycle",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#fdf6f0",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} h-full antialiased`}>
      <body className="min-h-full bg-[#fef3ec] text-stone-900">
        <PinGate>
          <Nav />
          <main className="mx-auto max-w-3xl px-4 pb-24 pt-4 sm:pb-8 sm:pt-6">
            {children}
          </main>
        </PinGate>
      </body>
    </html>
  );
}
