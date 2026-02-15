import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_AI_API_KEY! });

const SYSTEM_PROMPT =
  "You are helping a user formulate a product improvement suggestion for FBM Studio (a Facebook marketing tool). Help them articulate their idea clearly. Respond in Hebrew. Be encouraging and ask clarifying questions.";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      conversation?: ChatMessage[];
      messages?: ChatMessage[];
      action?: "submit" | "send";
      title?: string;
      userId?: string;
    };

    // Support both "conversation" and "messages" keys for compatibility
    const conversation = body.conversation || body.messages;
    const { action, title, userId } = body;

    if (
      !conversation ||
      !Array.isArray(conversation) ||
      conversation.length === 0
    ) {
      return NextResponse.json(
        { error: "חסרות הודעות בשיחה" },
        { status: 400 },
      );
    }

    // If action is "submit" (or legacy "send"), save the suggestion to the database
    if (action === "submit" || action === "send") {
      // Auto-generate title from first user message if not provided
      const firstUserMessage = conversation.find((m) => m.role === "user");
      const suggestionTitle =
        title ||
        (firstUserMessage
          ? firstUserMessage.content.slice(0, 100)
          : "הצעת שיפור");

      const { data, error } = await supabaseAdmin
        .from("improvement_suggestions")
        .insert({
          user_id: userId || null,
          title: suggestionTitle,
          conversation,
          status: "new",
        })
        .select()
        .single();

      if (error) {
        console.error("suggest-improvement - insert error:", error.message, error.details, error.hint);
        return NextResponse.json(
          { error: `שגיאה בשמירת ההצעה: ${error.message}` },
          { status: 500 },
        );
      }

      return NextResponse.json({
        success: true,
        suggestionId: data?.id,
        message: "ההצעה נשמרה בהצלחה! תודה על המשוב.",
      });
    }

    // Otherwise, use Google Gemini AI to help formulate the suggestion
    const conversationText = conversation
      .map((m) => {
        const prefix = m.role === "user" ? "משתמש" : "עוזר";
        return `${prefix}: ${m.content}`;
      })
      .join("\n\n");

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: conversationText,
      config: {
        temperature: 0.7,
        systemInstruction: SYSTEM_PROMPT,
      },
    });

    const aiText = response.text;
    if (!aiText) {
      throw new Error("Empty response from Gemini");
    }

    return NextResponse.json({
      reply: aiText,
    });
  } catch (e) {
    console.error("suggest-improvement exception:", e);
    return NextResponse.json(
      { error: "שגיאה בעיבוד הצעת השיפור" },
      { status: 500 },
    );
  }
}
