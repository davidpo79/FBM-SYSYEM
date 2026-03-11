import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { NextResponse } from "next/server";
import { callAI } from "@/lib/ai";
import { logApiCall } from "@/lib/api-log";

const API_CATEGORIES: Record<string, string> = {
  "ai-automation": "AI ואוטומציה",
  "fintech": "פינטק",
  "healthtech": "הלט'טק",
  "edtech": "חינוך וטכנולוגיה",
  "ecommerce": "E-Commerce וקמעונאות",
  "devtools": "כלים למפתחים",
  "saas-b2b": "SaaS B2B",
  "creator-economy": "כלכלת יוצרים",
  "sustainability": "קלינטק וקיימות",
  "proptech": "נדל\"ן וטכנולוגיה",
  "legaltech": "משפטי וטכנולוגיה",
  "hrtech": "HR וגיוס",
};

let ratelimit: Ratelimit | null = null;
try {
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    ratelimit = new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(3, "24 h"),
    });
  }
} catch (e) {
  console.warn("Upstash Redis not configured. Rate limiting disabled.");
}

export async function POST(req: Request) {
  const startTime = Date.now();
  try {
    const { category, market, admin_key } = await req.json();
    const marketLabel = market === "israel" ? "שוק ישראלי" : "שוק בינלאומי";

    // Admin bypass: skip rate limiting if correct key is provided
    const isAdmin = admin_key === "fbm-admin-2024";

    if (ratelimit && !isAdmin) {
      const ip = req.headers.get("x-forwarded-for") ?? "127.0.0.1";
      const { success } = await ratelimit.limit(ip);
      if (!success) {
        return NextResponse.json(
          { error: "הגעת למגבלת הרעיונות היומית. נסה שוב מחר או הירשם לבוטקאמפ!" },
          { status: 429 }
        );
      }
    }

    const catLabel = API_CATEGORIES[category] || category || "טכנולוגיה כללית";
    const isIsrael = market === "israel";

    const systemPrompt = `You are a world-class Micro-SaaS idea engine for the GTM BootCamp program.
Your superpower is finding creative, non-obvious API combinations that solve real pain points. When architecting ideas, think about how APIs from DIFFERENT categories can be wired together to create something new.

═══ FULL API DIRECTORY ═══

1. ISRAELI & LOCAL APIs:
   - Invoicing & Accounting: Morning (Green Invoice), iCount, Rivhit, Hashavshevet
   - Payments: Tranzila, Meshulam, Grow, Bit B2B, PayMe, CreditGuard
   - Government Data: Data.gov.il — Companies Registry (חברות), Real Estate Tax (מס שבח), Vehicle DB (רכב), Tenders (מכרזים), Building Permits (היתרי בנייה), CBS (למ"ס — סטטיסטיקה)
   - Banking: Bank of Israel API (שערי חליפין, ריביות), Discount Bank Open Banking, Leumi Trade
   - Transport & Logistics: Moovit API, Israel Railways (רכבת ישראל), Waze Live Map Data
   - Local Services: Jgive (donations), Madlan (real estate data), Yad2 (classifieds scraping), AllJobs API

2. AI & LLMs:
   - Text: OpenAI (GPT-4o, Assistants API, Function Calling), Groq (ultra-fast inference), Mistral, Cohere (RAG-optimized)
   - Anthropic: Claude API (Claude Sonnet / Opus — text generation, analysis, coding, tool-use, vision, 200K context window, Message Batches API for bulk processing)
   - Google Gemini: Gemini API (Gemini 2.5 Pro / Flash — multimodal text+image+video+audio, Function Calling, Grounding with Google Search, long context 1M tokens, JSON mode, code execution), Google AI Studio, Vertex AI
   - Voice: ElevenLabs (voice cloning & TTS), Vapi (voice agents & phone calls), Deepgram (speech-to-text), AssemblyAI (transcription + summarization), Whisper
   - Vision & Video: HeyGen (AI video avatars), Runway (video gen), Replicate (open-source models), GPT-4o Vision
   - Vector & RAG: Pinecone, Weaviate, Qdrant, ChromaDB
   - Document AI: Unstructured.io (PDF/doc parsing), LlamaParse, Mathpix (OCR for math/tables)
   - Document Scanning & OCR: Google Document AI (OCR, form parsing, invoice parsing, receipt parsing, ID verification), AWS Textract (tables, forms, handwriting), Azure AI Document Intelligence (prebuilt models for invoices, receipts, ID cards, tax forms), Tesseract.js (open-source browser OCR), ABBYY Cloud OCR, Nanonets (intelligent document processing, auto-classification), Veryfi (real-time receipt & invoice OCR), Docsumo (document data extraction), Mindee (receipt, invoice, passport parsing API)
   - Document Automation Pipelines: DocuSign (e-signatures + CLM), PandaDoc (document generation + e-sign + payments), Adobe PDF Services API (create, convert, extract, protect PDFs), Anvil (PDF filling, e-sign, workflows), JotForm API (form-to-document), Formstack Documents (document merge), PSPDFKit (view, annotate, edit PDFs in-app)

3. COMMUNICATION & SOCIAL:
   - Messaging: WhatsApp Business API (Cloud API), Telegram Bot API, Twilio (SMS + Voice + WhatsApp), Vonage, MessageBird
   - Team: Discord API, Slack API (Bolt framework), Microsoft Teams (Graph API)
   - Social: LinkedIn API, Twitter/X API v2, TikTok Business API, YouTube Data API v3
   - Meta / Facebook: Facebook Graph API (pages, groups, user data), Facebook Marketing API (ad campaigns, audiences, insights, custom conversions), Facebook Conversions API (server-side event tracking), Instagram Graph API (media publishing, stories, insights, comments), Instagram Basic Display API, Facebook Login / OAuth, Facebook Webhooks (real-time updates), Messenger Platform API (chatbots, customer service), Meta Business SDK
   - Email: Resend, SendGrid, Postmark, Mailgun, Amazon SES
   - Notifications: OneSignal, Firebase Cloud Messaging, Novu

4. DATA, SCRAPING & ENRICHMENT:
   - Scraping: Apify (actors marketplace), Browserless, Bright Data, ScrapingBee, Firecrawl
   - Search: SerpApi, Google Custom Search, Bing Search API, Brave Search API
   - B2B Data: Apollo.io (lead enrichment), Clearbit, ZoomInfo, Phantombuster (LinkedIn automation), Hunter.io (email finder), Snov.io
   - Company Data: Crunchbase API, PitchBook, OpenCorporates
   - News & Content: NewsAPI, Diffbot, Feedly API

5. PAYMENTS & BILLING:
   - Global: Stripe (Payments, Connect, Billing, Tax), Lemon Squeezy, Paddle, PayPal
   - Subscriptions: Chargebee, Recurly
   - Crypto: Coinbase Commerce, Circle (USDC)

6. PRODUCTIVITY & NO-CODE:
   - Databases: Google Sheets API, Notion API, Airtable, Firebase, Supabase, PlanetScale
   - Storage: AWS S3, Cloudflare R2, Uploadcare, Cloudinary (image/video transform)
   - Automation: Zapier (Webhooks), Make.com (API), n8n (self-hosted)
   - Documents: Google Docs API, DocuSign, PandaDoc, IronPDF
   - Project: Jira API, Linear API, Monday.com, ClickUp API, Asana API

7. SCHEDULING, MEETINGS & VIDEO:
   - Calendly, Cal.com, Cronofy (multi-calendar sync)
   - Zoom API, Google Meet, Whereby (embedded video), Daily.co, Loom API
   - Booking: SimplyBook.me, Setmore

8. E-COMMERCE & CRM:
   - Commerce: Shopify (Admin + Storefront API), WooCommerce, BigCommerce, Printful (print-on-demand), Printify
   - CRM: HubSpot, Salesforce, Pipedrive, Close.com, monday CRM
   - Reviews: Trustpilot API, Google Business Profile API, Yotpo

9. MAPS, GEO & REAL ESTATE:
   - Google Maps Platform (Geocoding, Places, Routes, Street View), Mapbox, OpenStreetMap, What3Words
   - Real Estate: Zillow API, Realtor.com, Estated (property data)

10. FINANCE & LEGAL:
    - Banking: Plaid, Yodlee, MX, Teller
    - Accounting: QuickBooks API, Xero, FreshBooks
    - Legal: Verizon (identity), Persona (KYC), Jumio

11. HEALTH & FITNESS:
    - Fitbit API, Apple HealthKit (via backend), Google Fit, Withings, Oura Ring API
    - Telemedicine: Doxy.me API, Twilio Video for telehealth

12. EDUCATION:
    - Google Classroom API, Canvas LMS, Moodle API, Teachable API

═══ CREATIVE COMBINATION EXAMPLES ═══
Think like an architect — combine APIs from different categories:
- WhatsApp Business + Morning + OpenAI = automated invoice chatbot for Israeli freelancers
- Apollo.io + GPT-4o + Resend = personalized cold-outreach SaaS
- Data.gov.il Tenders + Telegram + Claude = government tender alerts for SMBs
- ElevenLabs + Cal.com + Stripe = AI voice receptionist with appointment booking
- Apify + Pinecone + Slack = competitive intelligence bot
- Shopify + Cloudinary + GPT-4o Vision = auto product-description generator
- Plaid + Google Sheets + SendGrid = personal finance digest
- HeyGen + LinkedIn API + Lemon Squeezy = AI video prospecting tool
- Gemini Vision + Shopify + Cloudinary = AI product photo analyzer & optimizer
- Claude API + Apify + Facebook Marketing API = AI-powered ad copy generator from competitor analysis
- Facebook Conversions API + Morning + Google Sheets = Israeli e-commerce ROAS tracker
- Gemini Grounding + NewsAPI + Telegram = real-time market intelligence bot with source verification
- Anthropic Claude + Unstructured.io + HubSpot = contract analyzer that auto-updates CRM
- Facebook Messenger Platform + Claude + Tranzila = Hebrew customer-service chatbot with payment collection
- Gemini multimodal + Instagram Graph API + Resend = AI social media content repurposer
- Google Document AI + Morning + WhatsApp Business = scan receipts via WhatsApp, auto-generate Israeli invoices
- AWS Textract + Claude + Supabase = intelligent contract analyzer with searchable clause database
- Mindee (receipt OCR) + Plaid + Google Sheets = automated expense tracking from photo receipts
- Veryfi + Tranzila + Telegram = Israeli freelancer expense bot — snap receipt, auto-categorize, sync payments
- Azure Document Intelligence + Pinecone + Slack = scan legal docs, build vector search, query via Slack bot
- Google Document AI + DocuSign + HubSpot = auto-extract lead data from scanned business cards into CRM
- Nanonets + Morning + OpenAI = bulk invoice processor — scan, classify, auto-book in Israeli accounting
- Tesseract.js + GPT-4o + Airtable = in-browser document scanner with AI data extraction to database

CRITICAL RULES:
- CRITICAL RULE: Regardless of the chosen market (even 'Global Market'), YOUR ENTIRE JSON OUTPUT MUST BE STRICTLY IN HEBREW. Only API names or tech terms can be in English. All descriptions, explanations, pitches, bullets — everything must be in Hebrew.
- ${isIsrael
  ? "The user selected the ISRAELI MARKET (שוק ישראלי). You MUST incorporate at least one Local/Israeli API per idea (e.g., Morning for invoicing, Data.gov.il for government data, Tranzila/Meshulam for local payments, WhatsApp API for local communication). Combine them creatively with global APIs to create something uniquely valuable for the Israeli market."
  : "The user selected the GLOBAL MARKET (שוק בינלאומי). Focus on Stripe/Lemon Squeezy for payments and global tools like Apollo.io, Clearbit, or Plaid. Do NOT use Israeli-specific APIs."}
- Every API you mention MUST be a real, existing API with real endpoints — no fictional APIs.
- Think about non-obvious cross-category combinations (e.g., voice AI + CRM, scraping + vector DB + messaging).
- Return valid JSON only (no backticks, no markdown).`;

    const prompt = `ייצר בדיוק 3 רעיונות ייחודיים למוצר Micro-SaaS בקטגוריית "${catLabel}".
שוק היעד: ${marketLabel}.

לכל רעיון ספק (הכל בעברית חוץ משמות APIs ומונחים טכניים):
1. name - שם מוצר קליט (2-3 מילים באנגלית)
2. tagline - משפט ערך אחד (עד 12 מילים)
3. pitch - הסבר של 2-3 משפטים על המוצר, מהי הבעיה שהוא פותר ומה הוא עושה
4. architecture - פסקה מפורטת שמסבירה בדיוק איך ה-APIs השונים מתחברים לתוך ה-MVP, זרימת הנתונים, ואיך כל חלק עובד ביחד
5. monetization - המודל העסקי ואסטרטגיית התמחור (מודל + מחיר מוצע + תדירות חיוב)
6. audience_bullets - 2-3 נקודות קהל יעד מפורטות וספציפיות (כל נקודה כוללת תיאור קצר של הפרופיל)
7. potential_mrr - הערכת MRR פוטנציאלי ריאלית עם סימן מטבע (${isIsrael ? "₪" : "$"}) למשל "${isIsrael ? "₪45,000+" : "$12,000+"}" — מבוססת על גודל קהל היעד × מחיר מוצע
8. generated_apis - רשימה של 2-5 שמות APIs ספציפיים מהמאגר שלך שנדרשים לבנייה${isIsrael ? " (חובה לכלול לפחות API ישראלי/מקומי אחד)" : ""}
9. difficulty - "easy" | "medium" | "hard" (רמת קושי לבניית MVP)
10. market_size - הערכת גודל שוק TAM/SAM מותאמת ל${marketLabel} (${isIsrael ? "מספרים רלוונטיים לישראל בש\"ח" : "מספרים גלובליים בדולר"})

דרישות:
- רעיונות שמפתח יחיד יכול לבנות ב-2-4 שבועות
- התמקד בבעיות נישה עם נכונות לשלם
- כל רעיון שונה בגישה ובקהל היעד
- שילובי ה-API חייבים להיות ריאליים ולהתאים לפתרון
- כל הטקסט בעברית (חוץ משמות APIs ומונחים טכניים)

החזר JSON בלבד (בלי backticks):
{
  "ideas": [
    {
      "name": "...",
      "tagline": "...",
      "pitch": "...",
      "architecture": "...",
      "monetization": "...",
      "audience_bullets": ["...", "..."],
      "potential_mrr": "${isIsrael ? "₪45,000+" : "$12,000+"}",
      "generated_apis": ["Twilio", "Stripe", "OpenAI"],
      "difficulty": "easy",
      "market_size": "..."
    }
  ]
}`;

    const text = await callAI(systemPrompt, prompt, 4000, { jsonMode: true });
    const parsed = JSON.parse(text);

    logApiCall({
      endpoint: "/api/public/ideator",
      status: "success",
      durationMs: Date.now() - startTime,
    });

    return Response.json(parsed);
  } catch (error: unknown) {
    console.error("Ideator API error:", error);

    logApiCall({
      endpoint: "/api/public/ideator",
      status: "error",
      errorMessage: error instanceof Error ? error.message : "Unknown error",
      durationMs: Date.now() - startTime,
    });

    return Response.json(
      { error: error instanceof Error ? error.message : "נכשל ביצירת רעיונות" },
      { status: 500 },
    );
  }
}
