import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { ThemeSync } from "@/components/theme-sync";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "BytePlus Dancing Together",
  description: "真人素材认证、素材入库与 Seedance 2.0 视频生成工作台。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <ThemeSync />
        {children}
      </body>
    </html>
  );
}
