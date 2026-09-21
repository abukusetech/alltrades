import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "ALLTRADES",
    template: "%s | ALLTRADES",
  },
  description:
    "Trading journal and account discipline system. Record trades, monitor performance, track consistency and withdrawals.",
  applicationName: "ALLTRADES",
  authors: [{ name: "ALLTRADES" }],
  creator: "ALLTRADES",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
  ),
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-16.png", type: "image/png", sizes: "16x16" },
      { url: "/favicon-32.png", type: "image/png", sizes: "32x32" },
      { url: "/favicon-48.png", type: "image/png", sizes: "48x48" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    shortcut: ["/favicon.ico"],
    apple: [
      { url: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  manifest: "/manifest.webmanifest",
  openGraph: {
    title: "ALLTRADES",
    description:
      "Trading journal and account discipline system. Record trades, monitor performance, track consistency and withdrawals.",
    siteName: "ALLTRADES",
    type: "website",
    images: [
      {
        url: "/icon-512.png",
        width: 512,
        height: 512,
        alt: "ALLTRADES",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: "ALLTRADES",
    description:
      "Trading journal and account discipline system.",
    images: ["/icon-512.png"],
  },
  robots: {
    index: false,
    follow: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#2563eb",
  colorScheme: "light",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen bg-white font-sans text-ink-900">
        {children}
      </body>
    </html>
  );
}
