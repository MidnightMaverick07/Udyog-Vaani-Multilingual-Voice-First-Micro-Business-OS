import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Udyog-Vaani | Voice-First Micro Business OS",
  description:
    "Aawaz se hisaab – a voice-first digital ledger, underwriting assistant, and welfare navigator for India's micro-entrepreneurs, street vendors, and artisans.",
  keywords: "micro business, MSME, India, voice ledger, government schemes, mudra loan, rural entrepreneur",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
