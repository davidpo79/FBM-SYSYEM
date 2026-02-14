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
};

export async function POST(req: NextRequest) {
  try {
    const { mainText, cta, background, color, userInfo } =
      (await req.json()) as CreativeConfig;

    if (!mainText || !cta || !background || !color) {
      return NextResponse.json(
        { error: "Missing required fields: mainText, cta, background, color" },
        { status: 400 },
      );
    }

    if (!userInfo?.name || !userInfo?.role) {
      return NextResponse.json(
        { error: "Missing userInfo (name, role required)" },
        { status: 400 },
      );
    }

    const colorHex = color === "gold" ? "#FFD700" : "#00A3E0";
    const bgDescription =
      backgroundDescriptions[background] || backgroundDescriptions.lighthouse;

    const prompt = `
${bgDescription}. Professional cinematic lighting, high quality, photorealistic.

Text overlay composition in Hebrew (RTL direction):

Top section:
- Large bold Hebrew text in ${color} (${colorHex}): "${mainText}"
- Font: Heebo Bold, 72pt
- Alignment: center, RTL direction
- Background: dark gradient (rgba(0,0,0,0.7)) behind text for readability

Bottom left corner:
- Circular profile photo placeholder (150×150px) with ${color} border (4px, ${colorHex})
- Below photo:
  * Name: "${userInfo.name}" (white, Heebo Bold, 32pt)
  * Title: "${userInfo.role}" (white, Heebo Regular, 24pt)

Bottom center:
- ${color === "gold" ? "Golden" : "Teal"} rounded button (500×80px, ${colorHex}, border-radius 40px)
- ${color === "gold" ? "Black" : "White"} text on button: "${cta}" (Heebo Bold, 36pt, centered)

Style: Professional social media creative, cinematic atmosphere, Instagram square format (1080×1080), high quality.
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
    console.error("generate-creatives error:", error);
    return NextResponse.json(
      { error: "Failed to generate creative" },
      { status: 500 },
    );
  }
}
