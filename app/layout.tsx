import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/providers/providers";
import { Suspense } from "react";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "LyraAI - AI-Powered Interview Coach",
  description: "Practice interviews with AI. Get real-time feedback on behavioral, technical, system design, and case study interviews.",
  keywords: ["interview", "AI", "practice", "coaching", "technical interview", "behavioral interview", "career"],
  authors: [{ name: "LyraAI Team" }],
  openGraph: {
    title: "LyraAI - Your AI Interview Coach",
    description: "Master your interviews with AI-powered coaching and real-time feedback",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "LyraAI - AI Interview Coach",
    description: "Practice interviews with AI and get instant feedback",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Suspense fallback={null}>
          <Providers>{children}</Providers>
        </Suspense>
      </body>
    </html>
  );
}
