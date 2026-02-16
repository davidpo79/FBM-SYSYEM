export interface CreativeTemplate {
  id: string;
  name: string;
  preview: string;
  // Background
  background: string; // CSS background (gradient)
  backgroundImage?: string; // optional: URL to pattern/texture overlay
  // Overlay
  overlay: string; // CSS gradient for text readability
  // Headline
  headline: {
    color: string;
    fontSize: number;
    fontWeight: string;
    x: number; // % from right
    y: number; // % from top
    maxWidth: string;
    textShadow: string;
    textAlign: "right" | "center";
    lineHeight: number;
  };
  // Subtitle
  subtitle: {
    color: string;
    fontSize: number;
    x: number;
    y: number;
  };
  // CTA button
  cta: {
    bgColor: string;
    textColor: string;
    x: number;
    y: number;
    borderRadius: number;
    fontSize: number;
    padding: string;
    shadow: string;
  };
  // Decorative elements (CSS only)
  decorations: Decoration[];
}

type Decoration =
  | { type: "line"; x: number; y: number; width: string; height: string; color: string }
  | { type: "corner-frame"; color: string; size: number; thickness: number }
  | { type: "bottom-bar"; color: string; height: string }
  | { type: "circle-glow"; x: number; y: number; size: string; color: string; opacity: number }
  | { type: "vignette"; intensity: number };

