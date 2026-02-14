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

    const profileSection = includeProfile
      ? `
BOTTOM LEFT CORNER:
- ${hasProfileImage ? "Circular professional headshot photo of the person" : "Circular placeholder silhouette icon"} with ${color} border (4px, ${colorHex})
- Name: "${finalName}" in white bold text
- Title: "${finalRole}" in white smaller text
`
      : "";

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

    const prompt = `
Create a professional social media creative image (${dimensions}).
${visionSection}
BACKGROUND: ${designVision ? `Inspired by the user's vision above, incorporating: ${bgDescription}` : bgDescription}. Professional cinematic lighting, high quality, photorealistic.

LAYOUT (Hebrew RTL direction, all text CENTERED horizontally):

${tp === "top" ? "TOP AREA (top 40% of image)" : tp === "center" ? "CENTER AREA (vertically centered)" : "LOWER AREA (bottom third of image)"}:
- Large bold Hebrew headline text: "${mainText}"
- Color: ${color} (${colorHex})
- Font style: Bold, modern Hebrew font
- Text must be horizontally CENTERED
- Dark semi-transparent overlay behind text for readability
${subtitleSection}
${fs !== "medium" ? `- Text size: ${fs === "large" ? "Extra large, dominant" : "Slightly smaller than default"}` : ""}
${profileSection}
BOTTOM CENTER:
- ${color === "gold" ? "Golden" : "Teal"} rounded CTA button (${colorHex}), centered horizontally
- Button text: "${cta}" in ${color === "gold" ? "black" : "white"} bold

CRITICAL RULES:
- All text and buttons must be horizontally CENTERED
- The image must contain ONLY the main headline text${subtitle ? ", subtitle" : ""}${includeProfile ? ", person info" : ""}, and CTA button
- Do NOT add any additional text, descriptions, or niche definitions beyond what is specified
- Do NOT add text explaining who the target audience is
- Keep it clean and professional like a high-end social media ad
- Hebrew text direction: Right-to-Left
${!includeProfile ? "- Do NOT include any person photo, name, or profile section\n" : ""}- Clean professional ad layout.
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
