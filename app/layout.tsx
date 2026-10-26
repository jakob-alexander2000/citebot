import type { Metadata } from "next";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import { getBrand } from "@/lib/brand";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument",
  subsets: ["latin"],
  weight: "400",
});

export function generateMetadata(): Metadata {
  const brand = getBrand();
  return {
    title: `${brand.name} — RAG with citations`,
    description: brand.description,
  };
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  const brand = getBrand();

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${instrumentSerif.variable} h-full antialiased`}
      style={{ ["--brand-accent" as string]: brand.accent }}
    >
      <body className="flex min-h-full flex-col font-sans">{children}</body>
    </html>
  );
}
