import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ברוך הבא ל-FBM Studio",
  description: "הצטרף לתהליך שיווק מבוסס תדר — קבע פגישה והתחל",
  openGraph: {
    title: "ברוך הבא ל-FBM Studio",
    description: "הצטרף לתהליך שיווק מבוסס תדר",
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
  },
};

export default function WelcomeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
