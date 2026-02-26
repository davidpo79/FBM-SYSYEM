import type { Metadata } from "next";
import { ToastProvider } from "@/components/Toast";
import "./globals.css";

export const metadata: Metadata = {
  title: "FBM Studio",
  description: "שיווק מבוסס תדר — Frequency Based Marketing",
  openGraph: {
    title: "FBM Studio",
    description:
      "מערכת שיווק מבוסס תדר — בניית אסטרטגיה, תסריטים וקריאייטיבים",
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
    siteName: "FBM Studio",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "FBM Studio",
    description: "מערכת שיווק מבוסס תדר",
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
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Rubik:ital,wght@0,400;0,600;0,700;0,800;1,400;1,600;1,700;1,800&family=Heebo:wght@400;600;700;800&family=Assistant:wght@400;600;700;800&family=Varela+Round&family=David+Libre:wght@400;700&family=Frank+Ruhl+Libre:wght@400;700&family=Noto+Sans+Hebrew:wght@400;600;700;800&family=Secular+One&family=Alef:wght@400;700&family=Karantina:wght@400;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">
        <ToastProvider>
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}
