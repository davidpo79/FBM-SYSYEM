import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "GTM Bootcamp — Go-To-Market Strategy for AI Startups",
  description:
    "Launch your AI startup with a proven go-to-market framework. Get a personalized GTM strategy, ICP analysis, marketing channels, and ad creatives — built for AI founders who want paying customers, not just users.",
  keywords: [
    "GTM bootcamp",
    "go-to-market strategy AI startup",
    "AI startup launch",
    "GTM framework",
    "AI founder bootcamp",
    "startup marketing strategy",
    "ICP analysis AI",
    "AI SaaS go-to-market",
    "startup go-to-market plan",
    "how to launch AI startup",
    "AI product market fit",
    "בוטקאמפ GTM",
    "אסטרטגיית שיווק סטארטאפ",
    "השקת סטארטאפ בינה מלאכותית",
  ],
  openGraph: {
    title: "GTM Bootcamp — Go-To-Market Strategy for AI Startups",
    description:
      "Launch your AI startup with a proven GTM framework. Personalized strategy, ICP analysis, marketing channels, and ad creatives.",
    type: "website",
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "GTM Bootcamp — Go-To-Market Strategy for AI Startups",
    description:
      "Launch your AI startup with a proven GTM framework. Built for AI founders.",
  },
  alternates: {
    canonical: "/gtm-bootcamp",
  },
};

export default function GTMBootcampLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Course",
    name: "GTM Bootcamp — Go-To-Market for AI Startups",
    description:
      "A structured go-to-market bootcamp for AI startup founders. Learn how to identify your ICP, build a marketing strategy, create ad creatives, and acquire paying customers.",
    url: "https://fbm-studio.com/gtm-bootcamp",
    provider: {
      "@type": "Organization",
      name: "FBM Studio",
      url: "https://fbm-studio.com",
    },
    educationalLevel: "Intermediate",
    audience: {
      "@type": "Audience",
      audienceType: "AI Startup Founders",
    },
    inLanguage: ["he", "en"],
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "ILS",
      description: "Free 15-minute diagnostic call",
    },
    hasCourseInstance: {
      "@type": "CourseInstance",
      courseMode: "Online",
      courseSchedule: {
        "@type": "Schedule",
        repeatFrequency: "P1W",
      },
    },
  };

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "What is a Go-To-Market strategy for an AI startup?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "A Go-To-Market (GTM) strategy for an AI startup is a step-by-step plan that defines your Ideal Customer Profile (ICP), positions your AI product in the market, selects the right marketing channels, and creates a repeatable process for acquiring paying customers. Unlike traditional startups, AI GTM strategies must address trust, explainability, and integration complexity.",
        },
      },
      {
        "@type": "Question",
        name: "How do I find my first paying customers for my AI product?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Start by identifying your Ideal Customer Profile (ICP) — who has the pain your AI solves, the budget to pay, and the technical ability to adopt. Then validate with 15-minute diagnostic calls, build a landing page with a clear value proposition, and use targeted ads or community outreach to drive qualified leads.",
        },
      },
      {
        "@type": "Question",
        name: "What is the FBM Ideator tool?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "FBM Ideator is a free AI startup idea generator that helps founders discover validated business concepts. You pick a niche and market, and the tool generates complete startup ideas with target audience analysis, API integrations, and go-to-market strategy — all powered by AI.",
        },
      },
      {
        "@type": "Question",
        name: "How long does it take to build a GTM strategy for an AI startup?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "With the FBM Studio GTM Bootcamp, you can have a complete go-to-market strategy in under a week. The platform uses AI to analyze your product, identify your ICP, suggest marketing channels, and generate ad creatives. The 15-minute diagnostic call helps refine and validate your approach.",
        },
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      {children}
    </>
  );
}
