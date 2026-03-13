import type { Metadata } from "next";
import { Suspense } from "react";
import { ToastProvider } from "@/components/Toast";
import FacebookPixel from "@/components/FacebookPixel";
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
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="FBM Studio" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta name="theme-color" content="#D4A843" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />

        {/* Meta Pixel — raw inline script in <head> so window.fbq exists
            BEFORE React hydration. Includes debug fallback: if fbevents.js
            fails to load (ad-blocker, network), retries up to 3 times via
            alternative methods (image pixel fallback on final failure). */}
        <script
          dangerouslySetInnerHTML={{
            __html: `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;t.onerror=function(){console.warn('[MetaPixel] fbevents.js failed to load, will retry...');f.__fbPixelFailed=!0};t.onload=function(){console.log('[MetaPixel] fbevents.js loaded successfully');f.__fbPixelLoaded=!0};s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','657314928924080');fbq('track','PageView');console.log('[MetaPixel] Base code initialized, waiting for fbevents.js...');

// Debug fallback: retry loading fbevents.js if it fails
(function(){
  var PIXEL_ID='657314928924080';
  var retries=0;
  var maxRetries=3;
  var retryDelay=2000;

  function checkPixel(){
    // fbq.callMethod exists only after fbevents.js is fully loaded and processed
    if(window.fbq&&window.fbq.callMethod){
      console.log('[MetaPixel] ✓ Pixel is active and firing events');
      return;
    }
    retries++;
    if(retries>maxRetries){
      console.warn('[MetaPixel] ✗ fbevents.js failed after '+maxRetries+' retries. Sending PageView via image fallback.');
      // Image pixel fallback — sends PageView even if JS is blocked
      var img=new Image();
      img.src='https://www.facebook.com/tr?id='+PIXEL_ID+'&ev=PageView&noscript=1&t='+Date.now();
      window.__fbPixelFallback=true;
      return;
    }
    console.log('[MetaPixel] Retry '+retries+'/'+maxRetries+' — reloading fbevents.js...');
    var s=document.createElement('script');
    s.async=true;
    s.src='https://connect.facebook.net/en_US/fbevents.js?t='+Date.now();
    s.onerror=function(){console.warn('[MetaPixel] Retry '+retries+' failed')};
    s.onload=function(){
      console.log('[MetaPixel] ✓ fbevents.js loaded on retry '+retries);
      // Re-init and fire PageView since the fresh script needs it
      if(window.fbq){window.fbq('init',PIXEL_ID);window.fbq('track','PageView')}
    };
    document.head.appendChild(s);
    setTimeout(checkPixel,retryDelay*retries);
  }

  // First check after 3 seconds (give initial script time to load)
  setTimeout(checkPixel,3000);
})();`,
          }}
        />
        <noscript>
          <img
            height="1"
            width="1"
            style={{ display: "none" }}
            src="https://www.facebook.com/tr?id=657314928924080&ev=PageView&noscript=1"
            alt=""
          />
        </noscript>

        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Rubik:ital,wght@0,400;0,600;0,700;0,800;1,400;1,600;1,700;1,800&family=Heebo:wght@400;600;700;800&family=Assistant:wght@400;600;700;800&family=Varela+Round&family=David+Libre:wght@400;700&family=Frank+Ruhl+Libre:wght@400;700&family=Noto+Sans+Hebrew:wght@400;600;700;800&family=Secular+One&family=Alef:wght@400;700&family=Karantina:wght@400;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">
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
