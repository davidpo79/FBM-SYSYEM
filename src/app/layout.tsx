import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FBM Studio",
  description: "Frequency-Based Marketing Strategy Builder",
  icons: {
    icon: "/favicon.svg",
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
