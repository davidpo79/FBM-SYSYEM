import { NextRequest, NextResponse } from "next/server";
import { generateImage } from "@/lib/gemini";
import { supabase } from "@/lib/supabase";
import { logApiCall } from "@/lib/api-log";
import type { CreativeConfig, CreativeResponse } from "@/types";

const backgroundDescriptions: Record<string, string> = {
  lighthouse:
    "dramatic cinematic photograph of a glowing lighthouse beacon cutting through storm clouds at dusk, with modern illuminated suspension bridge in background",
  mountain:
    "majestic mountain peak at golden hour sunrise, person standing triumphantly at summit, inspirational atmosphere",
  path: "illuminated winding path through mountains at dusk, journey and progress metaphor, cinematic lighting",
  office:
    "modern minimalist office interior with large windows, professional atmosphere, clean and bright",
  city:
    "cinematic night city skyline with glowing skyscrapers, urban energy, neon reflections on wet streets, professional metropolitan atmosphere",
  sunset:
    "dramatic golden hour sunset over calm ocean, warm orange and pink sky with silhouetted horizon, peaceful yet powerful atmosphere",
  forest:
    "mystical deep forest with sunlight streaming through tall trees, lush green canopy, peaceful natural atmosphere with depth and mystery",
  studio:
    "professional dark photography studio with dramatic rim lighting, sleek modern setup, premium and polished atmosphere",
};

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  try {
    const body = await req.json();
    const { background, format } = body as CreativeConfig;
    const designVision: string | undefined = body.designVision;

    if (!background) {
      return NextResponse.json(
        { error: "Missing required field: background" },
        { status: 400 },
      );
    }

    const bgDescription =
      backgroundDescriptions[background] || backgroundDescriptions.lighthouse;
    const fmt = format || "story";
    const dimensions = fmt === "story" ? "1080x1920px (9:16 story)" : "1080x1080px (1:1 square)";

    const visionSection = designVision
      ? `\nUSER'S CREATIVE VISION (HIGHEST PRIORITY):\nThe user described their vision: "${designVision}"\nAdapt the background scene to match this description as closely as possible.\n`
      : "";

    const prompt = `Create a professional background image for a social media ad (${dimensions}).
${visionSection}
BACKGROUND SCENE: ${designVision ? `Inspired by: ${bgDescription}` : bgDescription}. Professional cinematic lighting, high quality, photorealistic. Moody atmospheric feel with depth of field.

CRITICAL RULES:
- DO NOT include ANY text, letters, words, headlines, or typography
- DO NOT include ANY buttons, CTAs, or UI elements
- DO NOT include ANY logos or watermarks
- DO NOT include ANY person or profile photo
- ONLY the background scene — clean, empty, ready for text overlay
- Leave space for text: darker/blurred areas at top and bottom thirds
- The image should have a natural vignette or gradient that makes text readable
- Ultra high quality, photorealistic, dramatic cinematic lighting
- Deep rich colors with professional color grading

This is ONLY a background. Text will be added separately as an overlay.`;

    // Gemini generates the background image (no text!)
    const { base64: rawBase64, mimeType } = await generateImage(prompt);

    const imageBase64 = rawBase64;

    // Save to Supabase Storage
    const fileName = `creative-${Date.now()}.png`;

    const { error: uploadError } = await supabase.storage
      .from("creatives")
      .upload(fileName, Buffer.from(imageBase64, "base64"), {
        contentType: mimeType || "image/png",
        upsert: false,
      });

    if (uploadError) {
      console.error("Supabase upload error:", uploadError);
      // Fallback: return base64 directly
      const response: CreativeResponse = {
        success: true,
        imageUrl: "",
        imageBase64: `data:${mimeType};base64,${imageBase64}`,
        metadata: {
          main_text: "",
          cta: "",
          background_type: background,
        },
      };

      logApiCall({
        endpoint: "/api/generate-creatives",
        projectId: body.projectId,
        status: "success",
        durationMs: Date.now() - startTime,
      });

      return NextResponse.json(response);
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("creatives").getPublicUrl(fileName);

    const response: CreativeResponse = {
      success: true,
      imageUrl: publicUrl,
      metadata: {
        main_text: "",
        cta: "",
        background_type: background,
      },
    };

    logApiCall({
      endpoint: "/api/generate-creatives",
      projectId: body.projectId,
      status: "success",
      durationMs: Date.now() - startTime,
    });

    return NextResponse.json(response);
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error("generate-creatives error:", errMsg, error);

    logApiCall({
      endpoint: "/api/generate-creatives",
      status: "error",
      errorMessage: error instanceof Error ? error.message : "Unknown error",
      durationMs: Date.now() - startTime,
    });

    return NextResponse.json(
      { error: `Failed to generate creative: ${errMsg}` },
      { status: 500 },
    );
  }
}
