import { GENERATION_TYPES, getCompletionTimeInfo } from '../../constants.js';
import type { ModelInfo } from '../../api-client.js';

// Fixture that mirrors the shape of GET /api/models. Keep it small but
// exercise the paths the resolver cares about: multiple models sharing a
// task, single-model tasks, and long-duration tasks for buffer math.
const FIXTURE_MODELS: ModelInfo[] = [
  {
    uiValue: 'flux_2_pro',
    id: 'flux-2-pro',
    displayName: 'Flux 2 Pro',
    description: 'Standard image generation',
    mediaCategory: 'image',
    tier: 'standard',
    tasks: [
      { task: 'text_to_image', creditCost: 25, estimatedDuration: 30, durationDisplay: '~30 seconds' },
    ],
  },
  {
    uiValue: 'nano_banana',
    id: 'nano-banana-pro',
    displayName: 'Nano Banana Pro',
    description: 'Fast image generation + edit',
    mediaCategory: 'image',
    tier: 'premium',
    tasks: [
      { task: 'text_to_image', creditCost: 30, estimatedDuration: 20, durationDisplay: '~20 seconds' },
      { task: 'image_to_image', creditCost: 40, estimatedDuration: 25, durationDisplay: '~25 seconds' },
    ],
  },
  {
    uiValue: 'gpt_image',
    id: 'gpt-image-2',
    displayName: 'GPT Image 2',
    description: 'Best text rendering',
    mediaCategory: 'image',
    tier: 'premium',
    tasks: [
      { task: 'text_to_image', creditCost: 60, estimatedDuration: 120, durationDisplay: '~2 minutes' },
      { task: 'image_to_image', creditCost: 60, estimatedDuration: 120, durationDisplay: '~2 minutes' },
    ],
  },
  {
    uiValue: 'kling',
    id: 'kling-pro-2.1',
    displayName: 'Kling 2.1 Pro',
    description: 'Cinematic video',
    mediaCategory: 'video',
    tier: 'premium',
    tasks: [
      { task: 'text_to_video', creditCost: 250, estimatedDuration: 600, durationDisplay: '~10 minutes' },
    ],
  },
  {
    uiValue: 'wan',
    id: 'wan-2.1',
    displayName: 'WAN 2.1',
    description: 'Standard video',
    mediaCategory: 'video',
    tier: 'standard',
    tasks: [
      { task: 'text_to_video', creditCost: 100, estimatedDuration: 180, durationDisplay: '~3 minutes' },
    ],
  },
];

describe('GENERATION_TYPES', () => {
  it('exposes canonical task strings', () => {
    expect(GENERATION_TYPES.TEXT_TO_IMAGE).toBe('text_to_image');
    expect(GENERATION_TYPES.IMAGE_TO_IMAGE).toBe('image_to_image');
    expect(GENERATION_TYPES.TEXT_TO_VIDEO).toBe('text_to_video');
    expect(GENERATION_TYPES.TEXT_TO_AUDIO_SPEECH).toBe('text_to_audio_speech');
  });
});

