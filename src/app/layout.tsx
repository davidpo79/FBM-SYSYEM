import type { Metadata } from "next";
import Script from "next/script";
import { Suspense } from "react";
import { ToastProvider } from "@/components/Toast";
import FacebookPixel from "@/components/FacebookPixel";
import { FB_PIXEL_ID } from "@/lib/fbpixel";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://fbm-studio.com"),
  title: {
    default: "FBM Studio — AI Startup Go-To-Market Platform",
    template: "%s | FBM Studio",
  },
  description: "Generate AI startup ideas, build go-to-market strategies, and launch with paying customers. The all-in-one GTM platform for AI founders.",
  openGraph: {
    title: "FBM Studio — AI Startup Go-To-Market Platform",
    description:
      "Generate AI startup ideas, build go-to-market strategies, and launch with paying customers.",
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
    siteName: "FBM Studio",
    type: "website",
    locale: "he_IL",
  },
  twitter: {
    card: "summary_large_image",
    title: "FBM Studio — AI Startup Go-To-Market Platform",
    description: "Generate AI startup ideas, build GTM strategies, and launch with paying customers.",
    images: ["/og-image.png"],
  },
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "32x32" },
    ],
    apple: "/logo-fbm.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="he" dir="rtl">
      <head>
        {/* PWA Configuration */}
        <link rel="manifest" href="/manifest.json" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="FBM Studio" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta name="theme-color" content="#D4A843" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />

        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Rubik:ital,wght@0,400;0,600;0,700;0,800;1,400;1,600;1,700;1,800&family=Heebo:wght@400;600;700;800&family=Assistant:wght@400;600;700;800&family=Varela+Round&family=David+Libre:wght@400;700&family=Frank+Ruhl+Libre:wght@400;700&family=Noto+Sans+Hebrew:wght@400;600;700;800&family=Secular+One&family=Alef:wght@400;700&family=Karantina:wght@400;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">
        {/* Meta Pixel — beforeInteractive ensures pixel loads before hydration */}
        <Script id="fb-pixel-base" strategy="beforeInteractive">
          {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${FB_PIXEL_ID}');fbq('track','PageView');`}
        </Script>
        <noscript>
          <img
            height="1"
            width="1"
            style={{ display: "none" }}
            src={`https://www.facebook.com/tr?id=${FB_PIXEL_ID}&ev=PageView&noscript=1`}
            alt=""
          />
        </noscript>
        <Suspense fallback={null}>
          <FacebookPixel />
        </Suspense>
        <ToastProvider>
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}
