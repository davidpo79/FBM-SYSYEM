import { NextRequest, NextResponse } from "next/server";
import JSZip from "jszip";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET(req: NextRequest) {
  try {
    const projectId = req.nextUrl.searchParams.get("projectId");
    if (!projectId) {
      return NextResponse.json({ error: "Missing projectId" }, { status: 400 });
    }

    // List all files in the project's video folder
    const { data: files, error: listErr } = await supabaseAdmin.storage
      .from("videos")
      .list(projectId);

    if (listErr || !files?.length) {
      return NextResponse.json(
        { error: "No video files found" },
        { status: 404 },
      );
    }

    const zip = new JSZip();
    const brollFolder = zip.folder("broll-images");
    const voFolder = zip.folder("voice-overs");

    for (const file of files) {
      const filePath = `${projectId}/${file.name}`;
      const { data, error: dlErr } = await supabaseAdmin.storage
        .from("videos")
        .download(filePath);

      if (dlErr || !data) {
        console.error(`Failed to download ${filePath}:`, dlErr);
        continue;
      }

      const buffer = Buffer.from(await data.arrayBuffer());

      if (file.name.endsWith("-broll.png")) {
        brollFolder?.file(file.name, buffer);
      } else if (file.name.endsWith("-vo.mp3")) {
        voFolder?.file(file.name, buffer);
      } else if (file.name === "timeline.json") {
        zip.file("timeline.json", buffer);
      }
    }

    // Add README
    zip.file(
      "README.md",
      `# הנחיות לעריכת הווידאו

## מה כלול בחבילה:
- **broll-images/** - תמונות B-Roll שנוצרו ע"י AI
- **voice-overs/** - קבצי Voice Over בעברית
- **timeline.json** - מבנה הסצנות והתזמון

## שלבי העריכה:
1. פתח את הקובץ timeline.json לראות את מבנה הסצנות
2. ייבא את התמונות מתיקיית broll-images לתוכנת העריכה
3. ייבא את קבצי האודיו מתיקיית voice-overs
4. צלם את עצמך בקטעי ה-Selfie (לפי הטקסט ב-timeline)
5. ערוך את הסרטון לפי ה-timeline

## טיפים לצילום סלפי:
- השתמש בתאורה טבעית (מול חלון)
- שמור על גובה עיניים למצלמה
- דבר ישירות למצלמה
- הקפד על רקע נקי
`,
    );

    const zipArrayBuffer = await zip.generateAsync({ type: "arraybuffer" });

    return new NextResponse(zipArrayBuffer, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="video-package-${projectId}.zip"`,
      },
    });
  } catch (error) {
    console.error("download-package error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create download package" },
      { status: 500 },
    );
  }
}