export const TEMPLATES: CreativeTemplate[] = [
  // 1. Dark + Gold — Classic FBM
  {
    id: "dark-gold",
    name: "FBM קלאסי",
    preview: "🖤",
    background: "linear-gradient(160deg, #08080f 0%, #111827 30%, #1f2937 60%, #111827 100%)",
    overlay: "none",
    headline: {
      color: "#F5D565",
      fontSize: 28,
      fontWeight: "bold",
      x: 8, y: 15,
      maxWidth: "84%",
      textShadow: "0 2px 20px rgba(0,0,0,0.8)",
      textAlign: "center",
      lineHeight: 1.4,
    },
    subtitle: { color: "rgba(255,255,255,0.75)", fontSize: 14, x: 8, y: 58 },
    cta: {
      bgColor: "#D4A843", textColor: "#0a0a0a",
      x: 25, y: 80, borderRadius: 25, fontSize: 15,
      padding: "12px 32px", shadow: "0 4px 20px rgba(212,168,67,0.4)",
    },
    decorations: [
      { type: "line", x: 8, y: 38, width: "50px", height: "3px", color: "#D4A843" },
      { type: "circle-glow", x: 85, y: 10, size: "120px", color: "#D4A843", opacity: 0.06 },
      { type: "vignette", intensity: 0.3 },
    ],
  },

  // 2. Premium Black — Minimalist
  {
    id: "premium-black",
    name: "פרימיום",
    preview: "💎",
    background: "linear-gradient(180deg, #000000 0%, #0a0a0a 40%, #141414 100%)",
    overlay: "none",
    headline: {
      color: "#ffffff",
      fontSize: 30,
      fontWeight: "800",
      x: 10, y: 22,
      maxWidth: "80%",
      textShadow: "none",
      textAlign: "center",
      lineHeight: 1.3,
    },
    subtitle: { color: "rgba(255,255,255,0.5)", fontSize: 14, x: 10, y: 55 },
    cta: {
      bgColor: "#ffffff", textColor: "#000000",
      x: 28, y: 78, borderRadius: 8, fontSize: 14,
      padding: "12px 36px", shadow: "0 4px 20px rgba(255,255,255,0.15)",
    },
    decorations: [
      { type: "line", x: 38, y: 42, width: "24%", height: "2px", color: "#D4A843" },
    ],
  },

  // 3. Warm Sunset
  {
    id: "sunset",
    name: "שקיעה",
    preview: "🌅",
    background: "linear-gradient(135deg, #1a0a00 0%, #4a1500 20%, #c2501a 50%, #f5a623 80%, #ffd93d 100%)",
    overlay: "linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.1) 40%, rgba(0,0,0,0.1) 55%, rgba(0,0,0,0.5) 100%)",
    headline: {
      color: "#ffffff",
      fontSize: 28,
      fontWeight: "bold",
      x: 8, y: 12,
      maxWidth: "84%",
      textShadow: "0 3px 20px rgba(0,0,0,0.7)",
      textAlign: "center",
      lineHeight: 1.4,
    },
    subtitle: { color: "rgba(255,255,255,0.85)", fontSize: 14, x: 8, y: 55 },
    cta: {
      bgColor: "#ffffff", textColor: "#c2501a",
      x: 25, y: 80, borderRadius: 25, fontSize: 15,
      padding: "12px 32px", shadow: "0 4px 20px rgba(0,0,0,0.3)",
    },
    decorations: [
      { type: "vignette", intensity: 0.2 },
    ],
  },

  // 4. Ocean — Professional Blue
  {
    id: "ocean",
    name: "אושן",
    preview: "🌊",
    background: "linear-gradient(135deg, #0a192f 0%, #0d2847 30%, #1a4a7a 60%, #0d2847 100%)",
    overlay: "none",
    headline: {
      color: "#64ffda",
      fontSize: 26,
      fontWeight: "bold",
      x: 8, y: 15,
      maxWidth: "84%",
      textShadow: "0 2px 16px rgba(0,0,0,0.5)",
      textAlign: "center",
      lineHeight: 1.4,
    },
    subtitle: { color: "rgba(255,255,255,0.7)", fontSize: 14, x: 8, y: 55 },
    cta: {
      bgColor: "#64ffda", textColor: "#0a192f",
      x: 25, y: 80, borderRadius: 25, fontSize: 15,
      padding: "12px 32px", shadow: "0 4px 16px rgba(100,255,218,0.3)",
    },
    decorations: [
      { type: "corner-frame", color: "#64ffda", size: 40, thickness: 2 },
    ],
  },

  // 5. Purple Energy
  {
    id: "purple",
    name: "אנרגיה",
    preview: "⚡",
    background: "linear-gradient(135deg, #0f0020 0%, #2d0b55 25%, #5b21b6 55%, #7c3aed 80%, #5b21b6 100%)",
    overlay: "linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, transparent 35%, transparent 60%, rgba(0,0,0,0.4) 100%)",
    headline: {
      color: "#ffffff",
      fontSize: 28,
      fontWeight: "bold",
      x: 8, y: 15,
      maxWidth: "84%",
      textShadow: "0 2px 20px rgba(0,0,0,0.5)",
      textAlign: "center",
      lineHeight: 1.4,
    },
    subtitle: { color: "#ddd6fe", fontSize: 14, x: 8, y: 55 },
    cta: {
      bgColor: "#a78bfa", textColor: "#ffffff",
      x: 25, y: 80, borderRadius: 25, fontSize: 15,
      padding: "12px 32px", shadow: "0 4px 20px rgba(167,139,250,0.4)",
    },
    decorations: [
      { type: "circle-glow", x: 80, y: 5, size: "150px", color: "#a78bfa", opacity: 0.08 },
      { type: "bottom-bar", color: "#a78bfa", height: "3px" },
    ],
  },

  // 6. Nature Green
  {
    id: "nature",
    name: "טבע",
    preview: "🌿",
    background: "linear-gradient(135deg, #021a02 0%, #0d3b0d 25%, #1b5e20 50%, #2e7d32 75%, #1b5e20 100%)",
    overlay: "linear-gradient(to bottom, rgba(0,0,0,0.4) 0%, transparent 35%, transparent 65%, rgba(0,0,0,0.4) 100%)",
    headline: {
      color: "#ffffff",
      fontSize: 27,
      fontWeight: "bold",
      x: 8, y: 14,
      maxWidth: "84%",
      textShadow: "0 2px 16px rgba(0,0,0,0.6)",
      textAlign: "center",
      lineHeight: 1.4,
    },
    subtitle: { color: "#a5d6a7", fontSize: 14, x: 8, y: 55 },
    cta: {
      bgColor: "#66bb6a", textColor: "#ffffff",
      x: 25, y: 80, borderRadius: 25, fontSize: 15,
      padding: "12px 32px", shadow: "0 4px 16px rgba(102,187,106,0.3)",
    },
    decorations: [],
  },

  // 7. Dark Studio — Dramatic
  {
    id: "studio",
    name: "סטודיו",
    preview: "🎬",
    background: "linear-gradient(145deg, #0d0d0d 0%, #1a1a2e 30%, #16213e 60%, #0d0d0d 100%)",
    overlay: "radial-gradient(ellipse at 30% 50%, rgba(212,168,67,0.05) 0%, transparent 70%)",
    headline: {
      color: "#ffffff",
      fontSize: 28,
      fontWeight: "bold",
      x: 8, y: 15,
      maxWidth: "84%",
      textShadow: "0 2px 16px rgba(0,0,0,0.7)",
      textAlign: "center",
      lineHeight: 1.4,
    },
    subtitle: { color: "rgba(255,255,255,0.6)", fontSize: 14, x: 8, y: 55 },
    cta: {
      bgColor: "#D4A843", textColor: "#0d0d0d",
      x: 25, y: 80, borderRadius: 25, fontSize: 15,
      padding: "12px 32px", shadow: "0 4px 20px rgba(212,168,67,0.3)",
    },
    decorations: [
      { type: "line", x: 8, y: 38, width: "40px", height: "2px", color: "#D4A843" },
      { type: "vignette", intensity: 0.4 },
    ],
  },

  // 8. Fire Red — Bold
  {
    id: "fire",
    name: "אש",
    preview: "🔥",
    background: "linear-gradient(135deg, #1a0000 0%, #4a0000 25%, #8b0000 50%, #c62828 80%, #4a0000 100%)",
    overlay: "linear-gradient(to bottom, rgba(0,0,0,0.4) 0%, transparent 40%, transparent 60%, rgba(0,0,0,0.5) 100%)",
    headline: {
      color: "#ffffff",
      fontSize: 28,
      fontWeight: "800",
      x: 8, y: 15,
      maxWidth: "84%",
      textShadow: "0 2px 20px rgba(0,0,0,0.6)",
      textAlign: "center",
      lineHeight: 1.35,
    },
    subtitle: { color: "#ffcdd2", fontSize: 14, x: 8, y: 55 },
    cta: {
      bgColor: "#ff5252", textColor: "#ffffff",
      x: 25, y: 80, borderRadius: 25, fontSize: 15,
      padding: "12px 32px", shadow: "0 4px 20px rgba(255,82,82,0.4)",
    },
    decorations: [
      { type: "bottom-bar", color: "#ff5252", height: "3px" },
    ],
  },
];

// Map AI suggestion background to best template
export function suggestTemplate(bgType: string, color: string): string {
  const map: Record<string, string> = {
    lighthouse: "ocean",
    mountain: "nature",
    path: "sunset",
    office: "premium-black",
    city: "studio",
    sunset: "sunset",
    forest: "nature",
    studio: "studio",
  };
  return map[bgType] || (color === "gold" ? "dark-gold" : "ocean");
}
