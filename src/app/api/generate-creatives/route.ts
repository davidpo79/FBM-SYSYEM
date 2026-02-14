import { NextRequest, NextResponse } from "next/server";
import { callClaude } from "@/lib/claude";
import { generateImage } from "@/lib/gemini";
import { supabase } from "@/lib/supabase";
import type { CreativeRequest, CreativeResponse } from "@/types";

function buildClaudePrompt(req: CreativeRequest): string {
  return `אתה מומחה ביצירת prompts ל-Gemini Imagen Pro - AI שמייצר תמונות עם טקסט בעברית.

נתח את התסריט הזה:
"${req.scriptText}"

פרטי המשתמש:
- שם: ${req.userInfo.name}
- תפקיד: ${req.userInfo.role}
- נישה: ${req.userInfo.niche}

צור prompt מפורט באנגלית שייצר creative מקצועי (1080×1080) לפרסום ברשתות חברתיות.

הPrompt חייב לכלול:

1. **רקע דרמטי** - מטאפורי שמתאים לנישה:
   - יועץ משכנתאות: מגדלור מואר בסערה + גשר מואר
   - מאמן כושר: פסגת הר במזרח שמש
   - יועץ עסקי: דרך מוארת בהרים
   - תאורה קולנועית, פוטוריאליסטי

2. **טקסט עברי RTL:**
   - חלץ 2-3 שורות מהתסריט (המסר המרכזי)
   - Heebo Bold, 72pt, זהב (#FFD700)
   - מרכז למעלה
   - רקע כהה מאחורי הטקסט (gradient)
   - חייב להיות קריא וברור!

3. **תמונת פרופיל:**
   - מעגל 150×150px
   - פינה שמאלית תחתונה
   - מסגרת זהב 4px

4. **פרטי משתמש:**
   - שם: ${req.userInfo.name} (לבן, Heebo Bold, 32pt)
   - תפקיד: ${req.userInfo.role} (לבן, Heebo Regular, 24pt)

5. **CTA:**
   - כפתור זהב 500×80px
   - מרכז תחתון
   - טקסט שחור: חלץ מסוף התסריט

החזר JSON בלבד:
{
  "prompt": "prompt מלא באנגלית לGemini Imagen - התחל עם: A dramatic cinematic photograph of...",
  "extracted": {
    "main_text": "הטקסט הראשי בעברית מהתסריט",
    "cta": "טקסט ה-CTA בעברית",
    "background_type": "lighthouse | mountain | path | ocean | city | etc"
  }
}`;
}

export async function POST(req: NextRequest) {
  try {
    const { scriptText, userInfo, userPhoto } =
      (await req.json()) as CreativeRequest;

    if (!scriptText || typeof scriptText !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid scriptText" },
        { status: 400 },
      );
    }

    if (!userInfo?.name || !userInfo?.role || !userInfo?.niche) {
      return NextResponse.json(
        { error: "Missing userInfo (name, role, niche required)" },
        { status: 400 },
      );
    }

    // Step 1: Claude analyzes script and creates Gemini prompt
    const claudePrompt = buildClaudePrompt({
      scriptText,
      userInfo,
      userPhoto,
    });
    const claudeResult = await callClaude("", claudePrompt, 3000);

    // Parse Claude's JSON response
    const jsonMatch = claudeResult.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Failed to parse Claude prompt response");
    }
    const promptData = JSON.parse(jsonMatch[0]) as {
      prompt: string;
      extracted: { main_text: string; cta: string; background_type: string };
    };

    // Step 2: Gemini generates the image
    const { base64: imageBase64, mimeType } = await generateImage(
      promptData.prompt,
    );

    // Step 3: Save to Supabase Storage
    const fileName = `creative-${Date.now()}.png`;
    let imageUrl = "";

    const { error: uploadError } = await supabase.storage
      .from("creatives")
      .upload(fileName, Buffer.from(imageBase64, "base64"), {
        contentType: mimeType || "image/png",
        upsert: false,
      });

    if (uploadError) {
      // If Supabase upload fails, return base64 directly
      console.error("Supabase upload error:", uploadError);
      const response: CreativeResponse = {
        success: true,
        imageUrl: "",
        imageBase64: `data:${mimeType};base64,${imageBase64}`,
        metadata: promptData.extracted,
      };
      return NextResponse.json(response);
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("creatives").getPublicUrl(fileName);

    imageUrl = publicUrl;

    const response: CreativeResponse = {
      success: true,
      imageUrl,
      metadata: promptData.extracted,
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
