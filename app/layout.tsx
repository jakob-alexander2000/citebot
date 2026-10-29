import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import { Analytics } from "@/components/Analytics";
import { getBrand } from "@/lib/brand";
import { ui } from "@/lib/messages";
import { getLocaleState } from "@/lib/request-locale";
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

/** English UI. Corpus language folders are not a visitor switch. */
export const instant = false;

export async function generateMetadata(): Promise<Metadata> {
  const { locale } = await getLocaleState();
  const brand = getBrand(locale);
  return {
    title: ui(locale).metaTitle(brand.name),
    description: brand.description,
  };
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  const { locale } = await getLocaleState();
  const brand = getBrand(locale);

  return (
    <html
      lang={locale}
      className={`${geistSans.variable} ${geistMono.variable} ${instrumentSerif.variable} h-full antialiased`}
      style={{ ["--brand-accent" as string]: brand.accent }}
    >
      <body className="flex min-h-full flex-col font-sans">
        <Analytics />
        {children}
      </body>
    </html>
  );
}
