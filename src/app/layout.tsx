import type { Metadata } from "next";
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
    icon: "/logo-fbm.png",
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
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
