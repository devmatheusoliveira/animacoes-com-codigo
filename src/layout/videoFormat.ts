import { z } from "zod";

export const videoFormatSchema = z.enum(["horizontal", "vertical"])
  .default("horizontal")
  .describe("Formato do vídeo · horizontal 16:9 ou vertical 9:16");

export const socialSafeAreaSchema = z.boolean().default(false)
  .describe("Margens para Reels e Shorts · apenas no formato vertical");

// A project design margin, not a guarantee about every version of an app's UI.
// Keep the existing portrait layout intact and inset it without clipping content.
export const socialFrame = (width: number, height: number, enabled: boolean) =>
  enabled && height > width
    ? { left: width * (66 / 1080), top: height * (82 / 1920), scale: 0.82 }
    : { left: 0, top: 0, scale: 1 };

export const videoDimensions = (format: z.infer<typeof videoFormatSchema>) =>
  format === "vertical" ? { width: 1080, height: 1920 } : { width: 1920, height: 1080 };

// Reorient only a flowchart's declaration; leave its nodes, edges and labels intact.
export const portraitMermaid = (source: string) =>
  source.replace(/^(\s*(?:flowchart|graph)\s+)(?:LR|RL)\b/m, "$1TB");
