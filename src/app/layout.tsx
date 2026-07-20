import type { Metadata, Viewport } from "next";
import { Space_Grotesk, DM_Mono } from "next/font/google";
import "./globals.css";
import BottomNav from "@/components/BottomNav";
import PwaRegister from "@/components/PwaRegister";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
});

const dmMono = DM_Mono({
  variable: "--font-dm-mono",
  subsets: ["latin"],
  weight: ["300", "400", "500"],
});

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://hindsight.plus";

export const metadata: Metadata = {
  title: {
    default: "HINDSIGHT+ — 성분을 알면 선택이 달라진다",
    template: "%s | HINDSIGHT+",
  },
  description:
    "제품 바코드를 스캔해 첨가물·알러지·건강 위험을 즉시 확인하세요. AI 분석과 커뮤니티로 더 건강한 선택을.",
  metadataBase: new URL(APP_URL),
  applicationName: "HINDSIGHT+",
  keywords: ["식품 안전", "바코드 스캔", "성분 분석", "건강", "첨가물", "알러지"],
  authors: [{ name: "HINDSIGHT+" }],
  openGraph: {
    type: "website",
    locale: "ko_KR",
    url: "/",
    siteName: "HINDSIGHT+",
    title: "HINDSIGHT+ — 성분을 알면 선택이 달라진다",
    description:
      "제품 바코드를 스캔해 첨가물·알러지·건강 위험을 즉시 확인하세요.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "HINDSIGHT+ — KNOW WHAT YOU WERE NEVER TOLD",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "HINDSIGHT+",
    description: "성분을 알면 선택이 달라진다.",
    images: ["/og-image.png"],
  },
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [
      { url: "/icons/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "HINDSIGHT+",
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#0A0A0A",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className={`${spaceGrotesk.variable} ${dmMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col" style={{ background: "#F5F2EC" }}>
        {children}
        <BottomNav />
        <PwaRegister />
      </body>
    </html>
  );
}
