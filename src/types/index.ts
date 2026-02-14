export interface CreativeRequest {
  scriptText: string;
  userInfo: {
    name: string;
    role: string;
    niche: string;
  };
  userPhoto?: string;
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
