import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { CategoriesProvider } from "@/components/CategoriesProvider";
import { Nav } from "@/components/Nav";
import { I18nProvider } from "@/i18n/client";
import { getI18n } from "@/i18n/server";
import { listCategories } from "@/lib/categories";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "Leni", template: "%s · Leni" },
  description: "Capture. Laisse Leni ranger.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Leni" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f3ec" },
    { media: "(prefers-color-scheme: dark)", color: "#14120e" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [{ locale }, categories] = await Promise.all([getI18n(), listCategories()]);
  return (
    <html lang={locale} className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <I18nProvider locale={locale}>
          <CategoriesProvider categories={categories}>
            <Nav />
            <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 pt-4 pb-28 sm:pb-12">{children}</main>
          </CategoriesProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
