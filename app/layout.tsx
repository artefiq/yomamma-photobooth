import type { Metadata, Viewport } from "next";
import { Nunito } from "next/font/google";
import "./globals.css";

// Drawn into the strip, and the fallback for SF Pro Rounded on non-Apple devices.
const nunito = Nunito({ variable: "--font-nunito", subsets: ["latin"], weight: ["600", "700", "800", "900"] });

export const metadata: Metadata = {
  title: "Yo! Mamma Photo Booth",
  description: "Strike a pose with your study buddy.",
  icons: { icon: "/logo.svg" },
};

export const viewport: Viewport = {
  themeColor: "#0F1F1D",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" data-theme="dark" className={`${nunito.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
