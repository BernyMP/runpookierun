import type { ReactNode } from "react";
import type { Metadata, Viewport } from "next";
import config from "@/config";
import { AdMeasurement } from "@/components/pookie/ad-measurement";
import { Acquisition } from "@/components/pookie/acquisition";
import { PublicAnalytics } from "@/components/pookie/public-analytics";
import "./globals.css";
export const metadata: Metadata = {
  metadataBase: new URL("https://runpookierun.com"),
  title: {
    default: "Run Pookie Run — Get back into running",
    template: "%s | Run Pookie Run",
  },
  description: config.appDescription,
  verification: {
    google:
      process.env.GOOGLE_SITE_VERIFICATION ||
      "2rr7ien1ygH5vuXB44-Khin57DXCpbHRF1Yj9cpTpeo",
    other: {
      "msvalidate.01":
        process.env.BING_SITE_VERIFICATION ||
        "1C84DEECED6427B64EA0138975122761",
    },
  },
  icons: { icon: "/favicon.svg" },
  openGraph: {
    title: config.appName,
    description: config.appDescription,
    type: "website",
  },
};
export const viewport: Viewport = {
  themeColor: "#fff8e6",
  width: "device-width",
  initialScale: 1,
};
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link
          rel="preload"
          href="/fonts/Fraunces-latin.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
      </head>
      <body>
        <Acquisition />
        <PublicAnalytics />
        <AdMeasurement />
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:p-3"
        >
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
