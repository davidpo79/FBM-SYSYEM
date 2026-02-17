export interface VideoScene {
  number: number;
  type: "b-roll";
  duration: number;
  imagePrompt?: string;
  voiceOverText?: string;
  notes: string;
}

export interface AdaptedScript {
  scenes: VideoScene[];
  totalDuration: number;
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
