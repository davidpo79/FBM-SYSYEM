import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI Startup Idea Generator — Free Tool for Founders",
  description:
    "Generate validated AI startup ideas in seconds. Pick a niche, choose your market, and get a full business concept with target audience, APIs, and go-to-market strategy. Free for founders.",
  keywords: [
    "AI startup idea generator",
    "AI business ideas",
    "startup idea tool",
    "AI SaaS ideas",
    "go-to-market AI",
    "GTM strategy generator",
    "AI founder tools",
    "startup validation tool",
    "artificial intelligence startup",
    "מחולל רעיונות סטארטאפ",
    "רעיונות לסטארטאפ בינה מלאכותית",
  ],
  openGraph: {
    title: "AI Startup Idea Generator — Free Tool for Founders",
    description:
      "Generate validated AI startup ideas in seconds. Full business concept with audience, APIs, and GTM strategy.",
    type: "website",
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "AI Startup Idea Generator — Free Tool for Founders",
    description:
      "Generate validated AI startup ideas in seconds. Pick a niche, get a full business concept.",
  },
  alternates: {
    canonical: "/ideator",
  },
};

export default function IdeatorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "FBM Ideator — AI Startup Idea Generator",
    description:
      "Generate validated AI startup ideas with target audience, API integrations, and go-to-market strategy. Free for founders.",
    url: "https://fbm-studio.com/ideator",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    creator: {
      "@type": "Organization",
      name: "FBM Studio",
      url: "https://fbm-studio.com",
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {children}
    </>
  );
}
