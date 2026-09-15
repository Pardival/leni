import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Plus_Jakarta_Sans } from "next/font/google";
import { CategoriesProvider } from "@/components/CategoriesProvider";
import { LiveRefresh } from "@/components/LiveRefresh";
import { Nav } from "@/components/Nav";
import { NoZoom } from "@/components/NoZoom";
import { I18nProvider } from "@/i18n/client";
import { getI18n } from "@/i18n/server";
import { listCategories } from "@/lib/categories";
import "./globals.css";

const display = Bricolage_Grotesque({ variable: "--font-display", subsets: ["latin"], weight: ["600", "700"] });
const body = Plus_Jakarta_Sans({ variable: "--font-body", subsets: ["latin"], weight: ["400", "500", "600", "700"] });

export const metadata: Metadata = {
  title: { default: "Leni", template: "%s · Leni" },
  description: "Dicte, Leni range.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Leni" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f5f0" },
    { media: "(prefers-color-scheme: dark)", color: "#15130f" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  // Application, pas page web : pas de zoom par pincement ni de zoom
  // automatique à la mise au point d'un champ (voir aussi `NoZoom`).
  maximumScale: 1,
  userScalable: false,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [{ locale }, categories] = await Promise.all([getI18n(), listCategories()]);
  return (
    <html lang={locale} className={`${display.variable} ${body.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <I18nProvider locale={locale}>
          <CategoriesProvider categories={categories}>
            <Nav />
            <LiveRefresh />
            <NoZoom />
            <main className="flex-1 w-full max-w-3xl mx-auto px-5 sm:px-6 pt-4 pb-32 sm:pb-16">{children}</main>
          </CategoriesProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
