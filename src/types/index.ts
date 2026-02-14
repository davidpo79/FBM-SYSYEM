export type BackgroundType = "lighthouse" | "mountain" | "path" | "office" | "city" | "sunset" | "forest" | "studio";
export type ColorType = "gold" | "teal";
export type FontSizeType = "small" | "medium" | "large";
export type TextPositionType = "top" | "center" | "bottom";
export type FormatType = "feed" | "story";

export interface CreativeSuggestion {
  main_text: string;
  cta: string;
  background: BackgroundType;
  color: ColorType;
  reasoning: string;
  look_and_feel?: string;
}

export interface CreativeConfig {
  mainText: string;
  subtitle?: string;
  cta: string;
  background: BackgroundType;
  color: ColorType;
  userInfo: {
    name: string;
    role: string;
    niche: string;
  };
  format?: FormatType;
  fontSize?: FontSizeType;
  textPosition?: TextPositionType;
  showProfile?: boolean;
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
