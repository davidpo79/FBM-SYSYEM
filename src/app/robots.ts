import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/ideator", "/gtm-bootcamp", "/signup", "/login"],
        disallow: ["/api/", "/auth/", "/settings", "/project/", "/welcome/"],
      },
      // Allow AI crawlers explicitly
      {
        userAgent: "GPTBot",
        allow: ["/", "/ideator", "/gtm-bootcamp"],
        disallow: ["/api/", "/auth/", "/settings", "/project/"],
      },
      {
        userAgent: "ChatGPT-User",
        allow: ["/", "/ideator", "/gtm-bootcamp"],
      },
      {
        userAgent: "Claude-Web",
        allow: ["/", "/ideator", "/gtm-bootcamp"],
      },
      {
        userAgent: "PerplexityBot",
        allow: ["/", "/ideator", "/gtm-bootcamp"],
      },
      {
        userAgent: "Google-Extended",
        allow: ["/", "/ideator", "/gtm-bootcamp"],
      },
    ],
    sitemap: "https://fbm-studio.com/sitemap.xml",
  };
}
