/* ── Video Creator Types ── */

export interface PexelsVideoFile {
  id: number;
  quality: string;
  width: number;
  height: number;
  link: string;
}

export interface PexelsVideo {
  id: number;
  url: string;       // Pexels page URL
  image: string;     // Thumbnail URL
  duration: number;  // seconds
  videoFiles: PexelsVideoFile[];
}

/** Video source: stock footage (Pexels) */
export type VideoSource = "pexels";

/** Word-level timestamp for precise subtitle sync */
export interface WordTimestamp {
  word: string;
  start: number;  // seconds from scene start
  end: number;    // seconds from scene start
}

export interface VideoScene {
  number: number;
  duration: number;
  searchQuery: string;         // English keywords for Pexels search
  videoPromptEn: string;       // English cinematic prompt for AI video generation
  voiceOverText: string;       // Hebrew voice-over text
  subtitleText?: string;       // Hebrew subtitle (defaults to voiceOverText)
  visualDescription: string;   // Hebrew description for UI
  notes: string;
  /* Clip selection (Pexels mode) */
  selectedClip?: PexelsVideo;
  clipOptions?: PexelsVideo[];
  /* AI video clip (reserved for future use) */
  aiClipUrl?: string;
  aiClipTaskId?: string;
  aiClipStatus?: "pending" | "generating" | "ready" | "failed";
  /* Word-level timestamps from TTS (for precise subtitle sync) */
  wordTimestamps?: WordTimestamp[];
}

export interface AdaptedScript {
  title: string;
  scenes: VideoScene[];
  totalDuration: number;
  videoSource?: VideoSource;   // Which video source to use
}

export interface VoiceSettings {
  voice: "male" | "female";
  rate: number;   // 0.5 – 2.0
  pitch: number;  // -10 – +10
}

/** Gemini TTS voice options */
export interface GeminiVoiceConfig {
  voiceName: string;          // e.g., "Aoede", "Charon"
}

export interface VideoProject {
  id: string;
  project_id: string;
  script_index: number;
  adapted_script: AdaptedScript;
  voice_settings: VoiceSettings;
  status: "draft" | "processing" | "ready" | "failed";
  final_video_url?: string;
  created_at: string;
  updated_at: string;
}
