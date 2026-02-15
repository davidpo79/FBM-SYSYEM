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
    const imagePrompt: string | undefined = body.imagePrompt;

    if (!background) {
      return NextResponse.json(
        { error: "Missing required field: background" },
        { status: 400 },
      );
    }

    const fmt = format || "story";
    const dimensions = fmt === "story"
      ? "VERTICAL PORTRAIT 1080x1920px - MUST be taller than wide (9:16 phone/story format)"
      : "PERFECT SQUARE 1080x1080px - width must equal height exactly (1:1 feed format)";

    // Use AI-generated image_prompt if available, otherwise fall back to generic description
    const sceneDescription = imagePrompt
      || designVision
      || backgroundDescriptions[background]
      || backgroundDescriptions.lighthouse;

    const prompt = `Create a HIGH-END professional advertising image for a social media ad.

FORMAT: ${dimensions}

SCENE DESCRIPTION: ${sceneDescription}

STYLE REQUIREMENTS:
- This is a PREMIUM advertising image — the quality should match top-tier Facebook/Instagram ads
- Photorealistic, ultra high quality, 8K rendering
- Dramatic cinematic lighting with depth — use volumetric light, god rays, lens flares where appropriate
- Rich deep color grading — blacks should be deep, colors should be saturated but natural
- Create DEPTH with foreground, midground, and background elements
- Atmospheric effects: mist, rain, light particles, bokeh — add atmosphere!
- The overall mood should feel POWERFUL, ASPIRATIONAL, and PROFESSIONAL

TEXT OVERLAY ZONES — CRITICAL:
- The TOP 30% of the image should have a darker/contrasted area suitable for large white or gold HEADLINE text overlay
- The BOTTOM 20% should have a darker area suitable for a CTA button overlay
- The MIDDLE area (30%-60%) can have the main visual interest
- Do NOT include any actual text, letters, words, logos, or UI elements in the image
- But DO design the composition knowing that text will be placed on top

WHAT TO INCLUDE:
- Rich environmental details and atmosphere
- Human figures or silhouettes are ENCOURAGED (they add emotional connection)
- Symbolic elements related to the scene
- Cinematic lighting effects (rim light, backlight, volumetric rays, god rays)
- Professional color grading (warm golds, deep shadows, cinematic feel)

WHAT TO ABSOLUTELY EXCLUDE:
- Do NOT include any text, typography, letters, or words — NONE AT ALL
- Do NOT include any UI elements, buttons, or logos
- Do NOT include any watermarks
- No text means NO TEXT in any language

This should look like it was shot by a professional photographer and color graded by a Hollywood colorist.`;

    // Gemini generates the background image (no text!)
    const geminiAspectRatio = fmt === "story" ? "9:16" : "1:1";
    const { base64: rawBase64, mimeType } = await generateImage(prompt, geminiAspectRatio);

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
