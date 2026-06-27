import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { Nav } from "@/components/nav";
import { Toaster } from "@/components/ui/sonner";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist-sans" });

export const metadata: Metadata = {
  title: "Pickleball Matchmaker",
  description: "Smart team matchmaking for pickleball sessions",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${geist.variable} h-full`}>
      <body className="min-h-full flex flex-col bg-background font-sans antialiased">
        <Nav />
        <main className="flex-1">{children}</main>
        <Toaster richColors position="bottom-right" />
      </body>
    </html>
  );
}
