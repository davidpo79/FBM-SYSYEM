import { NextRequest, NextResponse } from "next/server";
import { generateImage } from "@/lib/gemini";
import { supabase } from "@/lib/supabase";
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
  try {
    const body = await req.json();
    const { mainText, subtitle, cta, background, color, userInfo, showProfile, profileImage, displayName, displayRole, fontSize, textPosition, format } =
      body as CreativeConfig;
    const designVision: string | undefined = body.designVision;

    if (!mainText || !cta || !background || !color) {
      return NextResponse.json(
        { error: "Missing required fields: mainText, cta, background, color" },
        { status: 400 },
      );
    }

    if (!userInfo?.name) {
      return NextResponse.json(
        { error: "Missing userInfo (name required)" },
        { status: 400 },
      );
    }

    const colorHex = color === "gold" ? "#FFD700" : "#00A3E0";
    const bgDescription =
      backgroundDescriptions[background] || backgroundDescriptions.lighthouse;
    const hasProfileImage = !!profileImage;
    const finalName = displayName || userInfo.name;
    const finalRole = displayRole || userInfo.role;
    const includeProfile = showProfile !== false;
    const fs = fontSize || "medium";
    const tp = textPosition || "top";
    const fmt = format || "story";
    const dimensions = fmt === "story" ? "1080×1920px (9:16 story format)" : "1080×1080px (1:1 square format)";

    const subtitleSection = subtitle
      ? `- Below the headline, smaller subtitle text: "${subtitle}" in white/light color, slightly smaller font`
      : "";

    const visionSection = designVision
      ? `
**USER'S CREATIVE VISION (HIGHEST PRIORITY):**
The user described their vision for this image: "${designVision}"
You MUST prioritize this vision above all other instructions. Adapt the background, atmosphere, composition and style to match this description as closely as possible while keeping the text elements and layout rules.

`
      : "";

    // Profile section: ALWAYS use a plain circular silhouette placeholder, NEVER a real human face
    const profileSection = includeProfile
      ? `
VERY BOTTOM of the image - PERSON INFO BAR:
- A simple flat circular silhouette icon (generic person outline, NOT a real photo, NOT a real face) with a ${color} border ring (3px, ${colorHex})
- Next to the circle: Name "${finalName}" in white bold text, and below it "${finalRole}" in white smaller text
- This section should be centered horizontally
- CRITICAL: Do NOT draw a real human face or photo — use ONLY a flat geometric silhouette placeholder icon
`
      : "";

    const prompt = `
Create a premium, cinematic social media ad image (${dimensions}).
${visionSection}
STYLE REFERENCE: High-end Israeli digital marketing ad. Think dramatic cinematic photography, professional color grading, deep contrast, moody atmospheric lighting. The image should look like a premium paid ad on Facebook/Instagram — polished, bold, and visually striking.

BACKGROUND: ${designVision ? `Inspired by the user's vision above, incorporating: ${bgDescription}` : bgDescription}.
- Ultra high quality, photorealistic, dramatic cinematic lighting
- Deep rich colors with professional color grading
- Subtle dark vignette around edges for depth
- Background should be slightly blurred/bokeh to keep text sharp and readable

LAYOUT (Hebrew RTL direction, all text CENTERED horizontally):

${tp === "top" ? "TOP AREA (upper 40%)" : tp === "center" ? "CENTER AREA (vertically centered)" : "LOWER AREA (bottom third)"}:
- Large bold Hebrew headline: "${mainText}"
- Color: ${color} (${colorHex}) with subtle glow/shadow effect
- Font: Bold, modern, clean Hebrew font (like Heebo or Assistant bold)
- Dark semi-transparent rounded rectangle behind the text for readability
- Text must be horizontally CENTERED
${subtitleSection}
${fs !== "medium" ? `- Text size: ${fs === "large" ? "Extra large, dominant" : "Slightly smaller than default"}` : ""}

LOWER AREA (above person info):
- ${color === "gold" ? "Golden" : "Teal"} rounded-pill CTA button (${colorHex}), centered horizontally
- Button text: "${cta}" in ${color === "gold" ? "black" : "white"} bold
- Button should have subtle shadow for depth
${profileSection}
CRITICAL RULES:
- All text, buttons, and info must be horizontally CENTERED
- The vertical order from top to bottom is: headline text → subtitle → CTA button${includeProfile ? " → person silhouette + name" : ""}
- Do NOT generate or draw any real human face, real photo, or realistic person portrait anywhere in the image
${includeProfile ? "- For the person section use ONLY a simple flat circular silhouette icon (geometric placeholder), NEVER a realistic face\n" : "- Do NOT include any person photo, name, or profile section\n"}- Do NOT add any extra text, descriptions, or niche definitions beyond what is specified
- Do NOT add text explaining who the target audience is
- Keep it clean and professional like a high-end paid social media ad
- Hebrew text direction: Right-to-Left
- Clean premium ad layout with cinematic feel
`;

    // Gemini generates the image
    const { base64: imageBase64, mimeType } = await generateImage(prompt);

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
          main_text: mainText,
          cta,
          background_type: background,
        },
      };
      return NextResponse.json(response);
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("creatives").getPublicUrl(fileName);

    const response: CreativeResponse = {
      success: true,
      imageUrl: publicUrl,
      metadata: {
        main_text: mainText,
        cta,
        background_type: background,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error("generate-creatives error:", errMsg, error);
    return NextResponse.json(
      { error: `Failed to generate creative: ${errMsg}` },
      { status: 500 },
    );
  }
}
