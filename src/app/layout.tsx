import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MXFeed – Motocross & Supercross News",
  description: "AI-powered motocross and supercross news for European and global fans",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full bg-[#0a0a0a] text-zinc-100 antialiased">
        {children}
      </body>
    </html>
  );
}
