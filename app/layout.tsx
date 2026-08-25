import type { Metadata, Viewport } from "next";
import { Outfit, Noto_Sans_SC } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import MusicPlayer from "@/components/music-player";
import CatPet from "@/components/cat-pet";
import { siteConfig } from "@/lib/site";
import { getSessionUser, getSpringToken, unreadNotificationCount } from "@/lib/server-session";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  display: "swap",
});

const notoSans = Noto_Sans_SC({
  variable: "--font-noto",
  subsets: ["latin"],
  weight: ["400", "500", "700", "900"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "uswrite · 一个安静的文字社区",
    template: "%s · uswrite",
  },
  description: siteConfig.description,
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#fafaf9",
};

const themeScript = `
try {
  var t = localStorage.getItem("theme");
  if (t === "dark" || (!t && window.matchMedia("(prefers-color-scheme: dark)").matches)) {
    document.documentElement.classList.add("dark");
  }
} catch (e) {}
`;

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getSessionUser();
  const token = await getSpringToken();
  const unread = user ? await unreadNotificationCount(token) : 0;

  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body
        className={`${outfit.variable} ${notoSans.variable} antialiased min-h-[100dvh] flex flex-col`}
      >
        <Header user={user} unread={unread} />
        <main className="flex-1">{children}</main>
        <Footer />
        <MusicPlayer />
        <CatPet />
      </body>
    </html>
  );
}
