import { z } from "zod";

// API Response types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

// Credits API response
export const CreditsResponseSchema = z.object({
  credits: z.number(),
});

export type CreditsResponse = z.infer<typeof CreditsResponseSchema>;

// Creation types
export const CreationSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  prompt: z.string(),
  status: z.enum(["pending", "processing", "completed", "failed"]),
  type: z.enum([
    "image",
    "video",
    "speech",
    "music",
    "upscale",
    "transcription",
  ]),
  created_at: z.string(),
  completed_at: z.string().optional(),
  url: z.string().optional(),
  error: z.string().optional(),
  metadata: z.record(z.any()).optional(),
  generationType: z.string().optional(),
  model: z.string().optional(),
});

export type Creation = z.infer<typeof CreationSchema>;

// Generation request schemas
export const GenerateImageRequestSchema = z.object({
  prompt: z.string().min(1),
  aspectRatio: z.enum(["16:9", "9:16", "1:1", "4:3", "3:4"]).default("16:9"),
  // No client-side default: an omitted model is left out of the API request so
  // the server's current default applies (see /api/models `defaults`).
  model: z.string().optional(),
  outputFormat: z.enum(["jpeg", "png"]).optional(),
  seed: z.number().optional(),
  imageUrl: z.string().optional(),
  guideImageUrl: z.string().optional(),
});

export type GenerateImageRequest = z.infer<typeof GenerateImageRequestSchema>;

export const GenerateImageMultiRequestSchema = z.object({
  prompt: z.string().min(1),
  imageUrls: z.array(z.string()).min(1).max(5),
  aspectRatio: z.enum(["16:9", "9:16", "1:1", "4:3", "3:4"]).default("16:9"),
  // No client-side default: the server resolves omitted models.
  model: z.string().optional(),
  outputFormat: z.enum(["jpeg", "png"]).optional(),
  seed: z.number().optional(),
});

export type GenerateImageMultiRequest = z.infer<
  typeof GenerateImageMultiRequestSchema
>;

export const GenerateVideoRequestSchema = z.object({
  prompt: z.string().min(1),
  aspectRatio: z.enum(["16:9", "9:16", "1:1", "4:3", "3:4"]).default("16:9"),
  duration: z.number().min(1).max(30).default(5),
  // No client-side default: the server resolves omitted models.
  model: z.string().optional(),
  imageUrl: z.string().optional(),
  negativePrompt: z.string().optional(),
  preprocessImagePrompt: z.string().optional(),
});

export type GenerateVideoRequest = z.infer<typeof GenerateVideoRequestSchema>;

export const GenerateMusicRequestSchema = z.object({
  prompt: z.string().min(1),
  genre: z.string().optional(),
  mood: z.string().optional(),
  lyrics: z.string().optional(),
});

export type GenerateMusicRequest = z.infer<typeof GenerateMusicRequestSchema>;

export const GenerateSpeechRequestSchema = z.object({
  text: z.string().min(1),
  voice: z.string().default("af_heart"),
  language: z
    .enum([
      "american-english",
      "british-english",
      "japanese",
      "mandarin-chinese",
      "spanish",
      "french",
      "hindi",
      "italian",
      "brazilian-portuguese",
    ])
    .default("american-english"),
  speed: z.number().min(0.25).max(4.0).optional(),
});

export type GenerateSpeechRequest = z.infer<typeof GenerateSpeechRequestSchema>;

// Legacy schema for backward compatibility
export const GenerateAudioRequestSchema = z.object({
  prompt: z.string().min(1),
  type: z.enum(["speech", "music"]),
  voice: z.string().optional(),
  language: z.string().optional(),
});

export type GenerateAudioRequest = z.infer<typeof GenerateAudioRequestSchema>;

// Chart generation.
export const GenerateChartRequestSchema = z
  .object({
    chartType: z.enum(["bar", "line", "pie", "counter"]),
    format: z.enum(["image", "video"]).optional(),
    title: z.string().min(1),
    data: z
      .array(z.object({ label: z.string(), value: z.number() }))
      .optional(),
    value: z.number().optional(),
    subtitle: z.string().optional(),
    caption: z.string().optional(),
    valuePrefix: z.string().optional(),
    valueSuffix: z.string().optional(),
    aspectRatio: z.enum(["16:9", "1:1", "9:16"]).optional(),
    accentColor: z.string().optional(),
    backgroundColor: z.string().optional(),
  })
  .superRefine((input, ctx) => {
    if (input.chartType === "counter" && input.value === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["value"],
        message: "value is required for a counter chart",
      });
    }
  });

export type GenerateChartRequest = z.infer<typeof GenerateChartRequestSchema>;

export const UpscaleImageRequestSchema = z.object({
  imageUrl: z.string(),
  upscaleFactor: z.number().min(1).max(4).default(2),
  originalPrompt: z.string().optional(),
});

export type UpscaleImageRequest = z.infer<typeof UpscaleImageRequestSchema>;

export const TranscribeAudioRequestSchema = z.object({
  audioUrl: z.string().url(),
});

export type TranscribeAudioRequest = z.infer<
  typeof TranscribeAudioRequestSchema
>;

export const LibraryRequestSchema = z.object({
  limit: z.number().min(1).max(100).default(10),
  offset: z.number().min(0).default(0),
});

export type LibraryRequest = z.infer<typeof LibraryRequestSchema>;
