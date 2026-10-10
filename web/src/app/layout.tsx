import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import "./globals.css";
import { StoreProvider, ToastProvider } from "@/lib/store";
import { GlobalNew } from "@/components/global-new";

export const metadata: Metadata = {
  title: "RUTINA - Jadwal Pribadi dan Bersama",
  description: "Jadwal pribadi dan bersama, rapi di satu tempat. Kalender grup BEM FT, Kelompok 10 MPTI, dan UKM Futsal.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "RUTINA" },
};

export const viewport: Viewport = {
  themeColor: "#073693",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: LayoutProps<"/">) {
  return (
    <html lang="id">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700&display=swap"
        />
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body>
        <StoreProvider>
          <ToastProvider>
            <div className="x-app">
              {children}
              <Suspense fallback={null}>
                <GlobalNew />
              </Suspense>
            </div>
          </ToastProvider>
        </StoreProvider>
      </body>
    </html>
  );
}