describe('getCompletionTimeInfo', () => {
  describe('exact (model, task) match', () => {
    it('returns the authoritative duration for a specific model', () => {
      const result = getCompletionTimeInfo(
        { model: 'gpt-image-2', generationType: 'text_to_image' },
        FIXTURE_MODELS
      );
      expect(result.expectedDuration).toBe(120);
      expect(result.displayTime).toBe('~2 minutes');
      // 120 + min(30, max(15, 24)) = 144s = ~2 minutes (rounded)
      expect(result.pollingSuggestion).toBe('in about 2 minutes');
    });

    it('picks different durations for the same task on different models', () => {
      const flux = getCompletionTimeInfo(
        { model: 'flux-2-pro', generationType: 'text_to_image' },
        FIXTURE_MODELS
      );
      const gpt = getCompletionTimeInfo(
        { model: 'gpt-image-2', generationType: 'text_to_image' },
        FIXTURE_MODELS
      );
      expect(flux.expectedDuration).toBe(30);
      expect(gpt.expectedDuration).toBe(120);
    });

    it('resolves video models by id (Kling vs WAN)', () => {
      const kling = getCompletionTimeInfo(
        { model: 'kling-pro-2.1', generationType: 'text_to_video' },
        FIXTURE_MODELS
      );
      const wan = getCompletionTimeInfo(
        { model: 'wan-2.1', generationType: 'text_to_video' },
        FIXTURE_MODELS
      );
      expect(kling.expectedDuration).toBe(600);
      expect(wan.expectedDuration).toBe(180);
    });
  });

  describe('task-wide fallback (model missing or unknown)', () => {
    it('falls back to the fastest matching model when creation.model is missing', () => {
      // text_to_image is on flux-2-pro (30s), nano-banana-pro (20s), gpt-image-2 (120s).
      // Fastest is 20s on Nano Banana.
      const result = getCompletionTimeInfo(
        { generationType: 'text_to_image' },
        FIXTURE_MODELS
      );
      expect(result.expectedDuration).toBe(20);
      expect(result.displayTime).toBe('~20 seconds');
    });

    it('falls back to the fastest matching model when creation.model is unknown', () => {
      const result = getCompletionTimeInfo(
        { model: 'some-future-model', generationType: 'text_to_image' },
        FIXTURE_MODELS
      );
      expect(result.expectedDuration).toBe(20);
      expect(result.displayTime).toBe('~20 seconds');
    });
  });

  describe('generic fallback', () => {
    it('returns 60s / ~1 minute when models list is empty', () => {
      const result = getCompletionTimeInfo(
        { model: 'gpt-image-2', generationType: 'text_to_image' },
        []
      );
      expect(result.expectedDuration).toBe(60);
      expect(result.displayTime).toBe('~1 minute');
    });

    it('returns fallback when generationType is missing', () => {
      const result = getCompletionTimeInfo({}, FIXTURE_MODELS);
      expect(result.expectedDuration).toBe(60);
      expect(result.displayTime).toBe('~1 minute');
    });

    it('returns fallback when the task matches no model', () => {
      const result = getCompletionTimeInfo(
        { generationType: 'audio_transcription' },
        FIXTURE_MODELS
      );
      expect(result.expectedDuration).toBe(60);
      expect(result.displayTime).toBe('~1 minute');
    });

    it('returns fallback when creation is undefined', () => {
      const result = getCompletionTimeInfo(undefined, FIXTURE_MODELS);
      expect(result.expectedDuration).toBe(60);
      expect(result.displayTime).toBe('~1 minute');
    });
  });

  describe('polling-buffer math', () => {
    it('clamps the buffer to a 15s minimum for short durations', () => {
      // Nano Banana text_to_image: 20s. 20 * 0.2 = 4, clamped up to 15.
      // 20 + 15 = 35 seconds.
      const result = getCompletionTimeInfo(
        { model: 'nano-banana-pro', generationType: 'text_to_image' },
        FIXTURE_MODELS
      );
      expect(result.pollingSuggestion).toBe('in about 35 seconds');
    });

    it('clamps the buffer to a 30s maximum for long durations', () => {
      // Kling text_to_video: 600s. 600 * 0.2 = 120, clamped down to 30.
      // 600 + 30 = 630s = 10.5 minutes, rounded to 11.
      const result = getCompletionTimeInfo(
        { model: 'kling-pro-2.1', generationType: 'text_to_video' },
        FIXTURE_MODELS
      );
      expect(result.pollingSuggestion).toBe('in about 11 minutes');
    });

    it('uses a 20% buffer in the middle range', () => {
      // GPT Image 2: 120s. 120 * 0.2 = 24, within [15, 30].
      // 120 + 24 = 144s = 2.4 minutes, rounded to 2.
      const result = getCompletionTimeInfo(
        { model: 'gpt-image-2', generationType: 'text_to_image' },
        FIXTURE_MODELS
      );
      expect(result.pollingSuggestion).toBe('in about 2 minutes');
    });

    it('formats as seconds when poll time < 60', () => {
      const result = getCompletionTimeInfo(
        { model: 'flux-2-pro', generationType: 'text_to_image' },
        FIXTURE_MODELS
      );
      expect(result.pollingSuggestion).toMatch(/in about \d+ seconds/);
    });

    it('formats as minutes when poll time >= 60', () => {
      const result = getCompletionTimeInfo(
        { model: 'wan-2.1', generationType: 'text_to_video' },
        FIXTURE_MODELS
      );
      expect(result.pollingSuggestion).toMatch(/in about \d+ minutes/);
    });
  });
});
