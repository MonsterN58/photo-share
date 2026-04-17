import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Navbar } from "@/components/layout/navbar";
import { CaptureGuard } from "@/components/layout/capture-guard";
import { Footer } from "@/components/layout/footer";
import { FloatingUploadButton } from "@/components/layout/floating-upload";
import { PullToRefresh } from "@/components/layout/pull-to-refresh";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

export const metadata: Metadata = {
  metadataBase: new URL("https://nku-photo.vercel.app"),
  title: {
    default: "NKU印象 · 发现校园瞬间",
    template: "%s · NKU印象",
  },
  description: "记录与分享南开大学校园印象，探索每一个美好瞬间",
  keywords: ["南开大学", "NKU", "校园摄影", "校园印象", "照片分享"],
  authors: [{ name: "NKU印象" }],
  icons: {
    icon: [
      { url: "/nku-logo.png", type: "image/png", sizes: "512x512" },
      { url: "/nku-logo.png", type: "image/png", sizes: "192x192" },
      { url: "/nku-logo.png", type: "image/png", sizes: "32x32" },
    ],
    shortcut: "/nku-logo.png",
    apple: { url: "/nku-logo.png", type: "image/png", sizes: "180x180" },
  },
  openGraph: {
    type: "website",
    locale: "zh_CN",
    siteName: "NKU印象",
    title: "NKU印象 · 发现校园瞬间",
    description: "记录与分享南开大学校园印象，探索每一个美好瞬间",
    images: [{ url: "/nku-logo.png", width: 512, height: 512, alt: "NKU印象" }],
  },
  twitter: {
    card: "summary",
    title: "NKU印象 · 发现校园瞬间",
    description: "记录与分享南开大学校园印象",
    images: ["/nku-logo.png"],
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#111111" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans bg-white text-gray-900">
        <TooltipProvider>
          <CaptureGuard />
          <PullToRefresh />
          <Navbar />
          <main className="flex-1">{children}</main>
          <Footer />
          <FloatingUploadButton />
          <Toaster position="top-center" />
        </TooltipProvider>
      </body>
    </html>
  );
}
