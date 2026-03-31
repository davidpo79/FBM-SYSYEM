import { fal } from "@fal-ai/client";

// Configure fal.ai client with API key
fal.config({
  credentials: process.env.FAL_KEY!,
});

interface FluxResult {
  base64: string;
  mimeType: string;
}

type FalImageSize = "square_hd" | "square" | "portrait_4_3" | "portrait_16_9" | "landscape_4_3" | "landscape_16_9";

function aspectRatioToSize(ratio: string): FalImageSize {
  switch (ratio) {
    case "16:9": return "landscape_16_9";
    case "9:16": return "portrait_16_9";
    case "1:1": return "square_hd";
    default: return "portrait_16_9";
  }
}

async function downloadToBase64(url: string): Promise<{ base64: string; mimeType: string }> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to download FLUX image: ${response.status}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  return {
    base64: buffer.toString("base64"),
    mimeType: response.headers.get("content-type") || "image/png",
  };
}

/**
 * Generate an image using FLUX Pro (text-to-image).
 * Used as fallback when no reference image is available.
 */
export async function fluxTextToImage(
  prompt: string,
  aspectRatio: "16:9" | "9:16" | "1:1" = "9:16",
): Promise<FluxResult> {
  const result = await fal.subscribe("fal-ai/flux-pro/v1.1", {
    input: {
      prompt,
      image_size: aspectRatioToSize(aspectRatio),
      num_images: 1,
      safety_tolerance: "5",
    },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const imageUrl = (result.data as any)?.images?.[0]?.url;
  if (!imageUrl) throw new Error("FLUX failed to generate image");
  return downloadToBase64(imageUrl);
}

/**
 * Generate an image using FLUX with a reference/product image (image-to-image).
 * Uses the reference image to generate a new scene image that incorporates
 * the product's visual style and appearance.
 */
export async function fluxImageToImage(
  prompt: string,
  referenceImageUrl: string,
  strength: number = 0.75,
  aspectRatio: "16:9" | "9:16" | "1:1" = "9:16",
): Promise<FluxResult> {
  const result = await fal.subscribe("fal-ai/flux/dev/image-to-image", {
    input: {
      prompt,
      image_url: referenceImageUrl,
      strength,
      num_images: 1,
      num_inference_steps: 28,
      guidance_scale: 3.5,
    } as Record<string, unknown>,
  } as Parameters<typeof fal.subscribe>[1]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const imageUrl = (result.data as any)?.images?.[0]?.url;
  if (!imageUrl) throw new Error("FLUX image-to-image failed to generate");
  return downloadToBase64(imageUrl);
}

/**
 * Generate a scene image using FLUX with Redux (image variation).
 * Takes a product image and generates a styled variation for use in video scenes.
 */
export async function fluxReduxVariation(
  referenceImageUrl: string,
  prompt: string,
  aspectRatio: "16:9" | "9:16" | "1:1" = "9:16",
): Promise<FluxResult> {
  const result = await fal.subscribe("fal-ai/flux-pro/v1.1-ultra/redux", {
    input: {
      image_url: referenceImageUrl,
      prompt,
      num_images: 1,
    } as Record<string, unknown>,
  } as Parameters<typeof fal.subscribe>[1]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const imageUrl = (result.data as any)?.images?.[0]?.url;
  if (!imageUrl) throw new Error("FLUX Redux variation failed");
  return downloadToBase64(imageUrl);
}

/**
 * Smart image generation: uses reference image with FLUX if available,
 * falls back to FLUX text-to-image.
 */
export async function generateSceneImage(
  prompt: string,
  referenceImageUrl?: string,
  aspectRatio: "16:9" | "9:16" | "1:1" = "9:16",
): Promise<FluxResult> {
  if (referenceImageUrl) {
    try {
      return await fluxImageToImage(prompt, referenceImageUrl, 0.65, aspectRatio);
    } catch (e) {
      console.warn("FLUX image-to-image failed, trying Redux variation:", e);
      try {
        return await fluxReduxVariation(referenceImageUrl, prompt, aspectRatio);
      } catch (e2) {
        console.warn("FLUX Redux failed, falling back to text-to-image:", e2);
      }
    }
  }
  return fluxTextToImage(prompt, aspectRatio);
}
