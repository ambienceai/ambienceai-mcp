import type { ModelInfo } from "./api-client.js";

/**
 * Canonical generation-type string literals returned by the backend's
 * creation responses. Kept here as a stable union for type narrowing —
 * this file no longer owns any model-specific data (durations, display
 * strings, credit costs). Those all live on the backend registry and
 * reach the MCP via GET /api/models.
 */
export const GENERATION_TYPES = {
  TEXT_TO_IMAGE: "text_to_image",
  GPT_IMAGE: "gpt_image",
  NANO_BANANA_TEXT_TO_IMAGE: "nano_banana_text_to_image",
  IMAGE_TO_IMAGE: "image_to_image",
  IMAGE_TO_IMAGE_MULTI: "image_to_image_multi",
  IMAGE_UPSCALE: "image_upscale",
  TEXT_TO_VIDEO: "text_to_video",
  TEXT_TO_VIDEO_CINEMATIC: "text_to_video_cinematic",
  IMAGE_TO_VIDEO: "image_to_video",
  IMAGE_TO_VIDEO_CINEMATIC: "image_to_video_cinematic",
  TEXT_TO_AUDIO_SPEECH: "text_to_audio_speech",
  TEXT_TO_AUDIO_MUSIC: "text_to_audio_music",
  AUDIO_TRANSCRIPTION: "audio_transcription",
} as const;

const FALLBACK_DURATION_SECONDS = 60;
const FALLBACK_DISPLAY_TIME = "~1 minute";

type CreationInfo =
  | {
      generationType?: string;
      model?: string;
    }
  | undefined
  | null;

/**
 * Resolve the backend's estimatedDuration + durationDisplay for a creation,
 * looking up by {model, generationType} against the fetched /api/models list.
 *
 * Resolution order:
 *   1. Exact match on (model.id, task) — the authoritative answer.
 *   2. Lowest estimatedDuration across any model that supports the task —
 *      used when `creation.model` is missing or unknown.
 *   3. Generic fallback (60s / "~1 minute") — used when models is empty.
 */
export function getCompletionTimeInfo(
  creation: CreationInfo,
  models: ModelInfo[],
): {
  expectedDuration: number;
  displayTime: string;
  pollingSuggestion: string;
} {
  const task = creation?.generationType;
  const modelId = creation?.model;

  let duration = FALLBACK_DURATION_SECONDS;
  let displayTime = FALLBACK_DISPLAY_TIME;

  if (task && models.length > 0) {
    // 1. Exact (model, task) match.
    if (modelId) {
      const matchedModel = models.find((m) => m.id === modelId);
      const matchedTask = matchedModel?.tasks.find((t) => t.task === task);
      if (matchedTask) {
        duration = matchedTask.estimatedDuration;
        displayTime = matchedTask.durationDisplay;
      }
    }

    // 2. Task-wide fallback: use the lowest duration across models that
    //    support this task. Underpromises rather than overpromises.
    if (
      duration === FALLBACK_DURATION_SECONDS &&
      displayTime === FALLBACK_DISPLAY_TIME
    ) {
      const taskMatches = models.flatMap((m) =>
        m.tasks.filter((t) => t.task === task),
      );
      if (taskMatches.length > 0) {
        const fastest = taskMatches.reduce((acc, t) =>
          t.estimatedDuration < acc.estimatedDuration ? t : acc,
        );
        duration = fastest.estimatedDuration;
        displayTime = fastest.durationDisplay;
      }
    }
  }

  // Polling buffer: 20% of duration, clamped to [15, 30] seconds.
  const pollBuffer = Math.min(30, Math.max(15, duration * 0.2));
  const pollTime = duration + pollBuffer;

  const pollingSuggestion =
    pollTime < 60
      ? `in about ${Math.round(pollTime)} seconds`
      : `in about ${Math.round(pollTime / 60)} minutes`;

  return {
    expectedDuration: duration,
    displayTime,
    pollingSuggestion,
  };
}
