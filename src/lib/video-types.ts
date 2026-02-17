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

export interface VideoScene {
  number: number;
  duration: number;
  searchQuery: string;       // English keywords for Pexels search
  voiceOverText: string;     // Hebrew voice-over text
  subtitleText?: string;     // Hebrew subtitle (defaults to voiceOverText)
  visualDescription: string; // Hebrew description for UI
  notes: string;
  /* Clip selection */
  selectedClip?: PexelsVideo;
  clipOptions?: PexelsVideo[];
}

export interface AdaptedScript {
  title: string;
  scenes: VideoScene[];
  totalDuration: number;
}

export interface VoiceSettings {
  voice: "male" | "female";
  rate: number;   // 0.5 – 2.0
  pitch: number;  // -10 – +10
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
