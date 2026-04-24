// Generation type constants - sync with main app
export const GENERATION_TYPES = {
  TEXT_TO_IMAGE: 'text_to_image',
  GPT_IMAGE: 'gpt_image',
  NANO_BANANA_TEXT_TO_IMAGE: 'nano_banana_text_to_image',
  IMAGE_TO_IMAGE: 'image_to_image',
  IMAGE_TO_IMAGE_MULTI: 'image_to_image_multi',
  IMAGE_UPSCALE: 'image_upscale',
  TEXT_TO_VIDEO: 'text_to_video',
  TEXT_TO_VIDEO_CINEMATIC: 'text_to_video_cinematic',
  IMAGE_TO_VIDEO: 'image_to_video',
  IMAGE_TO_VIDEO_CINEMATIC: 'image_to_video_cinematic',
  TEXT_TO_AUDIO_SPEECH: 'text_to_audio_speech',
  TEXT_TO_AUDIO_MUSIC: 'text_to_audio_music',
  AUDIO_TRANSCRIPTION: 'audio_transcription',
} as const;

// Estimated durations in seconds - sync with main app
export const ESTIMATED_DURATIONS = {
  [GENERATION_TYPES.TEXT_TO_IMAGE]: 30, // 30 seconds
  [GENERATION_TYPES.GPT_IMAGE]: 120, // 2 minutes (GPT Image 2 at quality=high)
  [GENERATION_TYPES.NANO_BANANA_TEXT_TO_IMAGE]: 20, // 20 seconds
  [GENERATION_TYPES.IMAGE_TO_IMAGE]: 35, // 35 seconds
  [GENERATION_TYPES.IMAGE_TO_IMAGE_MULTI]: 35, // 35 seconds
  [GENERATION_TYPES.IMAGE_UPSCALE]: 30, // 30 seconds
  [GENERATION_TYPES.TEXT_TO_VIDEO]: 270, // 4.5 minutes
  [GENERATION_TYPES.TEXT_TO_VIDEO_CINEMATIC]: 600, // 10 minutes
  [GENERATION_TYPES.IMAGE_TO_VIDEO]: 240, // 4 minutes
  [GENERATION_TYPES.IMAGE_TO_VIDEO_CINEMATIC]: 540, // 9 minutes
  [GENERATION_TYPES.TEXT_TO_AUDIO_SPEECH]: 30, // 30 seconds
  [GENERATION_TYPES.TEXT_TO_AUDIO_MUSIC]: 60, // 1 minute
  [GENERATION_TYPES.AUDIO_TRANSCRIPTION]: 45, // 45 seconds
} as const;

// Human-readable display strings - sync with main app
export const GENERATION_TIMES_DISPLAY = {
  [GENERATION_TYPES.TEXT_TO_IMAGE]: "~30 seconds",
  [GENERATION_TYPES.GPT_IMAGE]: "~2 minutes",
  [GENERATION_TYPES.NANO_BANANA_TEXT_TO_IMAGE]: "~20 seconds",
  [GENERATION_TYPES.IMAGE_TO_IMAGE]: "~35 seconds",
  [GENERATION_TYPES.IMAGE_TO_IMAGE_MULTI]: "~35 seconds",
  [GENERATION_TYPES.IMAGE_UPSCALE]: "~30 seconds",
  [GENERATION_TYPES.TEXT_TO_VIDEO]: "~4.5 minutes",
  [GENERATION_TYPES.TEXT_TO_VIDEO_CINEMATIC]: "~10 minutes",
  [GENERATION_TYPES.IMAGE_TO_VIDEO]: "~4 minutes",
  [GENERATION_TYPES.IMAGE_TO_VIDEO_CINEMATIC]: "~9 minutes",
  [GENERATION_TYPES.TEXT_TO_AUDIO_SPEECH]: "~30 seconds",
  [GENERATION_TYPES.TEXT_TO_AUDIO_MUSIC]: "~1 minute",
  [GENERATION_TYPES.AUDIO_TRANSCRIPTION]: "~45 seconds",
} as const;

/**
 * Get expected completion time and polling guidance for a generation type
 */
export function getCompletionTimeInfo(generationType?: string): {
  expectedDuration: number;
  displayTime: string;
  pollingSuggestion: string;
} {
  const duration = generationType && generationType in ESTIMATED_DURATIONS 
    ? ESTIMATED_DURATIONS[generationType as keyof typeof ESTIMATED_DURATIONS]
    : 60; // Default to 1 minute if unknown
  
  const displayTime = generationType && generationType in GENERATION_TIMES_DISPLAY
    ? GENERATION_TIMES_DISPLAY[generationType as keyof typeof GENERATION_TIMES_DISPLAY]
    : "~1 minute";

  // Add buffer time for polling guidance (15-30 seconds extra)
  const pollBuffer = Math.min(30, Math.max(15, duration * 0.2));
  const pollTime = duration + pollBuffer;
  
  const pollingSuggestion = pollTime < 60 
    ? `in about ${Math.round(pollTime)} seconds`
    : `in about ${Math.round(pollTime / 60)} minutes`;

  return {
    expectedDuration: duration,
    displayTime,
    pollingSuggestion
  };
}