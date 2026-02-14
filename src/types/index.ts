export type BackgroundType = "lighthouse" | "mountain" | "path" | "office";
export type ColorType = "gold" | "teal";

export interface CreativeSuggestion {
  main_text: string;
  cta: string;
  background: BackgroundType;
  color: ColorType;
  reasoning: string;
}

export interface CreativeConfig {
  mainText: string;
  cta: string;
  background: BackgroundType;
  color: ColorType;
  userInfo: {
    name: string;
    role: string;
    niche: string;
  };
  profileImage?: string;
  displayName?: string;
  displayRole?: string;
}

export interface CreativeResponse {
  success: boolean;
  imageUrl: string;
  imageBase64?: string;
  metadata: {
    main_text: string;
    cta: string;
    background_type: string;
  };
}
