export interface VideoScene {
  number: number;
  type: "b-roll";
  duration: number;
  imagePrompt: string;        // English prompt for Veo video generation
  imagePromptHe: string;      // Hebrew visual description for UI display
  voiceOverText: string;      // Hebrew voice-over text
  subtitleText?: string;      // Hebrew subtitle (defaults to voiceOverText)
  notes: string;
}

export interface AdaptedScript {
  scenes: VideoScene[];
  totalDuration: number;
  title: string;              // Video title for display
}

export interface VoiceSettings {
  voice: "male" | "female";
  rate: number;
  pitch: number;
}

export interface SceneResult {
  number: number;
  type: "b-roll";
  imageUrl?: string;
  voiceOverUrl?: string;
}

export interface VideoProject {
  id: string;
  project_id: string;
  script_index: number;
  adapted_script: AdaptedScript;
  voice_settings: VoiceSettings;
  scenes_data: SceneResult[];
  status: "draft" | "processing" | "ready" | "failed";
  created_at: string;
  updated_at: string;
}
